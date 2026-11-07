# A faixa guarda apenas o limite superior

Cada faixa de uma obra guarda um único limite de valor, inclusivo, e as faixas são ordenadas por
ele. O intervalo de uma faixa é implícito: começa onde a anterior terminou. A faixa mais alta
pode ter limite superior nulo, cobrindo todo valor acima.

## Consequences

Não existe coluna de valor mínimo, e a ausência é deliberada: com mínimo e máximo explícitos,
buracos e sobreposições entre faixas tornam-se representáveis e exigem validação a cada escrita.
Com apenas o limite superior, ambos são impossíveis por construção — a invariante é estrutural,
não verificada.

Como a faixa mais alta pode ter limite finito, "sem regra aplicável" é um estado alcançável e
precisa ser tratado na criação do pedido.
