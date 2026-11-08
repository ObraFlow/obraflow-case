import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { ZodTypeAny } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { siteBody, supplierBody, userBody } from './modules/catalog.js'
import { createOrderBody, rejectBody } from './modules/orders/schemas.js'
import { tierBody } from './modules/tiers.js'

// O contrato da API sai dos mesmos schemas Zod que validam as requisições,
// então a documentação não tem como ficar diferente do que a API aceita.
const schema = (s: ZodTypeAny) => zodToJsonSchema(s, { target: 'openApi3', $refStrategy: 'none' })
const body = (s: ZodTypeAny) => ({ required: true, content: { 'application/json': { schema: schema(s) } } })
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (description: string, s: object) => ({ description, content: { 'application/json': { schema: s } } })
const list = (name: string) => ({ type: 'array', items: ref(name) })

const actor = {
  name: 'X-User-Id',
  in: 'header',
  required: true,
  schema: { type: 'integer' },
  description: 'Quem está agindo (simula a sessão).',
}
const id = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
const errors = {
  400: json('Dados inválidos (VALIDATION_ERROR, com `details` por campo)', ref('Error')),
  401: json('Sem X-User-Id válido', ref('Error')),
  403: json('Fora da cadeia ou auto-aprovação', ref('Error')),
  404: json('Não encontrado', ref('Error')),
  409: json('Conflito: fora de ordem, já decidido, pedido encerrado ou alterado no meio do caminho', ref('Error')),
  422: json('Regra de negócio: sem faixa aplicável, solicitante na cadeia, reenvio inválido', ref('Error')),
}

const person = {
  type: 'object',
  properties: { id: { type: 'integer' }, name: { type: 'string' }, role: { type: 'string' }, phone: { type: 'string', nullable: true } },
}

const document = {
  openapi: '3.0.3',
  info: {
    title: 'ObraFlow · Dokimos',
    version: '1.0.0',
    description:
      'Pedidos de compra com alçada de aprovação. Dinheiro em centavos inteiros, quantidade como string decimal ("2.5"). ' +
      'Todo erro tem o formato `{ error: { code, message, details? } }`.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Pedidos', description: 'Criação, consulta e decisão' },
    { name: 'Alçadas', description: 'Faixas de valor e aprovadores por obra' },
    { name: 'Cadastros', description: 'Obras, fornecedores, usuários e unidades' },
    { name: 'Painel', description: 'Gastos por obra, mês e fornecedor' },
  ],
  paths: {
    '/orders': {
      get: {
        tags: ['Pedidos'],
        summary: 'Lista pedidos',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } },
          { name: 'siteId', in: 'query', schema: { type: 'integer' } },
          { name: 'awaiting', in: 'query', schema: { type: 'string', enum: ['me'] }, description: 'Só os que esperam o X-User-Id' },
          { ...actor, required: false },
        ],
        responses: { 200: json('Pedidos, do mais novo para o mais antigo', list('OrderSummary')) },
      },
      post: {
        tags: ['Pedidos'],
        summary: 'Cria pedido (o X-User-Id é o solicitante)',
        parameters: [actor],
        requestBody: body(createOrderBody),
        responses: { 201: json('Pedido criado com a cadeia montada', ref('OrderDetail')), ...errors },
      },
    },
    '/orders/stats': {
      get: {
        tags: ['Pedidos'],
        summary: 'Resumo para o topo da tela de aprovações',
        parameters: [
          { name: 'siteId', in: 'query', schema: { type: 'integer' } },
          { ...actor, required: false },
        ],
        responses: { 200: json('Totais', ref('Stats')) },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Detalhe com itens, cadeia e histórico',
        parameters: [id],
        responses: { 200: json('Pedido', ref('OrderDetail')), 404: errors[404] },
      },
    },
    '/orders/{id}/approve': {
      post: {
        tags: ['Pedidos'],
        summary: 'Aprova a etapa atual',
        parameters: [id, actor],
        responses: { 200: json('Pedido atualizado', ref('OrderDetail')), ...errors },
      },
    },
    '/orders/{id}/reject': {
      post: {
        tags: ['Pedidos'],
        summary: 'Rejeita e encerra o fluxo',
        parameters: [id, actor],
        requestBody: body(rejectBody),
        responses: { 200: json('Pedido atualizado', ref('OrderDetail')), ...errors },
      },
    },
    '/dashboard': {
      get: {
        tags: ['Painel'],
        summary: 'Gasto aprovado, em aprovação e orçamento; série mensal, fornecedores, obras e atividade',
        parameters: [{ name: 'siteId', in: 'query', schema: { type: 'integer' } }],
        responses: { 200: json('Painel', ref('Dashboard')) },
      },
    },
    '/sites/{id}/tiers': {
      get: { tags: ['Alçadas'], summary: 'Faixas da obra, em ordem', parameters: [id], responses: { 200: json('Faixas', list('Tier')) } },
      post: {
        tags: ['Alçadas'],
        summary: 'Cria faixa',
        parameters: [id],
        requestBody: body(tierBody),
        responses: { 201: json('Faixas da obra após a mudança', list('Tier')), ...errors },
      },
    },
    '/tiers/{id}': {
      put: {
        tags: ['Alçadas'],
        summary: 'Substitui limite e cadeia (a ordem do array é a ordem do fluxo)',
        parameters: [id],
        requestBody: body(tierBody),
        responses: { 200: json('Faixas da obra após a mudança', list('Tier')), ...errors },
      },
      delete: {
        tags: ['Alçadas'],
        summary: 'Remove faixa (pedidos já criados não mudam)',
        parameters: [id],
        responses: { 200: json('Faixas da obra após a mudança', list('Tier')), 404: errors[404] },
      },
    },
    '/sites/{id}/chain-preview': {
      get: {
        tags: ['Alçadas'],
        summary: 'Qual faixa e cadeia um total teria',
        parameters: [id, { name: 'totalCents', in: 'query', required: true, schema: { type: 'integer' } }],
        responses: { 200: json('Faixa aplicável ou null', { type: 'object', properties: { tier: { ...ref('Tier'), nullable: true } } }) },
      },
    },
    '/sites': {
      get: { tags: ['Cadastros'], summary: 'Obras', responses: { 200: json('Obras', list('Site')) } },
      post: {
        tags: ['Cadastros'],
        summary: 'Cria obra',
        requestBody: body(siteBody),
        responses: { 201: json('Obra', ref('Site')), ...errors },
      },
    },
    '/suppliers': {
      get: { tags: ['Cadastros'], summary: 'Fornecedores', responses: { 200: json('Fornecedores', list('Supplier')) } },
      post: {
        tags: ['Cadastros'],
        summary: 'Cria fornecedor',
        requestBody: body(supplierBody),
        responses: { 201: json('Fornecedor', ref('Supplier')) },
      },
    },
    '/users': {
      get: { tags: ['Cadastros'], summary: 'Usuários', responses: { 200: json('Usuários', { type: 'array', items: person }) } },
      post: { tags: ['Cadastros'], summary: 'Cria usuário', requestBody: body(userBody), responses: { 201: json('Usuário', person) } },
    },
    '/units': {
      get: {
        tags: ['Cadastros'],
        summary: 'Unidades aceitas nos itens',
        responses: { 200: json('Unidades', { type: 'array', items: { type: 'string' } }) },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'OUT_OF_ORDER' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } },
            },
          },
        },
      },
      Site: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          name: { type: 'string' },
          city: { type: 'string' },
          kind: { type: 'string', enum: ['residential', 'commercial', 'industrial'] },
          budgetCents: { type: 'integer', description: 'Orçamento de compras da obra' },
          tierCount: { type: 'integer' },
          pendingCount: { type: 'integer' },
          pendingCents: { type: 'integer' },
        },
      },
      Supplier: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, cnpj: { type: 'string' } } },
      Tier: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          siteId: { type: 'integer' },
          fromCents: { type: 'integer', description: 'Calculado: teto da faixa anterior + 1' },
          upToCents: { type: 'integer', nullable: true, description: 'Inclusivo; null = sem teto' },
          approvers: { type: 'array', items: person },
        },
      },
      Step: {
        type: 'object',
        properties: {
          position: { type: 'integer' },
          status: { type: 'string', enum: ['WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED'] },
          decidedAt: { type: 'string', format: 'date-time', nullable: true },
          reason: { type: 'string', nullable: true },
          approver: person,
        },
      },
      OrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string', example: 'PC-00002' },
          site: { type: 'object', properties: { id: { type: 'integer' }, code: { type: 'string' }, name: { type: 'string' } } },
          supplier: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
          requester: person,
          notes: { type: 'string', nullable: true },
          itemsPreview: { type: 'array', items: { type: 'string' }, description: 'Descrição dos 3 primeiros itens' },
          orderDate: { type: 'string', format: 'date' },
          itemCount: { type: 'integer' },
          totalCents: { type: 'integer' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          currentStep: { type: 'integer', nullable: true },
          steps: { type: 'array', items: ref('Step') },
          waitingSince: { type: 'string', format: 'date-time', nullable: true },
          stalled: { type: 'boolean', description: 'Esperando a etapa atual há 3 dias ou mais' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderDetail: {
        allOf: [
          ref('OrderSummary'),
          {
            type: 'object',
            properties: {
              tierUpToCents: { type: 'integer', nullable: true },
              resubmissionOf: { type: 'object', nullable: true, properties: { id: { type: 'integer' }, code: { type: 'string' } } },
              resubmissions: {
                type: 'array',
                items: { type: 'object', properties: { id: { type: 'integer' }, code: { type: 'string' } } },
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    position: { type: 'integer' },
                    description: { type: 'string' },
                    quantity: { type: 'string', example: '45.5' },
                    unit: { type: 'string' },
                    unitPriceCents: { type: 'integer' },
                    totalCents: { type: 'integer' },
                  },
                },
              },
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['CREATED', 'APPROVED', 'REJECTED'] },
                    reason: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    actor: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
                  },
                },
              },
            },
          },
        ],
      },
      Stats: {
        type: 'object',
        properties: {
          pending: ref('CountTotal'),
          awaitingMe: ref('CountTotal'),
          approvedThisMonth: ref('CountTotal'),
          stalled: { type: 'object', properties: { count: { type: 'integer' }, afterDays: { type: 'integer' } } },
        },
      },
      Dashboard: {
        type: 'object',
        properties: {
          budgetCents: { type: 'integer' },
          approvedCents: { type: 'integer', description: 'Pedidos com a cadeia concluída' },
          pendingCents: { type: 'integer' },
          availableCents: { type: 'integer', description: 'Orçamento menos aprovado e em aprovação (pode ser negativo)' },
          counts: {
            type: 'object',
            properties: { approved: { type: 'integer' }, pending: { type: 'integer' }, rejected: { type: 'integer' } },
          },
          avgApprovalHours: { type: 'integer', nullable: true },
          months: {
            type: 'array',
            items: {
              type: 'object',
              properties: { month: { type: 'string', example: '2026-10' }, approvedCents: { type: 'integer' }, count: { type: 'integer' } },
            },
          },
          suppliers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                approvedCents: { type: 'integer' },
                count: { type: 'integer' },
              },
            },
          },
          sites: { type: 'array', items: { type: 'object' } },
          activity: { type: 'array', items: { type: 'object' } },
        },
      },
      CountTotal: { type: 'object', properties: { count: { type: 'integer' }, totalCents: { type: 'integer' } } },
    },
  },
}

export async function registerDocs(app: FastifyInstance) {
  await app.register(swagger, { mode: 'static', specification: { document: document as never } })
  // SWAGGER_UI_DIR só é usado na demo empacotada, onde os arquivos do Swagger UI mudam de lugar
  await app.register(swaggerUi, { routePrefix: '/api/docs', baseDir: process.env.SWAGGER_UI_DIR })
}
