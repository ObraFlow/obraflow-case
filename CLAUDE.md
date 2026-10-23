# ObraFlow — Desafio Full-stack (Dokimos)

Sistema de pedidos de compra com aprovação por alçada. Enunciado completo em `DESAFIO.md` — leia antes de qualquer tarefa.
Prazo: 01/11/2026. Entrega via PR. Há entrevista de 30 min onde cada decisão será explicada — o código precisa ser simples e defensável.

## Stack (não mudar sem discutir)

- Next.js (App Router, TypeScript, `src/`), React Server Components
- Tailwind v4 + shadcn/ui
- Prisma + PostgreSQL (docker compose local; Neon só no deploy — `DATABASE_URL` é a única diferença)
- Zod (schemas compartilhados entre client e server)
- react-hook-form + `useFieldArray` para os itens do pedido
- Vitest apenas em `src/domain/`
- Sem autenticação. Usuário atual é simulado por um seletor "Agindo como" no header, persistido em cookie.

## Arquitetura

```
src/
  domain/alcada/      funções puras, sem Prisma: resolverRegra, montarCadeia, aplicarDecisao (+ testes)
  server/services/    Prisma + transações; chamam o domain. Única camada que toca o banco.
  server/actions/     server actions usadas pela UI; chamam services. Sempre validam com Zod.
  app/api/**/route.ts Route Handlers REST finos sobre os mesmos services (documentados no README).
  app/(telas)/        páginas: pedidos/novo, aprovacoes, regras. loading.tsx + error.tsx em cada uma.
  lib/schemas/        schemas Zod compartilhados
  lib/money.ts        helpers de centavos ↔ BRL
prisma/schema.prisma, prisma/seed.ts
```

Regra: UI nunca importa Prisma. Domain nunca importa Prisma. Services são o único ponto de escrita.

## Glossário

- **Obra**: projeto/canteiro. Regras são por obra.
- **Regra de alçada**: faixa de valor (`minCents` inclusivo, `maxCents` null = sem teto) de uma obra, com níveis ordenados.
- **Nível**: um aprovador em uma posição da faixa.
- **Cadeia**: snapshot dos níveis copiado para dentro do pedido na criação (`AprovacaoPedido`). Alterar a regra depois não altera pedidos existentes.
- **Step atual**: índice da próxima aprovação pendente.

## Decisões de produto (já tomadas — documentar no README, não reabrir)

1. Cada faixa define sua cadeia completa e ordenada (não acumula com faixas inferiores).
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
- Atualize `README.md > ## Decisões técnicas` quando uma decisão nova for tomada.

## Checklist de validações exigidas (DESAFIO.md)

- [ ] quantidade/preço inválido → erro no item, não envia
- [ ] pedido sem itens → erro claro
- [ ] obra/fornecedor/data/descrição vazios → erro no campo
- [ ] nenhuma obra cadastrada → empty state
- [ ] API fora / 500 → estado de erro com retry
- [ ] rejeitar sem motivo → validação antes do submit
- [ ] cadeia concluída → botão desabilitado + explicação
- [ ] loading em toda lista
