# A decisão é um UPDATE condicional, não leitura seguida de escrita

Aprovar ou rejeitar uma etapa é uma única escrita condicionada ao estado que a autoriza: a etapa
alvo ainda sem decisão, e todas as anteriores aprovadas. Zero linhas afetadas significa que a
premissa caiu, e a resposta é 409.

## Considered Options

Ler o pedido, conferir em memória quem é o aprovador da vez e então escrever é o caminho natural
e é uma corrida: entre a leitura e a escrita, outra requisição pode decidir a mesma etapa. Uma
coluna de versão no pedido resolveria o mesmo problema acrescentando uma peça — desnecessária,
porque o estado da própria etapa já é a versão que importa.

## Consequences

Decisão fora de ordem, duplo clique no mesmo botão e corrida entre dois aprovadores deixam de ser
três validações separadas e passam a ser o mesmo mecanismo. O botão desabilitado na interface
continua existindo, mas como conforto visual: a regra é imposta no servidor, e `curl` encontra a
mesma recusa que a tela.
