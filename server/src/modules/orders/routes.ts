import type { FastifyInstance } from 'fastify'
import { optionalActor, requireActor } from '../../lib/actor.js'
import { notFound } from '../../lib/errors.js'
import { idParam } from '../../lib/schemas.js'
import { orderDetailDto, orderSummaryDto } from './dto.js'
import { createOrderBody, listQuery, rejectBody } from './schemas.js'
import { createOrder, decide, getOrder, listOrders, orderStats } from './service.js'

export async function orderRoutes(app: FastifyInstance) {
  app.get('/orders', (req) => {
    const query = listQuery.parse(req.query)
    const awaitingUserId = query.awaiting === 'me' ? requireActor(req).id : undefined
    return listOrders({ ...query, awaitingUserId }).map(orderSummaryDto)
  })

  // resumo do topo da tela de aprovações; "aguardando você" só com X-User-Id
  app.get('/orders/stats', (req) => {
    const { siteId } = listQuery.parse(req.query)
    return orderStats(optionalActor(req)?.id, siteId)
  })

  app.get('/orders/:id', (req) => {
    const { id } = idParam.parse(req.params)
    const order = getOrder(id)
    if (!order) throw notFound('Pedido')
    return orderDetailDto(order)
  })

  app.post('/orders', (req, reply) => {
    const actor = requireActor(req)
    const order = createOrder(createOrderBody.parse(req.body), actor.id)
    return reply.code(201).send(orderDetailDto(order))
  })

  app.post('/orders/:id/approve', (req) => {
    const { id } = idParam.parse(req.params)
    const actor = requireActor(req)
    return orderDetailDto(decide(id, actor.id, { type: 'APPROVE' }))
  })

  app.post('/orders/:id/reject', (req) => {
    const { id } = idParam.parse(req.params)
    const actor = requireActor(req)
    const { reason } = rejectBody.parse(req.body)
    return orderDetailDto(decide(id, actor.id, { type: 'REJECT', reason }))
  })
}
