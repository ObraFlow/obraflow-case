# ObraFlow — Dokimos (pedidos de compra com aprovação por alçada)

> Em construção. Seções de screenshots, modelagem da alçada e API serão preenchidas ao longo do desafio.

## Como rodar

Pré-requisitos: Node 24+, Docker.

```bash
cp .env.example .env
npm install
npm run db:up        # sobe o Postgres (docker compose)
npm run db:migrate   # aplica as migrations e gera o client (Prisma 7 não gera sozinho no migrate)
npm run db:seed      # dados de demonstração
npm run dev          # http://localhost:3000
```

Outros scripts: `npm run check` (lint + prettier + tsc + testes), `npm run format`, `npm test`, `npm run db:studio`, `npm run db:down`.

A cada commit, um hook `pre-commit` (husky) roda `lint-staged`: ESLint com `--fix` e Prettier só nos arquivos em stage. Se o lint falhar, o commit não acontece.

## Tecnologias e motivos

| Dependência                                                                                                                               | Por quê                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 (App Router, RSC)                                                                                                              | Front e back no mesmo projeto. Server Components para listagens, server actions para mutações, `loading.tsx`/`error.tsx` por rota.                                                                                                                          |
| Tailwind v4 + shadcn/ui                                                                                                                   | Componentes acessíveis copiados para o repositório (`src/components/ui`), sem lib de UI como dependência fechada. O CLI `shadcn` fica em devDependencies.                                                                                                   |
| Prisma 7 + PostgreSQL                                                                                                                     | Schema declarativo, migrations versionadas e transações. Postgres por ser o banco que uma empresa usaria em produção.                                                                                                                                       |
| `@prisma/adapter-pg`                                                                                                                      | O Prisma 7 exige um driver adapter; este é o adapter oficial para Postgres (usa `pg` por baixo).                                                                                                                                                            |
| Zod                                                                                                                                       | Um único schema de validação compartilhado entre formulário (client) e server action/API (server).                                                                                                                                                          |
| react-hook-form + `@hookform/resolvers`                                                                                                   | `useFieldArray` resolve a lista de N itens do pedido; o resolver liga o Zod ao formulário.                                                                                                                                                                  |
| Vitest                                                                                                                                    | Testes unitários apenas em `src/domain` (regras de alçada são funções puras).                                                                                                                                                                               |
| `next-safe-action`                                                                                                                        | Toda server action passa por ele: valida com o mesmo Zod do formulário, um middleware injeta o usuário "Agindo como", e `handleServerError` decide o que chega ao client (mensagem de domínio em pt-BR ou erro genérico).                                   |
| `@next-safe-action/adapter-react-hook-form`                                                                                               | `useHookFormAction` liga action + `useForm` e devolve os erros de validação do servidor para os campos certos. Funciona com `zodResolver` e `useFieldArray`.                                                                                                |
| `ky`                                                                                                                                      | Cliente HTTP fino sobre `fetch` (≈4 kB) usado só em client components para leituras interativas em `/api` (`prefix`, `retry`, timeout, `.json<T>()`). Axios não se integra ao `fetch` do Next e é muito maior; o server nunca chama a própria API por HTTP. |
| `sonner`, `lucide-react`, `next-themes`, `@base-ui/react`, `class-variance-authority`, `cn`, `tw-animate-css`                             | Trazidos pelo shadcn/ui (toasts, ícones, tema, primitivos acessíveis, variantes de classe, animações).                                                                                                                                                      |
| Base do scaffold: `react`, `react-dom`, `typescript`, `tailwindcss`, `@tailwindcss/turbopack`, `eslint`, `eslint-config-next`, `@types/*` | Vêm do `create-next-app`. TypeScript estrito e as regras do Next para React Hooks e Core Web Vitals.                                                                                                                                                        |
| Prettier + `prettier-plugin-tailwindcss`                                                                                                  | Formatação única para todo o time; o plugin ordena as classes Tailwind, o que mantém o JSX legível.                                                                                                                                                         |
| `eslint-config-prettier`                                                                                                                  | Desliga as regras de estilo do ESLint que conflitariam com o Prettier; o ESLint fica só com regras de correção.                                                                                                                                             |
| `tsx`                                                                                                                                     | Executa `prisma/seed.ts` em TypeScript sem passo de build (`prisma db seed`). Só devDependency; o Node puro não resolve os imports sem extensão do client gerado pelo Prisma.                                                                               |
| husky + lint-staged                                                                                                                       | Hook `pre-commit` que lint-a e formata apenas os arquivos em stage. Garante que nada entra no histórico fora do padrão.                                                                                                                                     |

Sem autenticação por escopo do desafio: o usuário atual é simulado por um seletor "Agindo como" no header, persistido em cookie.

## Decisões técnicas

1. **Sem `dotenv`.** O `prisma.config.ts` carrega o `.env` com `process.loadEnvFile()`, nativo do Node 20.12+. O Next já lê o `.env` sozinho. Uma dependência a menos.
2. **Client do Prisma gerado em `src/generated/prisma`** (ignorado no git) e regenerado por `prisma migrate dev`. Em clone novo, basta seguir "Como rodar".
3. **Scripts `db:*` no `package.json`** para o avaliador não precisar conhecer o Prisma CLI nem o docker compose.
4. **IA usada de forma dirigida, e versionada.** O `CLAUDE.md` é o documento de decisões que o assistente segue; a pasta `.claude/` guarda as skills (`ui-obraflow`, `nova-tela`, `next16`, `fim-de-fase`) e os agentes de revisão (`critico-visual`, `revisor-arquitetura`) que fiscalizam essas decisões a cada fase. Commits são manuais e revisados por mim.
5. **Arquitetura limpa mínima: as dependências só apontam para dentro.** `src/domain` é puro (zero imports) e concentra as regras de alçada, testadas sem banco. `src/server/services` são os casos de uso e a única camada que toca o Prisma. Por fora, três transportes finos: Server Components leem via service; server actions mutam; route handlers expõem a mesma lógica como REST.
6. **Três canais de comunicação, uma regra.** Carregar página → RSC chama o service (sem HTTP). Mutar → server action (`next-safe-action`) + `revalidatePath`. Leitura interativa no client (preview da faixa ao digitar o total, filtros) → `ky` chamando `GET /api/...`, o mesmo endpoint documentado abaixo.
7. **Sem camada de repositório sobre o Prisma.** Inverti a dependência onde isso compra algo: o domínio é testável sem banco. Uma interface `PedidoRepository` com adapter Prisma adicionaria arquivos sem um segundo adaptador previsto. Se surgir, o corte já está isolado em `services`.
8. **Erros de domínio com uma hierarquia e três traduções.** `ErroDominio` e subclasses (`SemFaixaAplicavel`, `FaixaSobreposta`, `DecisaoForaDeOrdem`, `ConflitoDeDecisao`, `NaoEncontrado`) nascem em `src/domain/erros.ts`. A action traduz para mensagem em pt-BR; a API traduz para status HTTP (422, 409, 404); a UI nunca vê stack trace.
9. **Services devolvem DTOs, não objetos do Prisma.** `Decimal` e `Date` não atravessam a fronteira para client components; `src/server/dto.ts` converte para `string`/`number`. UI e API REST recebem o mesmo formato.
10. **Cache Components do Next 16 a favor.** Cadastros quase estáticos (obras, usuários, fornecedores) usam `"use cache"` com `cacheTag`; pedidos e regras são sempre dinâmicos e chegam por streaming dentro de `<Suspense>`.
11. **Cadeia de aprovação como snapshot.** Na criação do pedido, os `NivelRegra` da faixa aplicável são copiados para `AprovacaoPedido` (uma linha por aprovador, status `PENDENTE`). Editar ou apagar a regra depois não altera pedidos existentes: é a trilha de auditoria. `Pedido.regraId` é só informativo e vira `null` se a faixa for apagada.
12. **Status `CANCELADA` nos níveis após uma rejeição.** Quando o aprovador do step atual rejeita, os níveis seguintes recebem `CANCELADA`. A timeline mostra "nunca foi chamado a decidir" sem depender do status do pedido.
13. **IDs `Int autoincrement` e seed com `TRUNCATE ... RESTART IDENTITY`.** O identificador do pedido na tela é o próprio `id` (`#42`). O seed apaga tudo e reinicia as sequences, então a demo começa sempre em `#1` e nunca há conflito de sequence por id fixado à mão.
14. **`prisma migrate dev` não gera o client no Prisma 7.** O script `db:migrate` encadeia `prisma generate`. O seed roda com `tsx` porque o client gerado usa imports sem extensão, que o Node puro não resolve.
15. **Domínio puro, testado sem banco.** `src/domain` não importa Next, Prisma nem nada fora da própria pasta. As regras de alçada (`resolverRegra`, `validarFaixas`, `montarCadeia`, `aplicarDecisao`) e o cálculo de totais são funções que recebem dados simples e devolvem dados simples ou lançam `ErroDominio`. Os 78 testes Vitest rodam em um segundo e cobrem limite inclusivo, teto nulo, buraco entre faixas, sobreposição, aprovador repetido, decisão fora de ordem, usuário errado, rejeição no meio da cadeia, conflito de decisão simultânea e estouro do `Int` de 32 bits.
16. **Quantidade decimal calculada em inteiros.** A quantidade entra como texto ("2,5") e vira milésimos inteiros (2500) antes de multiplicar pelo preço em centavos. Evita o erro clássico de ponto flutuante: `1.005 * 100` dá 100,49999 em JavaScript e arredondaria errado. O arredondamento é por item (meio centavo para cima) e o total do pedido é a soma dos itens já arredondados, sem novo arredondamento.
17. **`aplicarDecisao` devolve o próximo estado em vez de alterar o atual.** O service recarrega o pedido na transação, chama a função, e persiste o resultado. Isso torna a regra testável sem banco e deixa explícito no teste o que muda em cada decisão (status do step, dos seguintes e do pedido, `stepAtual`).
18. **O domínio conhece o limite do banco.** `totalCents` é `Int` de 32 bits no Postgres (R$ 21.474.836,47). Em vez de deixar um pedido gigante virar erro 500 na gravação, `calcularTotais` lança `ValorExcedeLimite` com mensagem clara, e a quantidade é limitada aos 9 dígitos inteiros do `Decimal(12,3)`. O domínio não importa o Prisma; o limite é uma constante documentada (`MAX_CENTS`).
19. **Decisão em transação com lock otimista.** `registrarDecisao` roda em `prisma.$transaction`: recarrega o pedido, chama `aplicarDecisao` (domínio) e grava o step com `updateMany ... where status = PENDENTE`. Se `count` vier 0, outra decisão chegou antes e o service lança `ConflitoDeDecisao` (409 na API, "Este passo já foi decidido" na UI). Não trava linha nem usa `SELECT ... FOR UPDATE`: o próprio `where` garante que só uma decisão vale.
20. **Faixa salva relendo as faixas da obra na mesma transação, em isolamento `Serializable`.** `salvarFaixa` carrega as outras faixas da obra, coloca a nova/editada no lugar e chama `validarFaixas` antes de gravar. Duas faixas salvas ao mesmo tempo poderiam ambas passar na validação e se sobrepor; com `Serializable` o Postgres aborta a segunda e o usuário tenta de novo. Na edição, os níveis são apagados e recriados: a lista é pequena e assim a reordenação não briga com o `@@unique([regraId, ordem])`.
21. **Tipos de DTO em `src/lib/dto.ts`, mappers em `src/server/dto.ts`.** Client components precisam dos tipos (`PedidoResumo`, `FaixaAplicavelDto`) mas não podem importar nada de `src/server`. Separar tipos (lib) de mappers (server, que conhecem o Prisma) mantém a regra "UI nunca importa Prisma" verificável por grep.
22. **A API recebe `usuarioId` no corpo; a UI usa o cookie.** Route handlers são chamados por `curl`/sistemas externos, que não têm o cookie "Agindo como". Por isso `POST /api/pedidos` recebe `criadoPorId` e `POST /api/pedidos/{id}/decisoes` recebe `usuarioId`. As server actions, usadas pela UI, leem o cookie no middleware do `next-safe-action` e nunca aceitam o usuário vindo do browser. Em produção, ambos viriam da sessão autenticada.
23. **Erro da API em um formato só.** Toda resposta de erro é `{ "erro": { "codigo", "mensagem", "campos"? } }`. `codigo` é o da classe de domínio (ex.: `SEM_FAIXA_APLICAVEL`) ou `DADOS_INVALIDOS`/`ERRO_INTERNO`; `campos` só aparece em erro de validação, no formato de `z.treeifyError`. O cliente `ky` lê `erro.mensagem` e mostra ao usuário.
24. **Identidade visual "Canteiro": a cor sinaliza, não decora.** Escolhida entre quatro direções prototipadas com os dados do seed. Cinzas de concreto, texto quase preto, fonte Archivo (uma família, via `next/font/google`, sem dependência), raio 2px, bordas no lugar de sombra. Um só amarelo de sinalização (`#F2B300`), usado exclusivamente onde o usuário atual precisa agir: a linha do pedido que aguarda sua decisão, o bloco atual da cadeia e a faixa com os botões. Status sempre com texto, nunca só cor. Movimento só em resposta a uma ação (a cadeia preenche ao aprovar, a faixa se recolhe, as linhas suas pulsam ao trocar de usuário), nunca ao carregar, e desligado com `prefers-reduced-motion`. Os tokens vivem em `src/app/globals.css`; sem modo escuro por escopo.

## API REST

Mesmos services das telas, expostos como JSON. Dinheiro sempre em centavos inteiros; quantidade como texto decimal (`"2,5"` ou `"2.5"`); datas `AAAA-MM-DD`.

| Método e rota                     | O que faz                                                                                            | Respostas                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET /api/obras`                  | Lista obras.                                                                                         | 200                                         |
| `GET /api/usuarios`               | Lista usuários (possíveis aprovadores e criadores).                                                  | 200                                         |
| `GET /api/fornecedores`           | Lista fornecedores.                                                                                  | 200                                         |
| `GET /api/regras?obraId=1`        | Faixas da obra com seus níveis, ordenadas por valor.                                                 | 200, 400                                    |
| `POST /api/regras`                | Cria faixa. Corpo: `{ obraId, minCents, maxCents (null = sem teto), aprovadores: [{ usuarioId }] }`. | 201, 400, 404, 409 sobreposição, 422        |
| `PUT /api/regras/{id}`            | Edita a faixa (mesmo corpo).                                                                         | 200, 400, 404, 409, 422                     |
| `DELETE /api/regras/{id}`         | Remove a faixa. Pedidos antigos mantêm o snapshot.                                                   | 204, 404                                    |
| `GET /api/regras/aplicavel`       | `?obraId=1&valorCents=1250000` → qual faixa e cadeia este valor cairia; `faixa: null` se nenhuma.    | 200, 400, 404                               |
| `GET /api/pedidos`                | Lista. Filtros opcionais: `status`, `obraId`, `pendentesPara` (id do aprovador da vez).              | 200, 400                                    |
| `POST /api/pedidos`               | Cria pedido. Corpo: `{ obraId, fornecedorId, dataPedido, observacoes?, itens: [...], criadoPorId }`. | 201, 400, 404, 422 sem faixa / valor        |
| `GET /api/pedidos/{id}`           | Detalhe com itens e cadeia de aprovação.                                                             | 200, 404                                    |
| `POST /api/pedidos/{id}/decisoes` | `{ usuarioId, tipo: "APROVAR" }` ou `{ usuarioId, tipo: "REJEITAR", motivo }`.                       | 200, 400 sem motivo, 404, 409 fora de ordem |

Item de pedido: `{ descricao, quantidade: "150", unidade: "sc", precoUnitarioCents: 3490 }`. Os totais são calculados no servidor e devolvidos em `itens[].totalCents` e `totalCents`.

Exemplos (PowerShell ou bash, servidor em `localhost:3000`):

```bash
curl -s "http://localhost:3000/api/regras/aplicavel?obraId=1&valorCents=1250000"
```

```bash
curl -s -X POST http://localhost:3000/api/pedidos -H "Content-Type: application/json" -d "{\"obraId\":1,\"fornecedorId\":1,\"dataPedido\":\"2026-10-28\",\"criadoPorId\":5,\"itens\":[{\"descricao\":\"Cimento CP-II\",\"quantidade\":\"150\",\"unidade\":\"sc\",\"precoUnitarioCents\":3490}]}"
```

```bash
curl -s -X POST http://localhost:3000/api/pedidos/1/decisoes -H "Content-Type: application/json" -d "{\"usuarioId\":1,\"tipo\":\"APROVAR\"}"
```

Erro, sempre no mesmo formato:

```json
{
  "erro": {
    "codigo": "SEM_FAIXA_APLICAVEL",
    "mensagem": "A obra \"Residencial Jardim das Acácias\" não tem faixa de alçada que cubra o valor R$ 7.000,00. Ajuste as regras da obra ou o valor do pedido."
  }
}
```
