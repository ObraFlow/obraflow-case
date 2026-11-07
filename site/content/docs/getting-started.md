---
title: Primeiros passos
weight: 2
prev: /docs/
next: /docs/guia/
---

## Como esta documentação está organizada

{{% steps %}}

### Guia

As **decisões técnicas**: [tecnologias e motivos](/docs/guia/tecnologias),
[modelagem da alçada](/docs/guia/alcada),
[comunicação front ↔ back](/docs/guia/comunicacao),
[consistência dos dados](/docs/guia/consistencia) e
[o que mudaria em produção](/docs/guia/producao).

### Tutoriais

O caminho prático: [dados de demonstração](/tutoriais/dados-demo) e
[screenshots das telas](/tutoriais/screenshots).

### Escopo do desafio

O enunciado original, para conferência: [regra de alçada](/docs/escopo/regra-de-alcada),
[back-end e persistência](/docs/escopo/backend) e [front-end](/docs/escopo/frontend).

### Entrega

[Prazo e Pull Request](/docs/entrega/), o
[checklist do `README.md`](/docs/entrega/readme) e [as decisões registradas](/docs/entrega/avaliacao).

{{% /steps %}}

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

## Como rodar

Pré-requisitos: **Node.js 20 ou mais novo** e `npm`. Nada além disso — o banco é um arquivo SQLite
criado localmente, e não há serviço externo, credencial ou container.

```bash
git clone -b resolucao-obraflow https://github.com/Carolbalbs/obraflow-case.git
cd obraflow-case
npm install
cp .env.example .env          # DATABASE_URL e DEMO_MODE
npx prisma migrate dev        # cria dev.db e aplica as migrations
npm run seed                  # popula a demonstração inteira
npm run dev                   # http://localhost:3000
```

Abra <http://localhost:3000>. Sem sessão, a aplicação leva para `/entrar`, onde se escolhe quem
entrar como — **sem senha**, porque a autenticação está declarada fora de escopo
([ADR 0005](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0005-sessao-de-demonstracao-sem-senha.md)). Daí em diante, o seletor no canto
superior direito troca de usuário sem sair da tela.

### Os comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em <http://localhost:3000> |
| `npm run seed` | Repopula a demonstração. Apaga o que havia e reescreve o mesmo estado |
| `npm run db:reset` | `prisma migrate reset --force` — recria o banco do zero e roda o seed |
| `npm run build` / `npm start` | Build e execução em modo produção |
| `npm test` | Suíte Vitest (58 casos) |
| `npm run lint` / `npx tsc --noEmit` | Lint e verificação de tipos |
| `./scripts/verificar.sh` | Prova por `curl` das recusas 403, 409 e 422 |

### O `.env`

```ini
DATABASE_URL="file:./dev.db"
DEMO_MODE="true"
```

`DEMO_MODE` liga a entrada sem senha e a troca de usuário. **Desligada, as rotas de sessão
respondem 404** — não 403, para que um servidor sem a flag não anuncie que existe uma porta sem
senha. É a única coisa que separa esta demonstração de um sistema que exigiria login de verdade.

## Roteiro de avaliação em 5 minutos

1. **Entre como Amanda.** `/pedidos` abre filtrada em "aguardando minha decisão", com `#1003`.
2. **Troque para João** pelo seletor do cabeçalho. A mesma URL passa a mostrar `#1004` e `#1007`.
3. **Abra `#1003` como João** e repare que não há ação de decidir: a vez é de Amanda. Pela API, o
   mesmo pedido responde `409 NAO_E_SUA_VEZ`.
4. **Abra `#1007`.** A regra aplicada diz "até R$ 6.000,00 · congelada no envio".
5. **Troque para Marina** e abra `/alcadas` → Residencial Aurora. A faixa de mesmo id hoje é "até
   R$ 10.000,00 → Amanda". O `#1007` não mudou. Ainda como Marina, **Administração** (`/admin`)
   mostra o painel: os três pendentes do seed aparecem na fila de parados há mais de 24 h.
6. **Troque para Caio** e abra `/pedidos/novo`. Monte um pedido do **Galpão** acima de R$ 5.000,00
   e tente enviar: a submissão é bloqueada com "sem regra aplicável", e o rascunho continua lá.
7. **Rode `./scripts/verificar.sh`** para ver as mesmas recusas em `curl`, com os códigos HTTP.

## Verificação por `curl`

```bash
npm run dev          # num terminal
npm run seed         # devolve o banco ao estado da demonstração
./scripts/verificar.sh
```

O script prova as quatro recusas que sustentam o produto, imprime o status HTTP e o código de erro
de cada chamada, e **sai com 0 somente quando todos os status esperados ocorreram**. Se o servidor
não estiver no ar, ou se o banco não estiver semeado, ele falha cedo dizendo qual comando rodar.

| Bloco | O que prova | Esperado |
|---|---|---|
| 1 | Decisão **fora de ordem**: João tentando decidir antes de Amanda | `409 NAO_E_SUA_VEZ` |
| 2 | **Papel imposto no servidor**: aprovador em `PUT /api/faixas/{id}` | `403 SEM_PERMISSAO` — e `200` para o admin |
| 3 | **Sem regra aplicável**: submissão acima do teto da obra | `422 SEM_REGRA_APLICAVEL`, rascunho preservado |
| 4 | **Corrida**: dois `POST` paralelos na mesma etapa | exatamente um `200` e um `409`, e **uma** etapa decidida no banco |

O bloco 4 cria o próprio pedido, para o script ser repetível. Ele é o único que deixa rastro —
pedido submetido é imutável e não tem como ser apagado. `npm run seed` devolve o banco ao estado
da demonstração.

