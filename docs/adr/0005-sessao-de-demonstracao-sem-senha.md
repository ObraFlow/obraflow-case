# A troca de usuário cria sessão real, e a senha é dispensada só no modo demonstração

Escolher outro usuário abre uma sessão nova no servidor, com cookie httpOnly. A identidade e tudo
que dela decorre são decididos no servidor; o cliente não declara quem é. A senha não é pedida —
e é exatamente por isso que este modo só existe em demonstração.

## Considered Options

Um seletor que apenas troca o nome na interface, enviando o identificador num cabeçalho, foi
rejeitado: a identidade passaria a ser declarada pelo cliente e seria forjável. Login com senha
foi rejeitado por custo sem contrapartida — não é pedido pelo enunciado, não pontua, e obrigaria
o avaliador a deslogar e redigitar credenciais a cada etapa da cadeia que quisesse conferir.

## Consequences

Trocar de usuário muda o que o servidor autoriza, não só o que a tela mostra: assumir alguém sem
alçada não concede poder de decidir, e o histórico continua registrando quem de fato decidiu.

Em produção a troca de conta exigiria autenticação — senha ou SSO do ERP — e essa é a única peça
que muda. O mecanismo de sessão e de autorização permanece o mesmo.

A entrada sem senha existe atrás de uma flag: com `DEMO_MODE` desligado a rota não responde. É a
diferença entre uma ausência deliberada e um descuido — e é o que impede que o atalho de
demonstração vire um buraco permanente.
