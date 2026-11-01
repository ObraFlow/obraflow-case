# Identidade visual do ObraFlow: "Canteiro"

Decidida em 28/10/2026 a partir de quatro direções exploradas em protótipo (Planta, Canteiro, Planilha, Contábil). Escolhida a **B. Canteiro**. Este arquivo é a fonte da verdade: `src/app/globals.css` implementa estes tokens e `ui-obraflow` / `critico-visual` cobram aderência.

## Ideia em uma frase

Ferramenta de canteiro e financeiro: cinzas de concreto, texto quase preto, e **um só amarelo de sinalização, usado exclusivamente onde o usuário atual precisa agir**. Tudo o mais é neutro. A cor não decora: sinaliza.

## Paleta

| Token (CSS)                                            | Claro                 | Escuro                | Uso                                                                                                                                                         |
| ------------------------------------------------------ | --------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--background`                                         | `#E9E7E2`             | `#1C1B19`             | Fundo da página (concreto; à noite, quase preto e quente).                                                                                                  |
| `--card` / `--popover`                                 | `#FFFFFF`             | `#262523`             | Painéis, tabelas, formulários, menus.                                                                                                                       |
| `--foreground`                                         | `#23211E`             | `#ECE9E3`             | Texto principal, botão primário, bloco "aprovou" da cadeia.                                                                                                 |
| `--muted-foreground`                                   | `#625D55`             | `#A8A196`             | Texto secundário, cabeçalho de tabela, rótulos. Contraste 5:1 sobre o card.                                                                                 |
| `--muted` / `--secondary`                              | `#F4F2EE`             | `#2F2D2A`             | Fundo de observações, faixa neutra do detalhe, hover de linha.                                                                                              |
| `--border` / `--input`                                 | `#CFCAC1`             | `#403D39`             | Bordas de painel, inputs, cabeçalho de tabela.                                                                                                              |
| `--linha`                                              | `#E3E0D9`             | `#33312E`             | Separador de linhas de tabela.                                                                                                                              |
| `--sinalizacao`                                        | `#F2B300`             | `#F2B300`             | **Só "é a sua vez"**: linha do pedido, bloco atual da cadeia, faixa de ação, foco de teclado, item ativo da navegação. O mesmo nos dois temas.              |
| `--sinalizacao-foreground`                             | `#23211E`             | `#1C1B19`             | Texto sobre o amarelo. Nunca `--foreground`: no escuro ele é claro.                                                                                         |
| `--sinalizacao-fundo`                                  | `#FFF3C4`             | `#4A3A08`             | Fundo da linha de pedido que aguarda o usuário atual. Texto secundário sobre ele é `--foreground` a 80%, não `--muted-foreground` (abaixo de AA no escuro). |
| `--sinalizacao-acao` / `--sinalizacao-acao-foreground` | `#23211E` / `#FFFFFF` | `#1C1B19` / `#ECE9E3` | Botão Aprovar sobre a faixa amarela. Não é `--primary`: no escuro `--primary` é claro e sumiria no amarelo.                                                 |
| `--skeleton`                                           | `#F4F2EE`             | `#3A3733`             | Skeleton de carregamento. Igual a `--muted` no claro; no escuro `--muted` some sobre o card.                                                                |
| `--aprovado`                                           | `#2F6B3A`             | `#8CCB97`             | Texto do badge Aprovado, barra de aprovados.                                                                                                                |
| `--aprovado-fundo`                                     | `#E3EFE3`             | `#1E3323`             | Fundo do badge Aprovado.                                                                                                                                    |
| `--rejeitado` / `--destructive`                        | `#A33A2A`             | `#E8907E`             | Texto do badge Rejeitado, bloco rejeitado da cadeia, botão destrutivo.                                                                                      |
| `--rejeitado-fundo`                                    | `#F7E6E2`             | `#3F1F19`             | Fundo do badge Rejeitado e da caixa de motivo.                                                                                                              |
| `--rejeitado-texto`                                    | `#6E2419`             | `#F3B9AC`             | Texto do motivo da rejeição sobre `--rejeitado-fundo`; toast de erro.                                                                                       |
| `--cancelado`                                          | `#7A746A`             | `#9A9388`             | Texto de nível cancelado (riscado).                                                                                                                         |
| `--on-color`                                           | `#FFFFFF`             | `#1C1B19`             | Texto sobre preenchimento `--foreground` ou `--rejeitado` (blocos aprovou/rejeitou, botão Rejeitar).                                                        |
| `--header` / `--header-foreground`                     | `#23211E` / `#FFFFFF` | `#121110` / `#ECE9E3` | Fundo e texto do header. Token próprio: no escuro o header é mais escuro que a página, não mais claro.                                                      |
| `--overlay`                                            | `rgb(35 33 30 / 0.3)` | `rgb(0 0 0 / 0.6)`    | Backdrop do dialog.                                                                                                                                         |
| `--ring`                                               | `#F2B300`             | `#F2B300`             | Anel de foco (2px, offset 2px na cor do card).                                                                                                              |

Regras:

- O amarelo nunca aparece como decoração, ícone, gráfico ou destaque de título. Se o usuário atual não tem nada a decidir, a tela não tem linha, faixa nem etiqueta amarela. A única exceção é o bloco "atual" da cadeia, que é amarelo para qualquer leitor: ele diz de quem é a vez, e isso é informação, não chamada à ação.
- Status sempre com texto (Pendente / Aprovado / Rejeitado). A cor acompanha, não substitui.
- Aprovado e rejeitado diferem também em luminosidade, não só em matiz.
- Sem gradiente, sem sombra. Separação por borda de 1px (`--border`) ou por fundo (`--muted`).

## Tema escuro

Adicionado em 31/10/2026. "Concreto à noite": os mesmos cinzas quentes, invertidos, e o mesmo amarelo.

- **Três opções** no seletor do header (ícone ao lado do sino): Claro, Escuro e Sistema. "Sistema" segue `prefers-color-scheme` e é o padrão de quem nunca escolheu.
- **Persistência:** `localStorage["obraflow:tema"]` ("light" | "dark"; "sistema" apaga a chave). A escolha vira `data-theme` no `<html>`; sem atributo, o CSS segue o sistema. Código em `components/layout/tema.ts` e `seletor-tema.tsx`.
- **Sem flash:** um `<script>` inline no `<head>` (`app/layout.tsx`) lê a chave e aplica o atributo antes do primeiro paint. O bloco escuro do `globals.css` existe duas vezes, idêntico: uma sob `@media (prefers-color-scheme: dark)` para quem não escolheu, outra sob `[data-theme="dark"]` para quem escolheu.
- **Tokens trocam, regras não.** Nenhuma classe `dark:` em componente de tela; a variante existe no `globals.css` só como rede de segurança. Texto sobre amarelo é sempre `--sinalizacao-foreground`. Texto sobre preenchimento (`--foreground`, `--rejeitado`) é `--on-color`. O header tem token próprio (`--header`, `--header-foreground`). O foco usa `ring-offset-card` (sem isso o offset do anel seria branco fixo).
- O toast segue o tema do app, não o do sistema. O favicon segue o sistema (não vê a escolha do header).
- Contraste AA conferido em cada par texto/fundo da coluna Escuro.

## Tipografia

- **Archivo** (Google Fonts, via `next/font/google`), fonte variável com o eixo de largura (`wdth`). Uma família só, inclusive em títulos. Pesos usados: 400, 500, 600 e 700.
- Largura (`font-stretch`): **marca a 125%**, **título de página (h1) a 112%**, todo o resto a 100%. É o único lugar em que a identidade "gasta ousadia": dá caráter de letreiro de canteiro sem trocar de família. Decidido em 30/10/2026.
- Corpo 14px / 1.4. Título de página 24px/700, letter-spacing -0.015em. Título de bloco 18px/700. Rótulos e cabeçalhos de tabela 12px/600 em `--muted-foreground`.
- Valores monetários e datas: `font-variant-numeric: tabular-nums`, alinhados à direita (classe `tabular-nums` do Tailwind).
- Sem caixa alta em rótulos. Sem fonte monoespaçada para dados.

## Forma e espaçamento

- Raio **2px** em tudo (`--radius: 0.125rem`). Badges e botões inclusive. Nada de pílula.
- Header em `--header` com texto `--header-foreground`, 56px, item ativo da navegação com borda inferior de 3px em `--sinalizacao`.
- Tabelas: cabeçalho com borda inferior de 2px em `--foreground`; linhas de 46px separadas por 1px `#E3E0D9`; rodapé de totais com borda superior de 2px.
- Botão primário: fundo `--foreground`, texto `--on-color`, 38px, peso 600. Secundário: `--card` com borda `--border`. Desabilitado: opacidade 0.45 **e** frase explicando ao lado.
- Painéis: `--card`, borda 1px `--border`, raio 2px, padding 20px 24px. Painel dentro de painel, nunca.

## Marca

- **Símbolo:** duas lajes de concreto sobrepostas em um quadrado de 20 unidades: uma cheia (embaixo, à esquerda) e uma só contorno de 2 unidades (em cima, à direita). Herda a cor do texto: `--header-foreground` no header, `--foreground` no favicon. Fonte: `src/components/layout/marca.tsx`.
- **Wordmark:** "ObraFlow" em Archivo 700 a 125% de largura, 16px no header, ao lado do símbolo com 8px de vão. Abaixo de `sm` fica só o símbolo: seletor, sino e tema não cabem com o nome em 343px.
- **Favicon** (`app/icon.svg`): símbolo em `--foreground` sobre `--background`, raio 2px, com as duas paletas via `prefers-color-scheme`. **Ícone iOS** (`app/apple-icon.tsx`): o mesmo, 180px.
- **Card de compartilhamento** (`app/opengraph-image.tsx`, 1200×630): fundo `--foreground`, símbolo e wordmark em branco, frase do produto em `--border`, etiqueta "Dokimos" em `--sinalizacao`. É a única peça em que o amarelo não significa "sua vez": fora do app ele é a cor da marca do serviço. Dentro do app a regra continua valendo.
- **Cabeçalho de página** (`CabecalhoPagina`): título e frase à esquerda; à direita o número que decide a ação da tela ("2 aguardam você", "2 faixas, sem lacunas", "R$ 33.000,00 parados em 2 pedidos"), 24px/700 `tabular-nums` com rótulo de 12px. Em amarelo só quando é ação do usuário atual.
- **Seleção de texto:** `--sinalizacao-fundo` com texto `--foreground`.

## Componentes próprios

**Cadeia de alçada (`CadeiaAlcada`).** Blocos lado a lado, um por aprovador, na ordem. Classes por estado:

| Estado    | Fundo           | Borda                 | Texto                                                                      |
| --------- | --------------- | --------------------- | -------------------------------------------------------------------------- |
| próximo   | `--card`        | `--border`            | `--muted-foreground`                                                       |
| herdado   | `--muted`       | `--border`, tracejada | `--muted-foreground` (vem de uma faixa abaixo; só nas regras e no preview) |
| atual     | `--sinalizacao` | `--sinalizacao`       | `--sinalizacao-foreground`, 700                                            |
| aprovou   | `--foreground`  | `--foreground`        | `--on-color`                                                               |
| rejeitou  | `--rejeitado`   | `--rejeitado`         | `--on-color`                                                               |
| cancelado | `--card`        | `--border`            | `--cancelado`, riscado                                                     |

Usado na lista (coluna Alçada), no detalhe (timeline vertical com o mesmo esquema de cor nos marcadores numerados de 28px) e no preview do formulário de pedido.

**Faixa de decisão.** Barra no topo do detalhe do pedido. Amarela com os botões Aprovar / Rejeitar quando o usuário atual é o aprovador da vez (Aprovar em `--sinalizacao-acao`, Rejeitar em `--card` com texto `--rejeitado`). Neutra (`--muted`) com os botões desabilitados e uma frase ("Aguardando João Mendes", "Cadeia concluída em 13/10/2026", "Rejeitado por João Mendes em 21/10/2026", "Você não faz parte da alçada deste pedido") em todos os outros casos.

**Etiqueta "Sua vez".** `--sinalizacao` com texto `--sinalizacao-foreground` 11px/700, ao lado do número do pedido na lista.

**Número do pedido.** `#12` em 600 com `font-stretch: 112%` e `tabular-nums`, a mesma largura do h1: é o único lugar em que a identidade gasta ousadia fora dos títulos. Vale na lista, no sino, nos dialogs, na fila e nas movimentações; nunca em mono.

**Cards de resumo (lista de aprovações).** Quatro links no topo, um por recorte (Minha decisão, Pendentes, Atrasados, Aprovados no mês), em `--card` com borda; o ativo ganha borda `--foreground` e uma barra inferior de 3px, a mesma marca da aba ativa. O único amarelo é o número de "Minha decisão" quando é maior que zero. "Atrasados" é neutro: não é ação de quem olha, e vermelho aqui diria "rejeitado". Onde há cards, o número do cabeçalho da página some para não dizer a mesma coisa duas vezes.

**Barra de seleção.** Aparece só com pedidos marcados: fundo `--sinalizacao`, texto `--sinalizacao-foreground`, "N pedidos marcados, R$ X" e os botões Desmarcar / Aprovar marcados. Só as linhas da vez do usuário têm caixa, e a caixa é quadrada (raio 2px). A confirmação é um dialog com a lista e o total.

## Gráficos

Gráficos em CSS/SVG inline, sem biblioteca. Cores só de token: `--foreground` para a série principal ou o período atual, `--muted-foreground` a 60% para os demais períodos e para "em aprovação", `--aprovado` e `--rejeitado` com o significado de sempre. Nunca `--sinalizacao`: amarelo é "sua vez", e gráfico não é ação de ninguém. Sem gradiente de cor; uma hachura (`repeating-linear-gradient` de duas cores de token) é padrão, não gradiente, e serve para "em aprovação" quando precisa diferir de "aprovado" sem uma terceira cor.

**Barra de valor (`Barra`, `components/graficos`).** Barra horizontal de 8px (12px quando é o bloco principal), raio 2px, fundo `--muted`. Empilhada quando compara partes de um todo (a escala é o total, ou o orçamento, o que for maior) e simples em `--foreground` quando compara linhas entre si (a escala é o maior valor). O número correspondente fica sempre em texto ao lado: a barra é `aria-hidden` e só dá a proporção de relance. Na fila por aprovador, a única linha amarela é a do usuário atual, com a etiqueta "Você".

**Barras por mês.** Seis colunas em CSS, alinhadas embaixo; eixo com no máximo três marcas (máximo, metade, zero) em valor abreviado ("R$ 12 mil"); linhas-guia em `--linha`. Cada coluna é focável, tem o valor inteiro no `aria-label` e mostra o valor abreviado acima da barra ao passar o mouse ou focar. O mês atual é o único em `--foreground`.

**Aviso de orçamento.** "Quase no limite" (≥ 90% comprometido) é texto com contorno `--foreground`; "Acima do orçamento" (≥ 100%) é `--foreground` com texto `--on-color`. Nenhum dos dois é vermelho nem amarelo: não é rejeição nem é a vez de ninguém.

## Movimento

Princípio: **nenhuma animação ao carregar a página. Movimento só em resposta a uma ação do usuário, para mostrar o que mudou.** Durações curtas, `ease-out`. Com `prefers-reduced-motion: reduce`, tudo vira troca de estado sem transição.

| Nome (keyframes em `globals.css`) | Quando                                        | O que faz                                                                                                                                                                                           | Duração             |
| --------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `cadeia-preenche`                 | Aprovou                                       | Bloco do aprovador preenche de `--sinalizacao` para `--foreground`, da esquerda para a direita; texto vira `--on-color` aos 55%.                                                                    | 550ms               |
| `cadeia-preenche-rejeicao`        | Rejeitou                                      | Mesmo movimento, preenchendo com `--rejeitado`.                                                                                                                                                     | 550ms               |
| `cadeia-acende`                   | Depois de aprovar, se há próximo aprovador    | Próximo bloco passa de `--card` para `--sinalizacao`.                                                                                                                                               | 400ms, atraso 450ms |
| `faixa-recolhe`                   | Decidiu                                       | Faixa de decisão vai de `--sinalizacao` para `--muted` e passa a dizer "Você aprovou às HH:MM".                                                                                                     | 700ms               |
| `linha-pulsa-a` / `linha-pulsa-b` | Trocou o "Agindo como"                        | Linhas que são do novo usuário pulsam de `--sinalizacao` para `--sinalizacao-fundo`. As duas variantes idênticas existem só para a animação reiniciar a cada troca.                                 | 900ms               |
| transição de `background-color`   | Linha deixa de ser "sua vez"                  | `transition: background-color 450ms ease`.                                                                                                                                                          | 450ms               |
| `linha-entra-a` / `linha-entra-b` | Adicionou um item no pedido; salvou uma faixa | A linha nova (ou editada) começa em `--muted` e vai a transparente. Duas variantes idênticas para reiniciar na mesma linha. Nunca no carregamento: só linhas que não existiam quando a tela montou. | 450ms               |
| transição de `opacity`            | Clicou e o servidor ainda não respondeu       | Aba, link de paginação ou faixa de decisão vão a 60–70% de opacidade (`aria-busy`) até a resposta chegar; selects de filtro ficam desabilitados. Sem spinner.                                       | 150ms               |

Fora disso, só as transições padrão do shadcn em hover e foco. Dialog e popover abrem com o fade/zoom de 100ms do shadcn, sem sombra e com borda de 1px.

## O que fica de fora

Gradiente, sombra, glassmorphism, ícone decorativo ao lado de título, ilustração em empty state, eyebrow em caixa alta, separador "·", seta "→" em texto, card dentro de card, pílula, animação de entrada.
