---
title: Front-end
weight: 3
prev: /docs/escopo/backend
next: /docs/entrega/
---

{{< cards >}}
  {{< card title="1. Cadastro de pedido" icon="clipboard-list" subtitle="Dados gerais, N itens e totalização." >}}
  {{< card title="2. Aprovação" icon="check-circle" subtitle="Lista, detalhe, alçada atual e decisões." >}}
  {{< card title="3. Regras da alçada" icon="adjustments" subtitle="Faixas de valor e aprovadores por obra." >}}
{{< /cards >}}

## 1. Cadastro de pedido de compra

Um pedido representa uma solicitação ao fornecedor e deve conter **um ou mais itens**.

### Dados gerais

| Campo | Obrigatório | Comportamento esperado |
|---|---:|---|
| Obra | Sim | Lista as obras disponíveis para o pedido. |
| Fornecedor | Sim | Identifica o fornecedor do pedido. |
| Data do pedido | Sim | Data de emissão do pedido. |
| Observações internas | Não | Campo livre para justificar ou complementar a solicitação. |

{{< callout type="info" >}}
Não é obrigatório criar telas de cadastro de fornecedor, obra ou usuário — considere que
esses dados já existem. A tela só precisa permitir **selecionar**.
{{< /callout >}}

### Itens do pedido

A tela **começa com um item em branco** e deve permitir **adicionar, editar e remover N itens**
antes do envio.

| Campo | Obrigatório | Comportamento esperado |
|---|---:|---|
| Descrição | Sim | Descreve claramente o material ou serviço. |
| Quantidade | Sim | Número positivo; pode aceitar decimais. |
| Unidade | Sim | Ex.: `un`, `kg`, `m`, `m²`, `h`. |
| Preço unitário | Sim | Valor monetário não negativo. |
| Total do item | Calculado | `quantidade × preço unitário`; **não editável diretamente**. |

A UX é livre — tabela expansível, formulário por item, drawer — desde que a inclusão de
vários itens permaneça **clara**.

### Totalização e envio

- Exibir o **total do pedido** (soma dos totais dos itens) — é o valor que define a alçada.
- Botão **Cadastrar pedido** só habilitado quando dados gerais **e** todos os itens forem válidos.

## 2. Aprovação

Lista de pedidos com detalhe de cada um. A composição é livre (tabela, cartões…), mas deve mostrar:

| Informação por pedido | Descrição |
|---|---|
| Identificador, obra e fornecedor | Contexto rápido do pedido. |
| Data, quantidade de itens e valor total | Resumo financeiro e operacional. |
| Situação | Pendente, aprovado ou rejeitado. |
| Alçada atual | Aprovadores concluídos, aprovador atual e próximas etapas. |
| Ações | Aprovar ou rejeitar quando houver decisão disponível. |

Nos **detalhes**:

- itens: descrição, quantidade, unidade, preço unitário e total;
- **histórico de decisões**.

Regras de comportamento:

- A lista de **pendentes** reflete o nível atual da alçada, **calculado e persistido pelo back-end**.
- **Rejeição exige motivo**, interrompe o fluxo e é registrada no histórico.
- Com a cadeia concluída, as ações de decisão ficam **desabilitadas com explicação**.

## 3. Regras da alçada

Selecionar uma obra e configurar as faixas de valor que definem a cadeia de aprovação.

Representação mínima:

| Faixa de valor | Aprovadores, na ordem do fluxo | Ações |
|---|---|---|
| Até R$ 10.000,00 | Amanda | Editar / remover |
| Acima de R$ 10.000,00 | Amanda → João | Editar / remover |

A interface deve listar os usuários disponíveis e permitir:

- criar, editar e remover níveis/faixas de alçada;
- definir o **limite de valor** de cada faixa;
- **adicionar, remover e reordenar** aprovadores em cada faixa;
- listar as regras já salvas para a obra selecionada.

O comportamento para **valores sem regra aplicável** deve ser definido e documentado
(ex.: impedir o envio do pedido com mensagem clara).

## Validações e erros (exigidos)

| Situação | Comportamento esperado |
|---|---|
| Quantidade ou preço unitário inválido, negativo ou não numérico | erro no item correspondente, mensagem compreensível, não envia |
| Pedido sem itens | erro claro; não envia |
| Campos obrigatórios vazios (obra, fornecedor, data ou descrição de item) | erro no campo correspondente; não envia |
| Nenhuma obra cadastrada | **empty state** amigável, não tela branca |
| API fora do ar / 500 | estado de erro com opção de **tentar novamente** |
| Rejeitar sem motivo | validação **antes** do submit |
| Cadeia de alçada já concluída | botão de decisão desabilitado + explicação |

{{< callout type="error" >}}
**Loading state é obrigatório em toda lista.**
{{< /callout >}}

## Como foi resolvido

As telas, uma a uma e com capturas, estão em [Screenshots das telas](/tutoriais/screenshots). Abaixo: o que cada papel vê, como os estados e validações exigidos foram atendidos e onde a interface diverge dos mockups.

#### O que cada papel vê e pode fazer

A matriz vive em `src/server/permissao.ts` e é imposta **no servidor**. O menu esconde o que o
papel não usa, mas esconder não é proteger: quem digitar a URL ou chamar a rota por `curl` recebe
`403 SEM_PERMISSAO` — é o bloco 2 do script de verificação.

| | **admin** (Marina) | **aprovador** (Amanda, João) | **comprador** (Caio, Rafael) | **visualizador** (Teresa) |
|---|:---:|:---:|:---:|:---:|
| Ver pedidos submetidos | ✅ | ✅ | ✅ | ✅ |
| Ver os **próprios** rascunhos | — | — | ✅ | — |
| Ver rascunho de outra pessoa | ❌ | ❌ | ❌ | ❌ |
| Criar e editar pedido | ❌ | ❌ | ✅ | ❌ |
| Submeter pedido | ❌ | ❌ | ✅ | ❌ |
| Aprovar ou rejeitar | ❌ | ✅ **na sua vez** | ❌ | ❌ |
| Configurar a alçada (tela 3) | ✅ | ❌ | ❌ | ❌ |
| Painel da administração (`/admin`) | ✅ | ❌ | ❌ | ❌ |
| Cadastrar obra e fornecedor (`/empresa`) | ✅ | ❌ | ❌ | ❌ |
| Item "Aprovações" no menu | — | ✅ | — | — |
| Item "Alçadas" no menu | ✅ | — | — | — |
| Item "Administração" no menu | ✅ | — | — | — |
| Item "Empresa" no menu | ✅ | — | — | — |

Duas leituras importam aqui. **"Na sua vez" é a única linha condicional**: ser aprovador não basta,
é preciso ser o aprovador da etapa pendente mais antiga. E **o admin não aprova nem cria** — quem
escreve a regra não a executa, que é o único resquício de segregação de função neste recorte.
Segregação entre quem pede e quem aprova está declarada fora de escopo: **o criador pode aprovar
o próprio pedido** se a alçada o colocar na cadeia.

#### Estados, validações e responsividade

Toda lista nasce com os três estados vindos de um lugar só — `<Recurso>`, em
`src/ui/componentes/estados.tsx` —, que escolhe entre esqueleto, erro **com botão de repetir**,
vazio e conteúdo pela forma do hook. A ordem (esqueleto antes de tudo) é propriedade do
componente, não cuidado de cada tela.

| Situação do enunciado | O que acontece |
|---|---|
| Quantidade ou preço inválido | Erro **no item correspondente**, ancorado pelo nome do campo; nada é enviado. Quantidade precisa ser maior que zero; preço, não negativo — zero é aceito |
| Pedido sem itens | "O pedido precisa de pelo menos um item válido"; envio bloqueado |
| Obra, fornecedor, data do pedido ou descrição vazios | Erro no campo; o botão de envio diz o que falta |
| Nenhuma obra cadastrada | Estado vazio explicando que falta rodar `npm run seed` |
| API fora do ar / 500 | Caixa de erro com "Tentar novamente", que refaz **só** a leitura, sem recarregar a página |
| Rejeitar sem motivo | Validação antes do envio, no próprio diálogo |
| Cadeia concluída | Ações desabilitadas **com explicação**, não em silêncio |
| Carregando | Esqueleto com `aria-busy`, em toda lista |

Abaixo de 768 px as tabelas viram cartões e os botões sobem para alvos de toque de 44 px. Em
390 px nenhuma das cinco telas do fluxo (`/entrar`, `/pedidos`, `/pedidos/{id}`, `/pedidos/novo`,
`/alcadas`) rola na horizontal. No painel `/admin` os KPIs empilham em coluna e só a tabela da
fila de atenção rola, dentro do próprio cartão.
