---
title: Tecnologias e motivos
weight: 1
prev: /docs/guia/
next: /docs/guia/alcada
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

| Camada | Escolha | Por quê |
|---|---|---|
| Front + back | **Next.js 16, App Router** | Um único projeto, um único `npm run dev`, sem orquestrar dois servidores. O enunciado pede execução local simples, e duas aplicações separadas custariam um `docker compose` que ele dispensa |
| Linguagem | **TypeScript**, `strict` | O domínio é feito de tipos estreitos (`Centavos`, `Milesimos`, `Ordem`). Trocar centavos por reais numa chamada é erro de compilação, não bug de produção |
| Mutações | **Route Handlers**, sem Server Actions | Porque o contrato precisa ser inspecionável por `curl` — é o que torna o `scripts/verificar.sh` possível ([ADR 0003](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0003-route-handlers-sem-server-actions.md)) |
| Persistência | **SQLite + Prisma 7.10.1** (pinado) | Roda local sem serviço externo; o schema é um arquivo legível; e o cliente tipado fecha o ciclo com o TypeScript. A versão é pinada sem `^` porque o Prisma 7 mudou a configuração, e um minor automático quebraria a instalação de quem clonar |
| Estilo | **Tailwind v4**, com tokens de marca | Os tokens saem de `site/assets/css/obraflow.css`, o tema do próprio ObraFlow. Nenhum hexadecimal cru na tela: a cor sempre tem nome |
| Testes | **Vitest** sobre `src/domain/` | O domínio é puro — não importa `next/*`, não toca em banco. Isso o torna testável sem subir servidor, e é por isso que a regra de alçada mora lá e não dentro das rotas |
| Validação | **Zod 4** | Um único schema por contrato, rodado nas **duas** pontas: o formulário valida antes de enviar e a rota revalida ao receber. Mensagem e chave de campo saem do mesmo lugar |

O que **não** entrou, e por quê: sem autenticação com senha ou SSO, sem entidade `Empresa`, sem
tela de cadastro de usuário, sem anexo, sem notificação, sem edição de pedido
submetido, sem aprovação em paralelo. Cada ausência é deliberada.
