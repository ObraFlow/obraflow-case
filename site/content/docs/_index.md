---
title: Introdução
weight: 1
next: /docs/getting-started
---

## Como navegar

{{< cards >}}
  {{< card link="getting-started" title="Primeiros passos" icon="play" subtitle="Como rodar, o roteiro de avaliação em 5 minutos e a verificação por curl." >}}
  {{< card link="guia/" title="Guia" icon="book-open" subtitle="As decisões técnicas: stack, modelagem da alçada, comunicação, consistência e produção." >}}
  {{< card link="/tutoriais/" title="Tutoriais" icon="academic-cap" subtitle="Dados de demonstração e screenshots das telas." >}}
  {{< card link="escopo/" title="Escopo do desafio" icon="clipboard-list" subtitle="O enunciado original e como cada parte foi resolvida." >}}
{{< /cards >}}

Documentação de entrega para o desafio full-stack do **ObraFlow**.

O **ObraFlow** é uma plataforma para empresas de construção civil, concebida como parte de
um ERP. Este é o seu **serviço de aprovações**: ele gerencia **alçadas** — regras que
definem **quem** pode autorizar uma decisão e **em qual ordem**, de acordo com a **obra** e
o **valor total** da compra.

{{< callout emoji="🏗️" >}}
O que foi construído é a **versão simplificada** desse fluxo: as telas de um sistema de
pedidos de compra com aprovação por alçada, mais a API e a persistência que as sustentam.
{{< /callout >}}

## Em uma frase

| Pergunta | Resposta curta |
|---|---|
| O que é este serviço? | O serviço de aprovações do ObraFlow. |
| O que ele decide? | Quem aprova um pedido de compra, e em qual ordem. |
| Com base em quê? | Na **obra** e no **valor total** do pedido. |
| Quando a cadeia é formada? | Na **submissão** do pedido — e é gravada como snapshot. |
| E se alguém rejeitar? | O fluxo para na hora, com **motivo obrigatório** no histórico. |

| | |
|---|---|
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 · SQLite · Tailwind v4 · Vitest |
| **Como roda** | `npm install && npx prisma migrate dev && npm run seed && npm run dev` |
| **Telas** | 1 · Cadastro de pedido · 2 · Aprovação · 3 · Regras da alçada · e o painel da administração (`/admin`) |
| **Dados de demonstração** | 3 obras, 6 usuários, 4 fornecedores, 3 faixas e **8 pedidos**, um em cada ponto do ciclo |
| **Entrada** | sem senha, atrás da flag `DEMO_MODE` — troca de usuário em um clique |
| **Documentação completa** | <https://carolbalbs.github.io/obraflow-case/> — o mesmo conteúdo deste README, em páginas, com os diagramas |


## Onde está cada coisa

```
app/                 rotas do Next: páginas e Route Handlers em app/api/*
src/domain/          regra de negócio pura — não importa next/*, não toca em banco
src/server/          sessão, permissão, envelope de erro, transações
src/ui/              componentes, hooks e as chamadas de API das telas
prisma/              schema, migrations e o seed da demonstração
scripts/             verificar.sh (prova por curl) e capturar-telas.mjs
docs/                Documentação, ADRs, glossário e o enunciado original
```

| Tela | Endereço | Quem abre | Página e componente |
|---|---|---|---|
| Entrada | `/entrar` | qualquer um, com `DEMO_MODE` | `app/entrar/page.tsx` |
| 1 · Cadastro de pedido | `/pedidos/novo` (`?rascunho={id}` retoma) | comprador | `app/pedidos/novo/page.tsx` · `FormularioDePedido.tsx` |
| 2 · Aprovação — lista | `/pedidos` (`?aba=para-mim` é a fila) | sessão | `app/pedidos/page.tsx` · `ListaDePedidos.tsx` |
| 2 · Aprovação — detalhe | `/pedidos/{id}` | sessão | `app/pedidos/[id]/page.tsx` · `DetalheDoPedido.tsx` |
| 3 · Regras da alçada | `/alcadas` | admin | `app/alcadas/page.tsx` · `RegrasDaAlcada.tsx` |
| Painel da administração | `/admin` | admin | `app/admin/page.tsx` · `PainelDoAdmin.tsx` |
| Empresa — obras e fornecedores | `/empresa` (`?aba=fornecedores`) | admin | `app/empresa/page.tsx` · `Empresa.tsx` |

Os componentes estão em `src/ui/componentes/`; as rotas de API, em `app/api/`, uma pasta por
endereço da tabela de endpoints.

| Documento | O que é |
|---|---|
| [`docs/adr/`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/) | As sete decisões que o resto do código assume |
| [`GLOSSARY.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/GLOSSARY.md) | O vocabulário: faixa, cadeia, etapa, alçada, aprovador da vez |
