/**
 * Fachada do domínio.
 *
 * Existe para que a borda importe de um lugar só e para que a regra "nenhum import de `next/*`
 * aqui dentro" tenha uma fronteira visível. O que não aparece neste arquivo não é domínio.
 */

export * as Dinheiro from './dinheiro'
export * as Quantidade from './quantidade'
export * as Alcada from './alcada'
export * as Cadeia from './cadeia'
export * as Pedido from './pedido'
export * as Decisao from './decisao'
export * as Painel from './painel'
export * as Schemas from './schemas'

export * from './tipos'
export * from './erros'
