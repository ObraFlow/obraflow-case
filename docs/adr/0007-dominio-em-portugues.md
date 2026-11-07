# O domínio é escrito em português

Entidades, campos e funções do domínio usam os termos do glossário: `Pedido`, `Faixa`, `Etapa`,
`resolverFaixa`, `situacao`. Tudo que não é domínio — React, HTTP, utilitários genéricos —
permanece em inglês. Identificadores não levam acento nem cedilha.

## Consequences

O código fica bilíngue, e isso incomoda menos do que a alternativa: traduzir "alçada" para
`authorityLevel` obriga a converter mentalmente a cada leitura, e desfaz a correspondência entre
o termo que o negócio fala e o termo que o editor mostra. O glossário deixa de ser tradutor e
passa a ser índice.
