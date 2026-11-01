---
name: ui-obraflow
description: Regras de estrutura, estados, microcopy e anti-"cara de IA" para qualquer tela, página, componente, layout, formulário, tabela ou estado (loading/empty/erro) do ObraFlow. Carregar antes de criar ou revisar UI.
---

# UI do ObraFlow — regras de estrutura e qualidade

## Identidade em uma frase

Ferramenta interna de quem aprova compras de obra. **Densa, sóbria, confiável.** Parece um ERP bem feito, não uma landing page. A pessoa que usa isso está no canteiro ou no financeiro e quer decidir rápido, com contexto suficiente e sem distração.

## Decisões visuais: leia `design.md`

Cores, acento, tipografia, espaçamento, raio e sombra **não são definidos aqui**. Eles nascem de exploração visual do João e ficam em `design.md` (raiz) ou `docs/design.md`.

- Se o arquivo existir: siga-o à risca e cite-o quando desviar.
- Se **não** existir: não invente identidade. Use os defaults neutros do shadcn (`base-nova`, cor `neutral`) sem customizar `globals.css`, sem cor de acento própria, sem fonte nova. Diga na resposta, em uma linha, que a identidade visual ainda não foi definida.
- **Quando o João pedir a exploração de identidade** (variantes de tela, escolha de paleta e tipografia, escrita do `design.md`): carregue também a skill oficial `frontend-design` (plugin da Anthropic). Ela traz o processo de planejar tokens, revisar contra clichês e "gastar a ousadia em um lugar só". Em conflito, esta skill vence: o produto é um ERP denso, não uma landing page.

## Padrões por tipo de tela

**Lista (aprovações, regras)**
- Tabela (`Table` do shadcn) com cabeçalho fixo, linha inteira clicável para o detalhe.
- Status como `Badge` **com texto** (Pendente / Aprovado / Rejeitado). Nunca só cor.
- Valores em coluna própria, alinhados à direita, `tabular-nums`, formatados por `lib/money.ts`.
- Coluna "Alçada" mostra o progresso: aprovadores concluídos, o atual em destaque, os próximos apagados.
- Ação disponível na própria linha só se o usuário "Agindo como" pode decidir; senão, nada na linha (a explicação fica no detalhe).
- Densidade: no desktop, 10+ pedidos visíveis sem rolar.

**Formulário (novo pedido, faixa de alçada)**
- Dados gerais em 2 colunas no desktop, 1 no mobile (`grid md:grid-cols-2`).
- Itens do pedido em tabela editável: uma linha por item, colunas descrição / quantidade / unidade / preço unitário / total (somente leitura) / remover. Linha final com o total do pedido.
- Abaixo do total: qual faixa e cadeia serão aplicadas ("Até R$ 10.000,00 → Amanda") ou o aviso de que não há faixa para esse valor nessa obra.
- Botão principal no rodapé do formulário, à direita, desabilitado enquanto inválido **e** com texto curto ao lado dizendo o que falta.
- Erro de campo logo abaixo do campo, em texto, no formato campo + motivo.

**Detalhe (pedido)**
- Cabeçalho: identificador, obra, fornecedor, data, status, total. Sem card decorativo; é um bloco de texto bem alinhado.
- Tabela de itens (mesmas colunas do formulário, só leitura).
- **Timeline da alçada**: uma linha por nível, na ordem: concluído (nome, data, "aprovou"), atual (nome, "aguardando"), próximos (nome, apagado). Rejeição aparece no nível em que ocorreu, com o motivo.
- Ações Aprovar / Rejeitar: habilitadas só para o aprovador do step atual. Caso contrário, desabilitadas com uma frase explicando ("Aguardando Amanda" / "Cadeia concluída em 12/10" / "Pedido rejeitado por João").
- Rejeitar abre `Dialog` com `Textarea` de motivo obrigatório; o botão de confirmar só habilita com motivo.

## Estados (obrigatórios em toda lista e toda página)

- **Loading**: `loading.tsx` com `Skeleton` no **mesmo formato** da tabela ou do formulário (mesmo número de colunas, 5–8 linhas). Nada de três retângulos genéricos.
- **Empty**: uma frase dizendo o que não existe e uma ação quando fizer sentido ("Nenhuma regra para esta obra. Criar primeira faixa"). Sem ilustração.
- **Erro**: `error.tsx` com a mensagem e botão "Tentar novamente" (`retry()`, que no Next 16.3+ refaz a busca; `reset` só limpa o estado). Pedaços de layout que leem banco (header) ficam dentro de um error boundary próprio (`LimiteDeErro`) para não derrubar a navegação. Erro de server action vira toast (`sonner`) com a mensagem específica do service.
- **Desabilitado**: todo botão desabilitado tem explicação textual visível (não só tooltip).

## Microcopy em pt-BR

- Botões: verbo no infinitivo + objeto quando ambíguo ("Aprovar", "Rejeitar", "Cadastrar pedido", "Adicionar item").
- Erros: campo + motivo. "Quantidade deve ser maior que zero", "Selecione a obra", "Obra Centro não tem faixa de alçada para R$ 25.000,00".
- Sem exclamação, sem "Ops!", sem "Uh-oh", sem emoji, sem inglês ("Loading…", "Submit").
- Datas em `dd/mm/aaaa`; dinheiro em `R$ 1.234,56`.

## Checklist anti-cara-de-IA (bloqueante)

Qualquer item abaixo presente = a tela não está pronta.

- Gradiente em fundo, texto ou botão.
- Seção "hero" ou título gigante com subtítulo motivacional.
- Grade de 3 cards com ícone dentro de círculo.
- Glassmorphism, blur, sombra em todo elemento.
- Ícone decorativo ao lado de cada título ou em cada célula.
- Título "Dashboard", "Visão geral" ou "Bem-vindo".
- Ilustração genérica em empty state.
- Eyebrow em caixa alta ("GESTÃO DE PEDIDOS").
- Metadados separados por "·" ou "•".
- Cards aninhados em cards; bordas arredondadas grandes em tudo.
- Qualquer decoração que não codifique informação (linha, borda, numeração, badge sem significado).
- Espaçamento generoso de landing page: aqui o espaço serve para separar grupos, não para "respirar".

## Auto-revisão antes de entregar uma tela

Responda mentalmente e corrija antes de dizer que terminou:

1. O que o olho vê primeiro é a informação que decide a ação (status, valor, quem precisa aprovar)?
2. O status é legível sem cor (texto, posição)?
3. Cabe em 375px sem rolagem horizontal? Tabela vira lista empilhada ou rola dentro do container?
4. Os três estados (loading, empty, erro) existem e têm o mesmo formato da tela cheia?
5. Números e valores estão alinhados à direita com `tabular-nums`?
6. Há alguma decoração sem função? Se sim, remova.

Depois, peça ao agente `critico-visual` para avaliar a rota.
