import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticate, requireScope, type OperatorVerifier } from '../auth/operator-auth.js';
import type { OrdersApi } from '../upstream/orders-api.js';
import type { UpstreamResponse } from '../upstream/upstream-client.js';

export interface OrdersRouteDependencies {
  readonly verifier: OperatorVerifier;
  readonly orders: OrdersApi;
}

const uuid = { type: 'string', format: 'uuid' } as const;

const orderBody = {
  type: 'object',
  required: ['customerAccountId', 'serviceLevel', 'consignee', 'parcels'],
  additionalProperties: false,
  properties: {
    customerAccountId: { type: 'string', pattern: '^QB-[0-9]{4,12}$' },
    serviceLevel: { type: 'string', enum: ['standard', 'express'] },
    consignee: {
      type: 'object',
      required: ['name', 'line1', 'postalCode', 'city', 'countryCode'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        line1: { type: 'string', minLength: 1, maxLength: 100 },
        line2: { type: 'string', maxLength: 100 },
        postalCode: { type: 'string', minLength: 1, maxLength: 10 },
        city: { type: 'string', minLength: 1, maxLength: 60 },
        countryCode: { type: 'string', enum: ['DK', 'SE', 'NO', 'DE', 'NL'] },
        email: { type: 'string', maxLength: 254 },
        phone: { type: 'string', maxLength: 20 },
      },
    },
    parcels: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        required: ['weightGrams', 'lengthCm', 'widthCm', 'heightCm'],
        additionalProperties: false,
        properties: {
          weightGrams: { type: 'integer', minimum: 1, maximum: 31_500 },
          lengthCm: { type: 'integer', minimum: 1, maximum: 175 },
          widthCm: { type: 'integer', minimum: 1, maximum: 175 },
          heightCm: { type: 'integer', minimum: 1, maximum: 175 },
        },
      },
    },
  },
} as const;

/** Customer service: list, read and place orders. */
export function ordersRoutes(app: FastifyInstance, dependencies: OrdersRouteDependencies): void {
  const signedIn = authenticate(dependencies.verifier);

  app.get<{ Querystring: { page: number; pageSize: number } }>(
    '/api/orders',
    {
      preHandler: [signedIn, requireScope('orders:read')],
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        },
      },
    },
    async (request, reply) =>
      relay(reply, await dependencies.orders.list(operatorOf(request), request.query)),
  );

  app.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId',
    {
      preHandler: [signedIn, requireScope('orders:read')],
      schema: { params: { type: 'object', required: ['orderId'], properties: { orderId: uuid } } },
    },
    async (request, reply) =>
      relay(reply, await dependencies.orders.get(operatorOf(request), request.params.orderId)),
  );

  app.post(
    '/api/orders',
    { preHandler: [signedIn, requireScope('orders:write')], schema: { body: orderBody } },
    async (request, reply) =>
      relay(reply, await dependencies.orders.place(operatorOf(request), request.body)),
  );

  app.post<{ Params: { orderId: string }; Body: { reason: string } }>(
    '/api/orders/:orderId/cancellation',
    {
      preHandler: [signedIn, requireScope('orders:write')],
      schema: {
        params: { type: 'object', required: ['orderId'], properties: { orderId: uuid } },
        body: {
          type: 'object',
          required: ['reason'],
          additionalProperties: false,
          properties: { reason: { type: 'string', minLength: 1, maxLength: 200 } },
        },
      },
    },
    async (request, reply) =>
      relay(
        reply,
        await dependencies.orders.cancel(
          operatorOf(request),
          request.params.orderId,
          request.body.reason,
        ),
      ),
  );
}

export function operatorOf(request: { operator?: { id: string } }): string {
  if (!request.operator) {
    throw new Error('Route registered without the authenticate pre-handler.');
  }
  return request.operator.id;
}

/** Relays a downstream answer; a Location into the service is rewritten to the gateway's /api path. */
export function relay(reply: FastifyReply, response: UpstreamResponse): FastifyReply {
  void reply.code(response.status);
  if (response.contentType) {
    void reply.type(response.contentType);
  }
  if (response.location?.startsWith('/')) {
    void reply.header('location', `/api${response.location}`);
  }
  return response.body === undefined ? reply.send() : reply.send(response.body);
}
