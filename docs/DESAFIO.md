![Banner do desafio ObraFlow](../assets/banner.png)

# Desafio Full-stack — ObraFlow

Bem-vindo(a) ao nosso processo seletivo! Estamos buscando alguém com curiosidade técnica, autonomia e, acima de tudo, **visão de produto e criatividade** para transformar problemas reais em soluções.
## Contexto

O **ObraFlow** é uma plataforma para empresas do setor de construção civil, concebida como parte de um [ERP (*Enterprise Resource Planning*)](https://pt.wikipedia.org/wiki/Sistema_integrado_de_gest%C3%A3o_empresarial).

O **Dokimos** é o serviço de aprovações do ObraFlow. Ele gerencia **alçadas de aprovação**: regras que definem quem pode autorizar uma decisão e em qual ordem, de acordo com o contexto do pedido — neste caso, a obra e o valor da compra.

A gestão de alçadas é necessária para que a empresa mantenha controle financeiro e operacional. Compras de menor impacto podem ser decididas rapidamente por responsáveis próximos à obra; compras de maior valor exigem revisão adicional de pessoas com maior responsabilidade. Isso reduz o risco de gastos indevidos, evita que uma única pessoa aprove decisões além de sua responsabilidade e cria uma trilha auditável de quem aprovou ou rejeitou cada pedido.

Também é importante que essas regras sejam configuráveis por obra: projetos diferentes podem ter orçamentos, portes e responsáveis distintos. Assim, o sistema deve identificar a regra aplicável no momento da criação do pedido, formar a cadeia de aprovadores e só avançar para a próxima pessoa depois da aprovação anterior. Em caso de rejeição, o fluxo é interrompido e o motivo fica registrado no histórico.

Em produção, uma regra simples seria:

```text
Obra 1 — valor até R$ 10.000,00
-> Aprovadores: João
Obra 1 — valor acima de R$ 10.000 
-> Aprovadores: Amanda
```

*   Se um pedido na Obra 1 custar **R$ 8.000,00**, basta o clique da João para ser aprovado.
*   Se custar **R$ 12.500,00**, João precisa aprovar primeiro. Só depois da aprovação dela é que o pedido fica liberado para o Amanda decidir. Se a João (ou o Amanda) rejeitar, o pedido é cancelado na hora e precisa ter um motivo registrado.

Neste desafio você vai construir a **versão simplificada** desse fluxo: as telas de um sistema de pedidos de compra com aprovação por alçada.

---

# Backend e persistência

Você deve projetar e implementar a [API](https://pt.wikipedia.org/wiki/Interface_de_programa%C3%A7%C3%A3o_de_aplica%C3%A7%C3%B5es) (ou outro mecanismo de comunicação entre front-end e servidor) e a persistência necessários para suportar o desafio. O contrato, as rotas e o formato dos dados são livres, desde que atendam aos comportamentos abaixo:

* cadastrar e listar obras, usuários, fornecedores, pedidos e regras de alçada;
* criar pedidos com cabeçalho e **N itens**; calcular e persistir seus totais;
* determinar a cadeia de aprovadores conforme a obra e o valor total do pedido;
* registrar aprovações e rejeições, incluindo o motivo obrigatório de rejeição;
* impedir decisões fora da ordem da alçada e preservar o histórico;
* criar, editar, remover e consultar níveis e aprovadores das regras por obra;
* garantir a consistência das leituras e escritas dos dados.

Inclua dados de demonstração suficientes para avaliar o fluxo: ao menos 2 obras, usuários, regras e pedidos em diferentes estados.

Documente no `README.md` como iniciar a aplicação, popular os dados (quando aplicável) e consumir a API. Se optar por expor uma API HTTP, documente também os principais endpoints e payloads.

---

# Tecnologias

A stack é **livre**. Escolha as tecnologias de front-end, back-end, banco de dados, ORM, biblioteca de estilos, testes e infraestrutura que considerar mais adequadas.

A única exigência é que a aplicação possa ser executada localmente conforme as instruções do seu `README.md`, sem depender de serviços pagos ou de credenciais externas.

Testes são desejáveis, mas não obrigatórios.

---

# O que você vai construir

Três telas. O layout é livre — **não entregamos Figma, API ou implementação de referência**. O desenho das telas e as decisões de produto são parte da avaliação.

## 1. Cadastro de pedido de compra

Um pedido de compra representa uma solicitação ao fornecedor e deve conter **um ou mais itens**. A alçada é determinada pelo **valor total do pedido**, e não pelo valor isolado de um item.


### Dados gerais

| Campo | Obrigatório | Comportamento esperado |
|---|---:|---|
| Obra | Sim | Lista as obras disponíveis para o pedido. |
| Fornecedor | Sim | Identifica o fornecedor do pedido. |
| Data do pedido | Sim | Data de emissão do pedido. |
| Observações internas | Não | Campo livre para justificar ou complementar a solicitação. |

Não é **obrigatório** criar uma tela de cadastro de fornecedor, obra ou usuário — se quiser, considere que esses dados já existem no sistema. A tela deve apenas permitir selecionar a obra e o fornecedor do pedido.

### Itens do pedido

A tela começa com um item em branco e deve permitir **adicionar, editar e remover N itens** antes do envio. Cada item deve ter, no mínimo:

| Campo | Obrigatório | Comportamento esperado |
|---|---:|---|
| Descrição | Sim | Descreve claramente o material ou serviço. |
| Quantidade | Sim | Número positivo; pode aceitar decimais. |
| Unidade | Sim | Por exemplo: `un`, `kg`, `m`, `m²` ou `h`. |
| Preço unitário | Sim | Valor monetário não negativo. |
| Total do item | Calculado | `quantidade × preço unitário`; não deve ser editável diretamente. |

O candidato pode definir a experiência de uso mais adequada — por exemplo, uma tabela expansível, um formulário por item ou um drawer — desde que a inclusão de vários itens permaneça clara.

### Totalização e envio

A interface deve exibir o **total do pedido**, calculado pela soma dos totais dos itens. Esse é o valor usado para selecionar a regra de alçada.

O botão **Cadastrar pedido** só deve ficar disponível quando os dados gerais e todos os itens forem válidos. Ao criar o pedido, o back-end deve persistir cabeçalho, itens, total calculado e cadeia inicial de aprovação.
## 2. Aprovação

A tela deve listar pedidos e permitir abrir os detalhes de cada um. A lista pode ser em tabela, cartões ou outra composição clara, mas deve apresentar pelo menos:

| Informação por pedido | Descrição |
|---|---|
| Identificador, obra e fornecedor | Contexto rápido do pedido. |
| Data, quantidade de itens e valor total | Resumo financeiro e operacional. |
| Situação | Pendente, aprovado ou rejeitado. |
| Alçada atual | Aprovadores concluídos, aprovador atual e próximas etapas. |
| Ações | Aprovar ou rejeitar quando houver uma decisão disponível. |

Nos detalhes, apresente os itens — descrição, quantidade, unidade, preço unitário e total — além do histórico de decisões. A lista de pedidos **pendentes** deve refletir o nível atual da alçada, calculado e persistido pelo back-end. A rejeição exige motivo, interrompe o fluxo e fica registrada no histórico. Quando toda a cadeia for concluída, as ações de decisão devem estar desabilitadas com uma explicação.

## 3. Regras da alçada

A tela deve permitir selecionar uma obra e configurar as faixas de valor que definem a cadeia de aprovação. Uma representação mínima pode ser uma tabela como esta:

| Faixa de valor | Aprovadores, na ordem do fluxo | Ações |
|---|---|---|
| Até R$ 10.000,00 | Amanda | Editar / remover |
| Acima de R$ 10.000,00 | Amanda → João | Editar / remover |

A interface deve listar usuários disponíveis e permitir:

* criar, editar e remover níveis/faixas de alçada;
* definir o limite de valor de cada faixa;
* adicionar, remover e reordenar aprovadores em cada faixa;
* listar as regras já salvas para a obra selecionada.

O comportamento para valores sem regra aplicável deve ser definido e documentado pelo candidato — por exemplo, impedir o envio do pedido com uma mensagem clara.

---

# Validações e erros (exigidos)

| Situação | Comportamento esperado |
|---|---|
| Quantidade ou preço unitário inválido, negativo ou não numérico | erro no item correspondente, mensagem compreensível, não envia |
| Pedido sem itens | erro claro; não envia |
| Campos obrigatórios vazios (obra, fornecedor, data ou descrição de item) | erro no campo correspondente; não envia |
| Nenhuma obra cadastrada | empty state amigável, não tela branca |
| API fora do ar / 500 | estado de erro com opção de tentar novamente |
| Rejeitar sem motivo | validação antes do submit |
| Cadeia de alçada já concluída | botão de decisão desabilitado + explicação |

Loading state é obrigatório em toda lista.

---

# 📦 Como entregar (Prazo: 01/11/2026 às 23:59)
O repositório deve conter instruções claras para instalar dependências, configurar o ambiente e iniciar a solução completa (front-end, back-end e banco de dados, quando aplicável). O método de execução é livre; `docker compose` é aceito, mas não obrigatório.

Repositório deve conter:

* código-fonte do front-e˝nd e do back-end;
* dados de demonstração e instruções para criá-los ou carregá-los;
* `README.md` com explicando:
  * screenshots das telas;
  * as tecnologias escolhidas e os motivos da escolha;
  * como a regra de alçada é modelada, calculada e persistida;
  * como o front-end se comunica com o back-end;
  * como a consistência e a integridade dos dados são garantidas;
  * o que mudaria em produção;
1. Faça um **Fork** deste repositório (`https://github.com/ObraFlow/obraflow-case`).
2. Abra um **Pull Request (PR)** para este repositório até **01/11/2026 às 23:59**.
3. **Importante:** Na descrição do seu Pull Request, deixe seu **e-mail e telefone (WhatsApp)** para contato!

---

# Avaliação

| Critério | Peso |
|---|---:|
| Funcionamento completo: front-end, back-end e persistência | 25% |
| Modelagem e implementação das regras de alçada | 20% |
| Qualidade de código, organização e decisões técnicas | 15% |
| **Desenho de UI: hierarquia, clareza, consistência** | 20% |
| Estados (loading / empty / erro), responsividade e validações | 10% |
| Documentação (`## Decisões técnicas`) | 10% |

IA é permitida — mas você precisará explicar cada decisão na entrevista de 30 min.

---

## Contato


**Jonathan Bispo**  
WhatsApp: [+55 71 99204-4335](https://wa.me/5571992044335)  
E-mail: [contrato@obraflow.io](mailto:contrato@obraflow.io)
