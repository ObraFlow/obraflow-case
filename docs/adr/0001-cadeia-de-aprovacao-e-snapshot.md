# A cadeia de aprovação é um snapshot, não uma derivação

A faixa aplicável é resolvida uma única vez, **na submissão** do pedido, e a sequência de etapas é
gravada no próprio pedido. Editar a alçada de uma obra depois disso não altera pedidos já em
andamento.

## Considered Options

A alternativa era derivar a cadeia da regra a cada leitura, mantendo apenas o ponteiro da etapa
atual. Foi rejeitada porque trocar o aprovador de uma faixa removeria do fluxo alguém que já
havia decidido: o histórico passaria a contradizer o que de fato aconteceu, e a trilha auditável
— razão de existir do serviço de aprovações — deixaria de valer.

## Consequences

Um pedido submetido sob uma regra antiga continua exibindo a cadeia antiga, e isso é correto, não
defeito. A tela de aprovação lê a cadeia gravada no pedido; nunca recalcula a partir da alçada
vigente.

A resolução acontece na submissão, e não quando a linha do pedido é criada, porque um rascunho
tem total provisório: resolver a faixa ali gravaria uma cadeia derivada de um valor que ainda vai
mudar.
