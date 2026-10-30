# ObraFlow — Desafio Full-stack (Dokimos)

Sistema de pedidos de compra com aprovação por alçada. Enunciado completo em `DESAFIO.md` — leia antes de qualquer tarefa.
Prazo: 01/11/2026. Entrega via PR. Há entrevista de 30 min onde cada decisão será explicada — o código precisa ser simples e defensável.

## Stack (não mudar sem discutir)

- Next.js (App Router, TypeScript, `src/`), React Server Components
- Tailwind v4 + shadcn/ui
- Prisma + PostgreSQL (docker compose local; Neon só no deploy — `DATABASE_URL` é a única diferença)
- Zod (schemas compartilhados entre client e server)
- react-hook-form + `useFieldArray` para os itens do pedido; ligado às actions por `@next-safe-action/adapter-react-hook-form` (`useHookFormAction`)
- `next-safe-action` para toda server action (schema Zod, middleware do usuário atual, `handleServerError`)
- `ky` **só** em `src/lib/api/` e só em client components, para leituras interativas via `/api`. O server nunca chama a própria API por HTTP. Sem axios.
- Vitest apenas em `src/domain/`
- Sem autenticação. Usuário atual é simulado por um seletor "Agindo como" no header, persistido em cookie.

## Arquitetura

Arquitetura limpa mínima: **as dependências só apontam para dentro** (transportes → services → domain). Explicação completa, com fluxos e SOLID, em `docs/ARQUITETURA.md` (local).

```
src/
  domain/                 NÚCLEO. Zero imports de next/prisma/fs. Testado no Vitest.
    alcada/               tipos, resolverRegra, montarCadeia, aplicarDecisao, validarFaixas (+ *.test.ts)
    pedido/               calcularTotais (centavos)
    acompanhamento/       tipos, chegouNaMesa, filaPorAprovador, tempoDeDecisao (+ *.test.ts)
    erros.ts              ErroDominio + subclasses com `codigo` (SemFaixaAplicavel, FaixaSobreposta, FaixaInvalida,
                          DecisaoForaDeOrdem, ConflitoDeDecisao, MotivoObrigatorio, QuantidadeInvalida, PrecoInvalido, ValorExcedeLimite, NaoEncontrado)
  lib/                    COMPARTILHADO client/server. Sem Prisma.
    schemas/              Zod por caso de uso (CriarPedidoInput, DecisaoInput, SalvarFaixaInput...)
    dto.ts                TIPOS de saída (PedidoResumo, PedidoDetalhe, RegraDto, FaixaAplicavelDto). Client importa daqui.
    money.ts              centavos ↔ BRL, formatarFaixa
    api/                  cliente ky (client.ts) + funções tipadas para client components lerem /api
  server/                 SÓ SERVER.
    prisma.ts             singleton PrismaClient (adapter pg). Só services e o seed importam daqui.
    usuario-atual.ts      lê/grava o cookie "agindo-como" (cookies() é async)
    dto.ts                mappers Prisma → DTO + `include`s canônicos. Re-exporta os tipos de lib/dto.ts.
    services/             CASOS DE USO. Única camada que escreve. $transaction aqui. Sempre devolvem DTO.
    actions/              next-safe-action. client.ts = actionClient (handleServerError) + actionComUsuario
  app/
    api/**/route.ts       REST fino: parse Zod → service → Response.json. _http.ts mapeia ErroDominio → status.
    (telas)/              layout (header com <Suspense> no "Agindo como"), aprovacoes, pedidos/novo, regras, acompanhamento.
                          loading.tsx + error.tsx em cada rota.
  components/             ui/ (shadcn) + layout/ alcada/ (CadeiaAlcada, compartilhado) aprovacoes/ pedidos/ regras/ acompanhamento/
prisma/schema.prisma, prisma/seed.ts
```

**Três canais, uma regra para escolher:**

- Página carrega dados → **RSC chama o service direto** (sem HTTP).
- Usuário muda algo → **server action via `next-safe-action`** + `revalidatePath`.
- Client component lê algo em reação a interação (preview da faixa, filtro) → **`ky` → `GET /api/...`**. O mesmo endpoint é a API documentada.

**Erros:** `domain` lança `ErroDominio`; services deixam propagar; `handleServerError` traduz para mensagem pt-BR na action; `_http.ts` traduz para status na API (422 sem faixa, 409 conflito/ordem/sobreposição, 404). Nada de `try/catch` que engole erro de domínio. Duas exceções intencionais fora da hierarquia, por serem erros de transporte e não de negócio: `UsuarioNaoSelecionado` (cookie ausente, em `actions/client.ts`) e `CorpoInvalido` (JSON malformado, em `api/_http.ts`); ambas já são traduzidas onde nascem.

**Fronteira RSC → client:** nunca passar `Decimal` nem `Date`. Services devolvem DTO (`quantidade: string`, datas ISO, `*Cents: number`).

**Next 16 com `cacheComponents`:** toda leitura de cookie/banco fica dentro de um `<Suspense>` (`loading.tsx` cobre a página; o header precisa do seu próprio). Cadastros (obras, usuários, fornecedores) com `"use cache"` + `cacheLife` + `cacheTag("cadastros")`; pedidos e regras sem cache. Nunca `cookies()` dentro de `"use cache"`. **Leitura sem cache em RSC (pedidos, regras) vem depois de `await connection()`** (`next/server`): com `partialPrefetching` o cookie entra no App Shell e a consulta rodaria no prerender, que rejeita o `crypto` que o `pg` usa ao abrir conexão (`blocking-prerender-crypto`). Ver `ContadorPendencias`.

Regra: UI nunca importa Prisma. Domain nunca importa nada. Services são o único ponto de escrita e nunca vazam tipos do Prisma. Sem camada de repositório sobre o Prisma (decisão consciente, ver ARQUITETURA.md §4).

## Glossário

- **Obra**: projeto/canteiro. Regras são por obra.
- **Regra de alçada**: faixa de valor (`minCents` inclusivo, `maxCents` null = sem teto) de uma obra, com níveis ordenados.
- **Nível**: um aprovador em uma posição da faixa.
- **Cadeia**: snapshot dos níveis copiado para dentro do pedido na criação (`AprovacaoPedido`). Alterar a regra depois não altera pedidos existentes.
- **Step atual**: índice da próxima aprovação pendente.

## Decisões de produto (já tomadas — documentar no README, não reabrir)

1. **Cadeia acumulada** (revisto em 28/10/2026): quem aprova um pedido são os aprovadores de todas as faixas da obra com mínimo abaixo da faixa aplicável, em ordem crescente de valor, e por fim os da própria faixa (enunciado: "João precisa aprovar primeiro. Só depois ... o Amanda"). Uma pessoa não pode estar em duas faixas da mesma obra (`validarFaixas`). `montarCadeia(faixas, faixaAplicavel)`; `niveisAcumulados` e `lib/cadeia.ts` dão a cadeia com nomes para tela e preview.
2. Valor sem faixa aplicável: bloquear a criação no front e no back com mensagem clara indicando obra e valor.
3. Faixas de uma mesma obra não podem se sobrepor — validado no service.
4. Rejeição exige motivo (Zod + service), encerra o fluxo, pedido vira REJEITADO.
5. Decisão só é aceita se `usuarioId` for o aprovador do step atual e o step estiver PENDENTE. Caso contrário, erro 409 / mensagem na UI.
6. Cadeia concluída: botões desabilitados com explicação textual.
7. Dinheiro em centavos (Int). Quantidade como Decimal. Total do item e do pedido calculados no server e persistidos.

## Consistência

- Toda decisão roda em `prisma.$transaction`: recarrega o pedido, confere step/usuário, grava com `updateMany where status = PENDENTE` (lock otimista), avança `stepAtual` ou fecha o pedido.
- `@@unique([pedidoId, ordem])` e `@@unique([regraId, ordem])` garantem ordem única.

## Convenções

- Português nos nomes de domínio (Pedido, Obra, RegraAlcada); inglês só em código utilitário.
- Commits pequenos e em português no imperativo: `feat: tela de regras`, `test: resolverRegra sem faixa`.
- Componentes shadcn em `src/components/ui`; componentes de tela em `src/components/<tela>/`.
- Toda lista tem loading state (Skeleton) e empty state. Toda página tem `error.tsx` com "Tentar novamente".
- Mensagens de erro para o usuário em português, específicas (campo + motivo).

## Como trabalhar comigo (João)

- Antes de implementar algo não trivial, proponha o plano em poucas linhas e espere OK.
- Ao terminar uma feature, explique em 5–8 linhas como eu apresentaria isso na entrevista e aponte o que eu poderia não saber defender. Eu reescrevo e colo no README.
- Não adicionar dependências sem justificar.
- Não gerar código "mágico": prefira explícito e legível a abstrações.
- **Nunca rodar `git commit`** (nem amend/merge/rebase). Eu commito tudo manualmente. Ao terminar, deixe os arquivos na árvore e sugira a mensagem de commit em um bloco `bash`.
- **Nunca adicionar `Co-Authored-By`** nem qualquer atribuição a IA em commits ou PRs.
- Terminal do João é PowerShell 5.1: comandos sugeridos vão **um por bloco**, sem `&&`.
- Antes de usar API do Next, leia o doc local indicado pela skill `next16`. Antes de criar tela, leia a skill `ui-obraflow` (ou use `/nova-tela`).
- Ao terminar uma tela, rode o agente `critico-visual` na rota. Ao fechar uma fase, use `/fim-de-fase`.
- Identidade visual definida em `docs/design.md` ("Canteiro", 28/10/2026) e implementada como tokens em `src/app/globals.css` (Archivo via `next/font`, raio 2px, classes `bg-sinalizacao`, `text-aprovado`, `bg-rejeitado-fundo`...). Amarelo **só** onde o usuário atual precisa agir. Animação só em resposta a ação, com os keyframes já definidos no `globals.css`. Sem modo escuro.
- Decisões técnicas: o `README.md > ## Decisões técnicas` tem **no máximo 10 itens curtos** (1–2 linhas, cada um com link para o código). A versão longa e as decisões novas vão em `docs/decisoes.md` (local, fora do git). Não voltar a inchar o README.

## Checklist de validações exigidas (DESAFIO.md)

- [x] quantidade/preço inválido → erro no item, não envia (`pedidoFormSchema`, botão desabilitado)
- [x] pedido sem itens → o último item não pode ser removido, com explicação; `itens.min(1)` no schema
- [x] obra/fornecedor/data/descrição vazios → erro no campo
- [x] nenhuma obra cadastrada → empty state (regras e pedidos/novo)
- [x] API fora / 500 → estado de erro com retry (`error.tsx` + `ErroDeRota`; header com `LimiteDeErro`)
- [x] rejeitar sem motivo → validação antes do submit (`DialogRejeitar`: botão só habilita com motivo, frase ao lado)
- [x] cadeia concluída → botão desabilitado + explicação (`FaixaDecisao`: "Cadeia concluída em dd/mm/aaaa", "Rejeitado por X")
- [x] loading em toda lista (`aprovacoes/loading.tsx`, `aprovacoes/[id]/loading.tsx`, `regras/loading.tsx`)

## Status

Atualizado ao fim de cada fase (`/fim-de-fase`). Fases detalhadas em `docs/GUIA.md`.

- [x] Fase 0 — Setup: scaffold Next 16, Prisma 7 + Postgres (docker), Zod, shadcn, Vitest, Prettier/ESLint/husky, skills e agentes, `docs/ARQUITETURA.md`.
- [x] Fase 1 — Modelagem do banco: `prisma/schema.prisma` (8 tabelas, 2 enums), migration `inicial`, `src/server/prisma.ts` (singleton + adapter pg), `src/lib/money.ts`, `prisma/seed.ts` (2 obras, 5 usuários, 3 faixas, 5 pedidos em todos os estados).
- [x] Fase 2 — Domínio puro + testes: `src/domain/erros.ts`, `alcada/{tipos,resolverRegra,validarFaixas,montarCadeia,aplicarDecisao}.ts`, `pedido/calcularTotais.ts`, 78 testes Vitest.
- [x] Fase 3 — Services, actions, API e cliente ky: `lib/schemas/*`, `lib/dto.ts`, `server/{dto,usuario-atual}.ts`, `server/services/{cadastros,regras,pedidos,decisoes}.ts`, `server/actions/*` (next-safe-action), `app/api/**` (+ `_http.ts`), `lib/api/*` (ky). API testada via curl: 201/200/400/404/409/422.
- [x] Fase 4 — Layout e "Agindo como": `app/(telas)/layout.tsx`, `components/layout/{header,navegacao,agindo-como,seletor-agindo-como,contador-pendencias,limite-de-erro,erro-de-rota,skeleton-tabela}.tsx`, rotas `aprovacoes`, `pedidos/novo`, `regras` com `loading.tsx` + `error.tsx` (`retry`), `not-found.tsx`, redirect `/` → `/aprovacoes` em `next.config.ts`. Identidade "Canteiro" aplicada (`docs/design.md`, `globals.css`, Archivo).
- [x] Fase 5 — Tela de regras: `app/(telas)/regras/page.tsx` (obra na URL, `connection()` antes de `listarRegras`), `components/regras/{seletor-obra,tabela-faixas,acoes-faixa,botao-nova-faixa,dialog-faixa,dialog-remover-faixa,simulador-alcada}.tsx`, `components/alcada/cadeia-alcada.tsx` (5 estados), `domain/alcada/encontrarLacunas.ts` (+8 testes), `lib/schemas/regra.ts` (`faixaFormSchema` + `paraSalvarFaixaInput`). Form: `useForm` + `useAction` com conversão explícita texto → centavos. Decisão 1 revista: cadeia acumulada (`niveisAcumulados`, `lib/cadeia.ts`, herdados em cinza na tabela).
- [x] Fase 6 — Tela de novo pedido: `app/(telas)/pedidos/novo/page.tsx`, `components/pedidos/{formulario-pedido,itens-pedido,preview-alcada}.tsx` + `use-preview-alcada.ts`, `lib/schemas/pedido.ts` (`pedidoFormSchema` + `paraCriarPedidoInput`), `lib/totais.ts` (totais de exibição via domínio). Preview da cadeia acumulada por ky; botão desabilitado com a frase do que falta; redirect para `/aprovacoes` com toast.
- [x] Fase 7 — Tela de aprovações: `app/(telas)/aprovacoes/{page,loading}.tsx` (abas por URL `?filtro=minhas`, uma consulta, recorte em memória) e `aprovacoes/[id]/{page,loading,error,not-found}.tsx` (`params` assíncrono, `NaoEncontrado` → `notFound()`); `components/aprovacoes/{abas-filtro,tabela-pedidos,linha-pedido,badge-situacao,botoes-decisao,dialog-rejeitar,faixa-decisao,cabecalho-pedido,tabela-itens,timeline-alcada}.tsx`; `components/alcada/{estado-nivel,use-transicao-nivel,bloco-nivel,marcador-nivel}` (animações só na mudança de estado); `lib/{datas,cadeia}.ts` (`niveisDoPedido`); `PedidoResumo` ganhou `totalItens` e `aprovacoes`; `motivoRejeicaoSchema` compartilhado; `Navegacao` dentro de `<Suspense>` (usePathname em rota dinâmica). Redirect do novo pedido vai para o detalhe. Revisão de 28/10 (pedido do João): filtros e paginação na URL (`paginarPedidos`, `components/aprovacoes/{filtros-pedidos,paginacao,url-da-lista}`), botão "Decidir" na linha abrindo `dialog-decisao.tsx` (itens por ky), sino de pendências no header (`components/layout/sino-pendencias.tsx`, polling de 30 s + toast + Notification API; shadcn `popover` adicionado).
- [x] Fase 8 — Estados, responsividade e revisão (29/10): passada de UI/UX com três agentes (inventário, trace de fluxos, `critico-visual`) e correções: `tabela-itens` só Descrição + Total abaixo de `md`; `tabela-pedidos` esconde Data/Itens até `lg` e Fornecedor até `xl`; header em duas linhas até `lg`; `itens-pedido` em duas colunas no celular (`minmax(0,1fr)`) com rodapé `sticky`; `dialog-faixa` com `mode: "all"` + botão desabilitado + frase; `money.ts` lê "1.500" como milhar e os campos reescrevem ao sair (`textoDeCentavos`); `lib/quantidade.ts`; `dialog-decisao` só aprova com itens carregados e tem retry; `layout/marcador-pendente.tsx` (`useLinkStatus` + `has-[[data-pendente]]`) nas abas e paginação, `useTransition` + `replace` nos filtros e no seletor de obra; `regras/linha-faixa.tsx` (destaque da faixa salva) e `linha-entra-a/b` no `globals.css` (item novo); `faixa-decisao` dona do `useRegistrarDecisao` (`aria-busy` enquanto envia); herdado com borda tracejada; dialog/popover sem sombra, toast `theme="light"`; `scope="col"`, `aria-label` com contexto, `role="status"` nos skeletons. `docs/design.md` e README (decisões 35–37) atualizados.
- [x] Extra (30/10) — Tela `/acompanhamento`: `domain/acompanhamento/{tipos,chegouNaMesa,filaPorAprovador,tempoDeDecisao}.ts` (+15 testes), `server/services/acompanhamento.ts` (groupBy por obra/status + cadeia inteira para fila e tempos), `app/api/acompanhamento/route.ts`, `app/(telas)/acompanhamento/{page,loading,error}.tsx`, `components/acompanhamento/{barra,resumo-por-obra,fila-aprovadores,tempos-decisao}.tsx` (barras em CSS, amarelo só na fila do usuário atual). `lib/datas.ts` ganhou `descreverIdade`/`formatarDuracao`; `lib/cadeia.ts` ganhou `aguardandoDesde` (idade "há N dias" na lista). `RegraDto.pedidosPendentes` (`_count` filtrado em `includeRegra`) alimenta o aviso nos dialogs de editar/remover faixa. Seed com `criadoEm` fixo e coerente com as decisões. README decisões 38–39.
- [x] Acabamento (30/10) — Archivo variável com eixo `wdth` (`layout.tsx`): marca a 125%, h1 a 112% (`font-stretch-*`). Marca própria (`components/layout/marca.tsx`: símbolo SVG + wordmark) no header, `app/icon.svg`, `app/apple-icon.tsx`, `app/opengraph-image.tsx` (ImageResponse, Archivo baixada do Google em TTF, fallback sem rede) e `metadata.openGraph`. `components/layout/cabecalho-pagina.tsx` com o número da tela à direita em `/aprovacoes` (aguardam você), `/regras` (faixas e lacunas) e `/acompanhamento` (R$ parado). 404 com Header, hover só em linha neutra, `::selection`. `docs/design.md` ganhou "Marca".
- [ ] Fase 9 — README, screenshots e deploy. **Em andamento.** Deploy feito em 30/10: https://obraflow-theta.vercel.app (Vercel, projeto `obraflow`, ligado à `main` do fork; Postgres na Neon `sa-east-1`, funções em `gru1`, Node 24, build `prisma generate && next build`, proteção só em previews). Feitos em 31/10: `.github/workflows/ci.yml` (npm ci, prisma generate, npm run check; badge no README), seção "Como a alçada é modelada, calculada e persistida" com ER e sequência em Mermaid, seção "Telas" com `.github/screenshots/*.png` (`docs/` é ignorada pelo git) (Playwright via npx, cookie `agindo-como=1`, produção), seção Deploy. Figma "ObraFlow — Dokimos" (https://www.figma.com/design/P8bpSTcaDVS25sia62cPqN) gerado pela sessão `figma-telas` via conector MCP (`html_to_figma` do DOM real + tokens por `use_figma`; detalhes em `docs/figma.md`, local) e linkado na seção "Design" do README (decisão 42). Faltam: "o que mudaria em produção", teste em clone limpo, refazer `aprovacoes-1280.png` da produção após o push.
- [ ] Fase 10 — PR e ensaio de entrevista.
