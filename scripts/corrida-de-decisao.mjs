/**
 * Prova do ADR 0004: dois POST concorrentes na mesma etapa produzem um 200 e um 409, e a etapa
 * fica com exatamente uma decisão no banco.
 *
 * Existe como script, e não como caso de teste, porque a corrida só é real contra o servidor de
 * verdade: é o `UPDATE` condicional do Prisma contra o SQLite que está sob julgamento, e um
 * mock dele provaria apenas que o mock foi escrito certo.
 *
 * Uso:
 *   node scripts/corrida-de-decisao.mjs <pedidoId> <usuarioIdDoAprovadorDaVez> [baseUrl]
 *
 * O pedido precisa estar pendente e o usuário precisa ser o aprovador da vez. Como o seed ainda
 * não traz faixa nem pedido (isso é da Sprint 8), o cenário é montado antes pelas rotas das
 * Sprints 4 e 5.
 */

const [, , pedidoId, usuarioId, baseUrl = 'http://localhost:3000'] = process.argv

if (!pedidoId || !usuarioId) {
  console.error('uso: node scripts/corrida-de-decisao.mjs <pedidoId> <usuarioId> [baseUrl]')
  process.exit(2)
}

const url = `${baseUrl}/api/pedidos/${pedidoId}/decisoes`
const init = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: `obraflow_sessao=${usuarioId}` },
  body: JSON.stringify({ tipo: 'aprovar' }),
}

// Promise.all e não duas chamadas em sequência: o que se quer provar é que as duas atravessam a
// validação com o mesmo estado em mãos, e que só uma escreve.
const respostas = await Promise.all([fetch(url, init), fetch(url, init)])
const corpos = await Promise.all(respostas.map((r) => r.json()))

for (const [i, r] of respostas.entries()) {
  console.log(`requisição ${i + 1}: ${r.status} ${JSON.stringify(corpos[i])}`)
}

const situacoes = respostas.map((r) => r.status).sort()
const esperado = situacoes.length === 2 && situacoes[0] === 200 && situacoes[1] === 409

console.log(esperado ? '\nOK: exatamente um 200 e um 409.' : `\nFALHOU: ${situacoes.join(' e ')}.`)

// A contagem no banco é a outra metade da prova: dois 200 seriam flagrantes, mas um 200 e um 409
// com duas decisões gravadas seria o mesmo defeito, silencioso.
const detalhe = await fetch(`${baseUrl}/api/pedidos/${pedidoId}`, {
  headers: { Cookie: `obraflow_sessao=${usuarioId}` },
}).then((r) => r.json())

const decididas = detalhe.cadeia.filter((etapa) => etapa.situacao !== 'pendente')
console.log(
  `\ncadeia do pedido #${pedidoId}: ` +
    detalhe.cadeia
      .map((e) => `${e.ordem}·${e.nome}=${e.situacao}${e.decididoEm ? ` (${e.decididoEm})` : ''}`)
      .join(' → '),
)
console.log(`etapas decididas: ${decididas.length}`)

process.exit(esperado && decididas.length === 1 ? 0 : 1)
