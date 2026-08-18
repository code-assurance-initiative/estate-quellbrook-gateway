import type { FastifyInstance } from 'fastify';
import { authenticate, requireScope, type OperatorVerifier } from '../auth/operator-auth.js';
import type { DispatchApi } from '../upstream/dispatch-api.js';
import type { OrdersApi } from '../upstream/orders-api.js';
import { operatorOf, relay } from './orders-routes.js';

export interface ShipmentRouteDependencies {
  readonly verifier: OperatorVerifier;
  readonly orders: OrdersApi;
  readonly dispatch: DispatchApi;
}

/**
 * The shipment view of the console's order page: the order from the order service and, once dispatch has it, the
 * delivery's progress. A consignment that does not exist yet is not an error: `delivery` is null.
 */
export function shipmentRoutes(
  app: FastifyInstance,
  dependencies: ShipmentRouteDependencies,
): void {
  app.get<{ Params: { orderId: string } }>(
    '/api/shipments/:orderId',
    {
      preHandler: [
        authenticate(dependencies.verifier),
        requireScope('orders:read'),
        requireScope('dispatch:read'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['orderId'],
          properties: { orderId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const operatorId = operatorOf(request);
      const [order, consignment] = await Promise.all([
        dependencies.orders.get(operatorId, request.params.orderId),
        dependencies.dispatch.consignmentForOrder(operatorId, request.params.orderId),
      ]);
      if (order.status !== 200) {
        return relay(reply, order);
      }
      return reply.send({
        order: order.body,
        delivery: consignment.status === 200 ? consignment.body : null,
      });
    },
  );
}
