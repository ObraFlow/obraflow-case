---
title: Screenshots das telas
weight: 2
prev: /tutoriais/dados-demo
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

Todas as capturas abaixo saem do estado do seed, sem nenhum cadastro manual. Para recapturá-las
depois de mexer em tela: `node scripts/capturar-telas.mjs docs/screenshots` com o servidor no ar.

## 1 · Cadastro de pedido

O rascunho `#1001`, retomado. Obra, fornecedor e **data do pedido** são obrigatórios, como o
enunciado pede. O total de cada item é calculado (`quantidade × preço unitário`) e o total do
pedido é a soma — nenhum dos dois é digitável, e nenhum dos dois é lido do corpo da requisição.

![Tela 1 — cadastro de pedido de compra](/screenshots/tela-1-cadastro-de-pedido.png)

Vazio, com um item em branco e o botão de envio bloqueado enquanto falta dado:

![Tela 1 — pedido novo, ainda sem dados](/screenshots/tela-1-cadastro-vazio.png)

## 2 · Aprovação

As nove informações que o enunciado pede, por pedido: identificador, obra, fornecedor, data,
quantidade de itens, total, situação, **alçada atual** (etapas concluídas, etapa da vez e as
seguintes) e ações.

![Tela 2 — lista de pedidos de compra](/screenshots/tela-2-aprovacao-lista.png)

A mesma tela, aberta por quem decide, já **filtrada em "aguardando minha decisão"** — o filtro é
removível, e o aviso diz que ele está ligado. É esta lista que muda quando se troca de usuário:

![Tela 2 — a fila de Amanda](/screenshots/tela-2-aprovacao-fila.png)

O detalhe, com os itens, a regra aplicada, a cadeia e o histórico auditável:

![Tela 2 — detalhe do pedido #1003](/screenshots/tela-2-aprovacao-detalhe.png)

## 3 · Regras da alçada

Seletor de obra, faixas com os aprovadores na ordem do fluxo, criar, editar, reordenar e remover.
O intervalo inferior (`R$ 0,01 — R$ 10.000,00`) é **derivado** da faixa anterior, nunca
armazenado.

![Tela 3 — regras da alçada da obra Residencial Aurora](/screenshots/tela-3-regras-da-alcada.png)

## Administração · painel do admin

Fora das três telas do enunciado, só para o papel `admin`, no item "Administração" do menu.
Responde onde a cadeia de aprovação trava: cinco KPIs do período (7, 30 ou 90 dias, comparados
com o período anterior de mesmo tamanho), valor aprovado por semana e por obra, corte por faixa
(pelo **snapshot** de cada pedido, não pela alçada de hoje), tempo de decisão por aprovador, a fila
de pedidos parados há mais de 24 h e a contagem de pedidos por situação. O filtro de obra recorta
tudo. Os números saem de `src/domain/painel.ts`, que tem 18 casos de teste.

![Administração — painel da empresa, como Marina](/screenshots/administracao-painel.png)


## Empresa · cadastro de obras e fornecedores

Também só para o `admin`, no item "Empresa" do menu (artboard `Empresa`). Duas abas: **Obras**,
com a cidade, quantas faixas a alçada tem e quantos pedidos submetidos — a obra sem faixa aparece
marcada, com o atalho para criar a primeira — e **Fornecedores**, com CNPJ e pedidos submetidos.
"+ Nova obra" e "+ Novo fornecedor" abrem o cadastro, validado pelo mesmo schema da rota; o que é
cadastrado aparece na hora no seletor do cadastro de pedido. Uma obra nova ainda não tem alçada:
o pedido dela é bloqueado na submissão até a primeira faixa existir.

![Empresa — obras da construtora, como Marina](/screenshots/empresa-obras.png)

![Empresa — fornecedores](/screenshots/empresa-fornecedores.png)

## A prova visual do snapshot

O pedido `#1007` foi submetido quando a faixa da obra era **"até R$ 6.000,00 → João Ferreira"**.
Depois disso a faixa foi editada e hoje é **"até R$ 10.000,00 → Amanda Prado"** (veja a tela 3
acima). O pedido continua exibindo a regra sob a qual foi submetido, e quem decide continua sendo
João. Editar a alçada **não reescreve** pedido em andamento:

![Pedido #1007 — faixa congelada no envio](/screenshots/snapshot-da-faixa.png)

## Entrada e tela estreita

![Tela de entrada, sem senha](/screenshots/entrar.png)

![Lista de pedidos em 390 px](/screenshots/tela-2-aprovacao-390px.png)

## Estados

Toda lista nasce com os três estados vindos de um lugar só — `<Recurso>`, em
`src/ui/componentes/estados.tsx` —, que escolhe entre esqueleto, erro com botão de repetir, vazio
e conteúdo pela forma do hook.

{{< tabs >}}
  {{< tab name="Loading" >}}Esqueleto com `aria-busy`, em toda lista. A ordem — esqueleto antes de tudo — é propriedade do componente, não cuidado de cada tela.{{< /tab >}}
  {{< tab name="Empty" >}}Sem obra cadastrada, estado vazio explicando que falta rodar `npm run seed`, na tela de cadastro e na de regras. Sem pedido submetido, o painel `/admin` mostra "Nenhum pedido submetido ainda" em vez de KPIs zerados.{{< /tab >}}
  {{< tab name="Erro" >}}API fora do ar ou 500: caixa de erro com "Tentar novamente", que refaz só a leitura, sem recarregar a página.{{< /tab >}}
  {{< tab name="Validação" >}}Erro ancorado no campo — obra, fornecedor, data do pedido, descrição e cada quantidade ou preço de item — e o botão "Cadastrar pedido" desabilitado dizendo o que falta. Rejeitar sem motivo é barrado no próprio diálogo, antes do envio.{{< /tab >}}
{{< /tabs >}}

## Responsividade

Abaixo de 768 px as tabelas viram cartões e os botões sobem para alvos de toque de 44 px. Em
390 px nenhuma das cinco telas do fluxo (`/entrar`, `/pedidos`, `/pedidos/{id}`, `/pedidos/novo`,
`/alcadas`) rola na horizontal. No painel `/admin` os KPIs empilham em coluna e só a tabela da
fila de atenção rola, dentro do próprio cartão.
