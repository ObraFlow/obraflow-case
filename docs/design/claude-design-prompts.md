# Prompts para o Claude Design

Como usar:
1. Abra um projeto novo no Claude Design e cole o **Prompt 0 (briefing mestre)**. Ele dá o contexto, a identidade visual e os dados de exemplo.
2. Depois cole **um prompt de tela por vez** (1, 2, 3). Revise cada tela contra o checklist dela antes de seguir.
3. No final, cole o **Prompt 4 (estados e responsividade)**.
4. Limite o tempo: no máximo ~1 dia. O objetivo é decidir layout e fluxo, não polir pixel. O acabamento final é feito no código.

Dica: se uma tela vier faltando algo, responda citando o item do checklist ("faltou o estado de erro com tentar novamente").

---

## Prompt 0 — Briefing mestre

```
Você vai desenhar as telas de um produto web B2B. Leia todo este contexto antes de desenhar.

## Produto
ObraFlow é um ERP para construtoras. O módulo "Dokimos" gerencia pedidos de compra com aprovação por ALÇADA:
regras, configuradas por obra, que definem quem aprova uma compra e em qual ordem, conforme o VALOR TOTAL do pedido.

Regras de negócio:
- Um pedido tem cabeçalho (obra, fornecedor, data, observações) e 1..N itens (descrição, quantidade, unidade, preço unitário, total).
- O total do pedido = soma dos totais dos itens. É esse total que escolhe a faixa de alçada.
- Cada obra tem faixas de valor. Cada faixa tem uma cadeia ORDENADA de aprovadores.
  Ex.: Edifício Maré: "até R$ 10.000 → João", "de R$ 10.000,01 até R$ 50.000 → João → Amanda", "acima de R$ 50.000 → João → Amanda → Carlos".
- A aprovação é sequencial: só o aprovador atual decide. Aprovar passa para o próximo; quando o último aprova, o pedido fica APROVADO.
- Rejeitar exige MOTIVO obrigatório, encerra o fluxo na hora (pedido REJEITADO) e o motivo fica no histórico.
- Se nenhuma faixa cobre o valor do pedido, o pedido NÃO pode ser cadastrado (mostrar mensagem clara e um caminho para configurar as alçadas).
- Situações do pedido: Pendente, Aprovado, Rejeitado.

## Usuários (personas)
- Comprador/engenheiro da obra: lança pedidos rapidamente e quer saber quem vai aprovar.
- Aprovador (gestor/diretor): quer ver o que espera pela decisão dele e decidir com contexto.
- Controller/admin: configura as alçadas de cada obra.
Não há login. No topo existe um seletor "Visualizando como: [usuário]" que simula quem está usando o sistema.
Ele muda o contexto: o aprovador da vez vê os botões de decisão ativos; os outros veem "Aguardando <nome> decidir".

## Estrutura do app
- Sidebar com 3 itens: Pedidos (aprovação), Novo pedido, Alçadas. Logo "ObraFlow" no topo da sidebar.
- Topbar com título da página e o seletor "Visualizando como".
- No mobile, a sidebar vira um menu (hambúrguer ou navegação inferior).

## Identidade visual
- Cara de ERP profissional e confiável, moderno e limpo (referências: Linear, Stripe Dashboard, Vercel).
- Base neutra (cinzas/zinc), UMA cor de destaque âmbar/laranja (remete à segurança de obra) usada com parcimônia em ações primárias.
- Cores semânticas: verde = aprovado, âmbar = pendente, vermelho = rejeitado/erro.
- Valores monetários sempre em pt-BR (R$ 12.500,00), alinhados à direita, com tabular-nums.
- Densidade média: aprovadores precisam ver bastante informação sem poluição.
- Suporte a modo claro e escuro.
- O design será implementado em Next.js + Tailwind CSS + shadcn/ui: use componentes e padrões compatíveis
  (Card, Table, Dialog, Sheet/Drawer, Select, Combobox, Badge, Tabs, Toast, Skeleton, Alert, Tooltip).
- Todo o texto da interface em português do Brasil.

## Dados de exemplo (use estes, nunca lorem ipsum)
Obras: "Edifício Maré" (Salvador), "Residencial Sol Nascente" (Lauro de Freitas).
Usuários: João Ribeiro (engenheiro de obra), Amanda Costa (gerente de suprimentos), Carlos Mendes (diretor), Beatriz Lima (compradora).
Fornecedores: Votorantim Cimentos, Gerdau, Leroy Merlin Pro, Tigre Tubos, Locabem Equipamentos.
Alçadas do Edifício Maré: até 10.000 → João · 10.000,01 a 50.000 → João → Amanda · acima de 50.000 → João → Amanda → Carlos.
Alçadas do Residencial Sol Nascente: até 20.000 → Amanda · acima de 20.000 → Amanda → Carlos.
Pedidos:
- #12 Edifício Maré · Votorantim · 3 itens · R$ 12.500,00 · Pendente (João aprovou, aguardando Amanda)
- #11 Residencial Sol Nascente · Gerdau · 8 itens · R$ 4.300,00 · Aprovado (Amanda)
- #10 Edifício Maré · Locabem · 2 itens · R$ 68.900,00 · Pendente (aguardando João)
- #9 Edifício Maré · Tigre · 5 itens · R$ 7.820,50 · Rejeitado por João: "Preço acima da cotação de referência"
Itens de exemplo: "Cimento CP-II 50kg" 100 un × R$ 32,00 · "Areia média" 12 m³ × R$ 145,00 · "Vergalhão CA-50 10mm" 300 m × R$ 8,90 ·
"Locação de betoneira 400L" 40 h × R$ 18,00.

Confirme que entendeu e aguarde as telas, uma por vez.
```

---

## Prompt 1 — Novo pedido de compra

```
Desenhe a tela "Novo pedido".

Layout desktop: duas colunas. À esquerda, o formulário; à direita, um painel de RESUMO fixo (sticky).

Formulário:
1. Card "Dados gerais": Obra (select, obrigatório), Fornecedor (combobox com busca, obrigatório),
   Data do pedido (date picker, obrigatório, padrão = hoje), Observações internas (textarea, opcional,
   placeholder sugerindo justificar a compra).
2. Card "Itens": tabela editável inline, que começa com UMA linha em branco.
   Colunas: Descrição · Quantidade (aceita decimais, > 0) · Unidade (select: un, kg, m, m², m³, h, sc, l) ·
   Preço unitário (R$, ≥ 0) · Total do item (calculado = qtd × preço, somente leitura, visualmente diferente de input) · remover (ícone).
   Botão "+ Adicionar item" abaixo da tabela. Mostrar a contagem de itens.

Painel de resumo (direita):
- Total do pedido em destaque (número grande).
- Quantidade de itens.
- "Cadeia de aprovação prevista": mostra em tempo real, conforme o total, a faixa aplicada e os aprovadores em ordem
  (chips numerados: ① João → ② Amanda) e o nome da faixa ("de R$ 10.000,01 até R$ 50.000,00").
- Botão primário "Cadastrar pedido". Quando desabilitado, abaixo dele aparece a lista do que falta
  (ex.: "Selecione o fornecedor", "Item 2: preço unitário inválido").

Mostre também estas variações da tela:
a) Preenchida e válida (botão habilitado), com 3 itens e a cadeia João → Amanda.
b) Com erros: item com quantidade negativa e item com preço "abc", com a mensagem de erro embaixo do campo
   na linha correspondente, campo Fornecedor vazio com erro, botão desabilitado com a lista de pendências.
c) Valor sem regra: o painel mostra um alerta "Nenhuma faixa de alçada cobre R$ 80.000,00 em Residencial Sol Nascente"
   com link "Configurar alçadas" e o botão desabilitado.
d) Tentativa de remover o último item: não permitir, com um aviso de que o pedido precisa ter pelo menos 1 item.
e) Mobile: itens viram cards empilhados; o total e o botão viram uma barra fixa no rodapé.
f) Sem obras cadastradas: empty state amigável ("Nenhuma obra cadastrada") em vez do formulário.

Checklist obrigatório desta tela:
[ ] Obra, Fornecedor, Data obrigatórios com erro no campo
[ ] Observações opcionais
[ ] Começa com 1 item em branco; adicionar, editar e remover N itens
[ ] Total do item calculado e não editável
[ ] Total do pedido visível
[ ] Erros por item para quantidade/preço inválidos
[ ] Botão "Cadastrar pedido" só habilitado com tudo válido
[ ] Prévia da cadeia de aprovação e tratamento de "valor sem regra"
[ ] Empty state sem obras
```

---

## Prompt 2 — Pedidos (aprovação)

```
Desenhe a tela "Pedidos", a central de aprovação.

Topo: abas por situação com contadores: "Aguardando minha decisão (2)" · "Pendentes (4)" · "Aprovados (7)" · "Rejeitados (2)" · "Todos".
Filtro por Obra (select) e busca por fornecedor ou número.

Lista (tabela no desktop) com as colunas:
- Pedido (#12) + data
- Obra
- Fornecedor
- Itens (quantidade)
- Valor total (alinhado à direita)
- Situação (badge: Pendente âmbar, Aprovado verde, Rejeitado vermelho)
- Alçada: um stepper compacto mostrando os aprovadores concluídos (✓ verde), o atual (● destacado) e os próximos (○ cinza),
  com os nomes ou avatares e um tooltip com o nome completo
- Ações: botões "Aprovar" e "Rejeitar" quando o usuário selecionado é o aprovador da vez.
  Se for a vez de outra pessoa: texto "Aguardando Amanda". Se o fluxo terminou: texto "Fluxo concluído".

Clicar numa linha abre um DRAWER lateral (Sheet) com os detalhes:
- Cabeçalho: número, situação, obra, fornecedor, data, observações internas, total.
- Tabela de itens: descrição, quantidade, unidade, preço unitário, total; e o total do pedido no rodapé.
- "Fluxo de aprovação": timeline vertical com o histórico:
  "Pedido criado · 18/10 09:12", "Aprovado por João Ribeiro · 18/10 14:32", "Aguardando Amanda Costa" (atual), "Carlos Mendes" (futuro).
  Rejeição aparece em vermelho com o motivo em destaque.
- Rodapé fixo com Aprovar / Rejeitar (mesmas regras de visibilidade da lista).
  Se a cadeia foi concluída: botões desabilitados + Alert explicando ("Este pedido foi aprovado por todos os
  aprovadores em 19/10. Nenhuma decisão pendente." ou "Pedido rejeitado por João em 17/10. O fluxo foi encerrado.").

Modal de rejeição: textarea "Motivo da rejeição" obrigatória, botão "Rejeitar pedido" (vermelho) desabilitado
enquanto o motivo estiver vazio, e uma mensagem de validação.

Mostre estas variações:
a) Lista desktop com os 4 pedidos de exemplo, visualizando como Amanda.
b) Drawer de um pedido pendente em que é a vez do usuário.
c) Drawer de um pedido aprovado (ações desabilitadas + explicação).
d) Drawer de um pedido rejeitado (motivo no histórico).
e) Modal de rejeição com erro de validação (motivo vazio).
f) Loading: skeleton da tabela.
g) Lista vazia: "Nenhum pedido aguardando sua decisão" com ilustração leve.
h) Erro de API: "Não foi possível carregar os pedidos" + botão "Tentar novamente".
i) Conflito: toast "Este pedido já foi decidido por outra pessoa. A lista foi atualizada."
j) Mobile: a lista vira cards e o drawer vira uma tela cheia.

Checklist obrigatório desta tela:
[ ] Identificador, obra, fornecedor
[ ] Data, quantidade de itens, valor total
[ ] Situação (pendente/aprovado/rejeitado)
[ ] Alçada atual: concluídos, atual, próximos
[ ] Aprovar/Rejeitar quando há decisão disponível
[ ] Detalhes com itens (descrição, qtd, unidade, preço, total) + histórico de decisões
[ ] Rejeição com motivo obrigatório validado antes do envio
[ ] Cadeia concluída: botões desabilitados + explicação
[ ] Loading, vazio e erro com tentar novamente
```

---

## Prompt 3 — Regras de alçada

```
Desenhe a tela "Alçadas", onde se configuram as faixas de aprovação de cada obra.

Topo: seletor de Obra (select grande ou abas com as obras).

Bloco "Régua de valores": uma barra horizontal que mostra visualmente como as faixas cobrem os valores:
0 ── 10 mil ── 50 mil ── ∞, cada segmento com os nomes dos aprovadores. Se não houver faixa "sem limite",
o trecho final aparece hachurado/vermelho com a legenda "Sem regra: pedidos acima de R$ 50.000 serão bloqueados".

Lista de faixas (cards ou tabela), ordenadas por valor:
- Faixa: "Até R$ 10.000,00" / "De R$ 10.000,01 até R$ 50.000,00" / "Acima de R$ 50.000,00"
- Aprovadores na ordem do fluxo: chips numerados (① João → ② Amanda)
- Ações: Editar / Remover (remover pede confirmação)
Botão "+ Nova faixa".

Modal ou drawer de criar/editar faixa:
- "Limite superior da faixa" (R$) ou um checkbox "Sem limite (acima do maior valor)".
  Texto de ajuda: "Esta faixa cobre pedidos de R$ 10.000,01 até o valor informado" (o início é calculado automaticamente a partir da faixa anterior).
- Aprovadores: lista ordenada com handle de arrastar (⠿) e botões ↑ ↓ para reordenar, botão remover em cada um,
  e um combobox "Adicionar aprovador" que lista os usuários disponíveis (sem os já adicionados).
- Validações: limite obrigatório e > 0, limite repetido na mesma obra, pelo menos 1 aprovador, só uma faixa "sem limite".
- Salvar / Cancelar.

Bloco "Testar valor": um input de R$ que mostra qual faixa e qual cadeia seriam aplicadas ("R$ 23.000,00 → João → Amanda"),
ou "Nenhuma faixa cobre este valor".

Mostre estas variações:
a) Edifício Maré com as 3 faixas.
b) Residencial Sol Nascente sem faixa "sem limite" (trecho final da régua em alerta).
c) Modal de edição com 3 aprovadores, um deles sendo arrastado.
d) Modal com erros de validação.
e) Obra sem nenhuma faixa: empty state "Nenhuma faixa configurada. Pedidos desta obra não podem ser cadastrados." + "Criar primeira faixa".
f) Loading (skeleton) e erro com "Tentar novamente".
g) Mobile.

Checklist obrigatório desta tela:
[ ] Selecionar obra
[ ] Listar as regras salvas da obra
[ ] Criar, editar e remover faixas
[ ] Definir o limite de valor de cada faixa
[ ] Adicionar, remover e reordenar aprovadores
[ ] Listar os usuários disponíveis
[ ] Comportamento de valor sem regra deixado claro
[ ] Loading, vazio e erro
```

---

## Prompt 4 — Revisão de estados e responsividade

```
Revise as 3 telas e garanta consistência:
- Mesmos componentes, espaçamentos, tipografia e cores semânticas em todas as telas.
- Toda lista tem estado de loading (skeleton), vazio (com mensagem e ação) e erro (com "Tentar novamente").
- Toasts de sucesso: "Pedido #13 cadastrado", "Pedido aprovado", "Faixa salva".
- Versões mobile (375px) das 3 telas, sem scroll horizontal.
- Modo escuro de ao menos uma tela.
Liste, ao final, qualquer requisito dos checklists que ainda não esteja coberto.
```
