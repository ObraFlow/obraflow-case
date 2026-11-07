# Toda escrita passa por Route Handler; nenhuma Server Action

A aplicação é um único projeto Next, mas o front-end conversa com o back-end exclusivamente por
rotas HTTP em `app/api/*`. Server Actions não são usadas para mutação, e a regra de alçada vive
em `src/domain/`, sem nenhum import de `next/*`.

## Consequences

Um leitor habituado ao App Router vai estranhar a ausência de Server Actions e pode tentar
"corrigir" isso. A escolha é deliberada: o contrato entre as duas pontas fica inspecionável por
`curl`, o formato de erro fica explícito em vez de implícito, e o domínio permanece testável sem
subir servidor. O custo é mais código de borda — validação e serialização em cada rota — do que
uma Server Action exigiria.
