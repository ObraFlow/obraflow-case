---
title: Front-end ↔ back-end
weight: 3
prev: /docs/guia/alcada
next: /docs/guia/consistencia
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

`fetch` do navegador contra Route Handlers em `app/api/*`. JSON nos dois sentidos, cookie
`httpOnly` para a identidade, e **nenhuma Server Action**: toda escrita tem um endereço que
`curl` alcança.

O erro tem um envelope só, em toda rota, sem exceção:

```json
{ "error": { "code": "SEM_REGRA_APLICAVEL", "message": "…", "fields": { "itens.0.quantidade": "…" } } }
```

`code` vem de um enum do domínio e o número HTTP sai de um mapa único (`SITUACAO_HTTP`) — nenhuma
rota escolhe status de recusa por conta própria, então a mesma regra nunca responde 400 num lugar
e 422 noutro. `fields` é o que permite ao formulário **ancorar a mensagem no campo certo**, com as
mesmas chaves que o Zod produziu no cliente.

"Sessão" na tabela abaixo é qualquer um dos quatro papéis; sem sessão, toda rota responde
`403 SEM_PERMISSAO`. Obras e fornecedores são listados por qualquer sessão e cadastrados pelo
admin; usuários são só listados, porque vêm do seed.

| Método e rota | Quem pode | O que faz |
|---|---|---|
| `GET POST DELETE /api/sessao` | `DEMO_MODE` | Quem está dentro · entrar como · sair |
| `GET /api/usuarios` | `DEMO_MODE` | A lista da tela de entrada |
| `GET /api/alcada` | admin | Obras e a contagem de faixas de cada uma |
| `GET /api/obras` | sessão | Obras cadastradas — `id`, `nome`, `cidade`, por nome |
| `GET /api/fornecedores` | sessão | Fornecedores cadastrados — `id`, `nome`, `documento`, por nome |
| `GET /api/obras/{id}/faixas` | sessão | Faixas da obra, ordenadas, com os aprovadores na ordem |
| `POST /api/obras` | admin | Cadastra a obra — `{ nome, cidade }` → `201` |
| `POST /api/fornecedores` | admin | Cadastra o fornecedor — `{ nome, documento? }`, CNPJ com ou sem máscara, gravado mascarado → `201` |
| `POST /api/obras/{id}/faixas` | admin | Cria a faixa e os aprovadores numa transação (`201`) |
| `PUT /api/faixas/{id}` | admin | **Substitui a faixa inteira** — limite e lista ordenada |
| `DELETE /api/faixas/{id}` | admin | Remove, e devolve `pedidosAfetados` |
| `GET /api/pedidos` | sessão | Lista paginada, filtros `situacao`, `obraId`, `page`, `perPage` |
| `GET /api/pedidos/resumo` | admin | Contagem por situação (`porSituacao`), filtro `obraId` — o gráfico do painel |
| `GET /api/pedidos/painel` | admin | KPIs, série semanal, cortes por faixa e por aprovador e fila de atenção, de **uma** leitura; `dias=7\|30\|90` (padrão 30), `obraId` |
| `POST /api/pedidos` | comprador | Cria o rascunho (`201`) |
| `GET /api/pedidos/{id}` | sessão | Detalhe com itens, cadeia, histórico, `etapaAtual` e `podeDecidir` |
| `PUT DELETE /api/pedidos/{id}` | criador | Substitui ou apaga o **rascunho** |
| `POST /api/pedidos/{id}/submissao` | comprador | Exige a data do pedido, resolve a faixa, grava a cadeia, carimba `submetidoEm` |
| `POST /api/pedidos/{id}/decisoes` | aprovador | `{"tipo":"aprovar"}` ou `{"tipo":"rejeitar","motivo":"…"}` |

Exemplo completo, do rascunho à decisão:

```bash
C="Cookie: obraflow_sessao=cseedusuariocaio00004"   # Caio, comprador
J="Cookie: obraflow_sessao=cseedusuariojoao00003"   # João, aprovador

# 1. Cria o rascunho. `totalCentavos` não é enviado: o servidor o calcula.
curl -s -X POST localhost:3000/api/pedidos -H "$C" -H 'Content-Type: application/json' -d '{
  "obraId": "cseedobragalpao000002",
  "fornecedorId": "cseedfornecedoreletrica3",
  "dataPedido": "2026-10-31",
  "observacoes": "Quadro de distribuição do mezanino.",
  "itens": [{ "descricao": "Disjuntor bipolar 40 A", "quantidade": "16", "unidade": "un", "precoUnitario": "78,50" }]
}'

# 2. Submete. A rota NÃO lê corpo: ela valida o rascunho que está no banco.
curl -s -X POST localhost:3000/api/pedidos/1009/submissao -H "$C"

# 3. Decide, como o aprovador da vez.
curl -s -X POST localhost:3000/api/pedidos/1009/decisoes -H "$J" \
  -H 'Content-Type: application/json' -d '{"tipo":"aprovar"}'
```

Dois detalhes que valem o comentário. **Número no corpo é centavos; texto é entrada de
formulário** — `"precoUnitario": 7850` e `"precoUnitario": "78,50"` são o mesmo valor, e a
conversão de texto passa pelo parser do domínio, nunca por `z.coerce`. E **o pedido tem duas
datas, com dois donos**: `dataPedido` é a data de emissão que quem compra declara
(`"AAAA-MM-DD"`, obrigatória na submissão, gravada pelo rascunho); `submetidoEm` é o horário do
servidor no instante da submissão — o registro auditável de quando o pedido entrou no fluxo, que
ninguém escolhe. A submissão não lê corpo: valida o rascunho gravado e não toca na `dataPedido`.
Sem data, ela responde `422` com `fields.dataPedido`. Nenhuma regra de data futura ou retroativa
— o enunciado não pede.

## Operações por camada

Rotas, servidor e domínio puro: quem chama quem. Os diagramas saem de um canvas feito no planejamento e foram **corrigidos contra o código**: os nomes de função são os de `src/domain` e `src/server`, e os campos, os de `prisma/schema.prisma`.

![Operações por camada](/diagramas/operacoes-por-camada.png)
