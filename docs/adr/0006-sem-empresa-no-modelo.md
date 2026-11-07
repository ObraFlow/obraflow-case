# Empresa fica fora do modelo, e a interface não finge que existe

Não há entidade `Empresa` nem `empresa_id` nas tabelas: a aplicação assume uma construtora
implícita, e `Obra` é o escopo máximo. O nome da construtora aparece no cabeçalho como marca
fixa.

## Consequences

Nenhum controle da aplicação entregue simula comportamento ausente: não há seletor de empresa,
nem lista de outras construtoras, nem troca de tenant. Um botão que não faz o que anuncia custa
mais caro do que a funcionalidade ausente, porque desloca a conversa de "por que não foi feito"
para "por que está quebrado".

O isolamento por tenant foi modelado em mockup — sessão carregando `tenant_id`, consulta
filtrada no banco, papel recalculado por empresa — e permanece como desenho, servindo de base
para a seção sobre produção.
