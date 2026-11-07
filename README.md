![Banner do desafio ObraFlow](assets/banner.png)

# ObraFlow — aprovações por alçada

Pedidos de compra que percorrem uma **cadeia de aprovadores definida pela alçada da obra**: faixas
de valor, cada uma com os seus aprovadores em ordem. O total do pedido escolhe a faixa; a faixa
escolhe quem assina e em que sequência; e só o aprovador da vez decide.
## Documentação

**<https://carolbalbs.github.io/obraflow-case/>**

| Página | O que tem |
|---|---|
| [Introdução](https://carolbalbs.github.io/obraflow-case/docs/) | Visão geral, stack e onde está cada coisa |
| [Primeiros passos](https://carolbalbs.github.io/obraflow-case/docs/getting-started/) | Como rodar, roteiro de 5 minutos e verificação por `curl` |
| [Guia](https://carolbalbs.github.io/obraflow-case/docs/guia/) | As decisões técnicas: tecnologias, alçada, comunicação, consistência e produção |
| [Escopo](https://carolbalbs.github.io/obraflow-case/docs/escopo/) | Regra de alçada, back-end e front-end, critério a critério |
| [Tutoriais](https://carolbalbs.github.io/obraflow-case/tutoriais/) | Dados de demonstração e as telas |
| [Entrega](https://carolbalbs.github.io/obraflow-case/docs/entrega/) | Checklist do enunciado e as sete decisões registradas |

O README completo, com o mesmo conteúdo em um arquivo só, está em [`docs/README.md`](docs/README.md).

## Como rodar

Pré-requisitos: **Node.js 20 ou mais novo** e `npm`. O banco é um arquivo SQLite local; não há
serviço externo, credencial ou container.

```bash
git clone -b resolucao-obraflow https://github.com/Carolbalbs/obraflow-case.git
cd obraflow-case
npm install
cp .env.example .env          # DATABASE_URL e DEMO_MODE
npx prisma migrate dev        # cria dev.db e aplica as migrations
npm run seed                  # popula a demonstração inteira
npm run dev                   # http://localhost:3000
```

Abra <http://localhost:3000> e escolha quem entrar como — a sessão é de demonstração, sem senha
([ADR 0005](docs/adr/0005-sessao-de-demonstracao-sem-senha.md)).

## Decisões técnicas

Cada ponto que o enunciado pede está no [Guia](https://carolbalbs.github.io/obraflow-case/docs/guia/)

- [Tecnologias, e por que cada uma](https://carolbalbs.github.io/obraflow-case/docs/guia/tecnologias/)
- [Como a alçada é modelada, calculada e persistida](https://carolbalbs.github.io/obraflow-case/docs/guia/alcada/)
- [Como o front-end conversa com o back-end](https://carolbalbs.github.io/obraflow-case/docs/guia/comunicacao/)
- [Consistência, integridade e concorrência](https://carolbalbs.github.io/obraflow-case/docs/guia/consistencia/)
