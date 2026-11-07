---
title: Dados de demonstração
weight: 1
next: /tutoriais/screenshots
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

Como instalar e subir a aplicação está em [Primeiros passos](/docs/getting-started). Esta página descreve o que o seed cria e com quem entrar.

## Carregar o seed

```bash
npm run seed
```

## Quem entrar como

Os seis usuários do seed cobrem os quatro papéis. Os ids são literais e aparecem em
`prisma/seed.ts`, no `scripts/verificar.sh` e nas URLs — não são gerados.

| Nome | Papel | Para que serve na avaliação |
|---|---|---|
| **Marina Alencar** | `admin` | Configura a alçada. É a única que abre a tela 3 |
| **Amanda Prado** | `aprovador` | 1ª etapa da cadeia da obra Residencial Aurora |
| **João Ferreira** | `aprovador` | 2ª etapa da mesma cadeia, e único aprovador do Galpão |
| **Caio Nogueira** | `comprador` | Criou 7 dos 8 pedidos. Cria e submete |
| **Rafael Souza** | `comprador` | Dono do rascunho `#1002` — existe para mostrar que rascunho alheio não aparece |
| **Teresa Lima** | `visualizador` | Lê tudo que foi submetido e não pode decidir nem criar |

## O que o seed cria

Um comando (`npm run seed`) e a demonstração inteira está de pé: **nada precisa ser cadastrado à
mão**. Todos os ids e **todas as datas são literais**, de modo que `npm run db:reset` seguido de
`npm run seed` reproduz exatamente o mesmo estado — as capturas acima não envelhecem.

**3 obras · 6 usuários · 4 fornecedores · 3 faixas em 2 obras · 8 pedidos.**

### A alçada

| Obra | Faixas |
|---|---|
| **Residencial Aurora** | Até R$ 10.000,00 → Amanda · **Acima de R$ 10.000,00** (faixa aberta) → Amanda → João |
| **Galpão Logístico Norte** | Até R$ 5.000,00 → João — e **nada acima disso** |
| **Reforma da Sede** | Nenhuma faixa |

As duas últimas linhas não são descuido. O Galpão **não tem faixa aberta**: um pedido acima de
R$ 5.000,00 nessa obra não encontra regra, e é assim que o estado `SEM_REGRA_APLICAVEL` fica
alcançável sem preparar nada. A Reforma da Sede é a outra ponta: obra sem alçada nenhuma, que é o
estado vazio da tela 3.

### Os oito pedidos

| # | Total | Situação | O que ele demonstra |
|---|---|---|---|
| **1001** | R$ 8.388,00 | rascunho | Rascunho completo de Caio, pronto para submeter. 2 itens |
| **1002** | R$ 0,00 | rascunho | Rascunho **incompleto** de Rafael, sem fornecedor e sem preço. Caio pede `/api/pedidos/1002` e recebe **404**: rascunho é privado de quem o criou |
| **1003** | R$ 24.420,00 | pendente | Pendente na **1ª etapa**: está na fila de Amanda. João decidindo antes recebe **409** |
| **1004** | R$ 16.300,00 | pendente | Pendente na **2ª etapa**, com a 1ª já aprovada: está na fila de João |
| **1005** | R$ 3.176,00 | aprovado | Aprovado por inteiro, no Galpão, sob a faixa até R$ 5.000,00 |
| **1006** | R$ 30.960,00 | rejeitado | Rejeitado na 1ª etapa **com motivo** no histórico. A 2ª etapa nunca se torna decidível |
| **1007** | R$ 4.485,00 | pendente | **Faixa editada depois da submissão.** A cadeia gravada (João) difere da faixa atual da obra (Amanda) |
| **1008** | R$ 14.600,00 | aprovado | **Faixa apagada depois da submissão.** `faixaId` é nulo e `faixaLimiteCentavos` continua R$ 20.000,00 |

Os dois últimos são a razão de o seed escrever o estado diretamente em vez de encená-lo pelas
rotas: nenhuma sequência de chamadas produz "faixa editada **depois** de um pedido já ter sido
submetido sob ela" sem um segundo passo manual. O que importa demonstrar é o estado — e ele é
exatamente o que o [ADR 0001](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0001-cadeia-de-aprovacao-e-snapshot.md) promete.

### Filas diferentes, sem editar nada

| Entrando como | `/pedidos` mostra, em "aguardando minha decisão" |
|---|---|
| **Amanda Prado** | `#1003` |
| **João Ferreira** | `#1004` e `#1007` |

É o mesmo endereço, e a lista muda porque a **vez** é calculada no servidor a partir das etapas
gravadas — não por um filtro da tela.

## Resetar

`npm run seed` apaga o que havia e reescreve o mesmo estado — inclusive o pedido que o `scripts/verificar.sh` deixa ao provar a corrida. Para recriar o banco do zero, com as migrations:

```bash
npm run db:reset
```
