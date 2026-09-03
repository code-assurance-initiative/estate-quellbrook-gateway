import type { UpstreamClient, UpstreamResponse } from './upstream-client.js';

export interface OrderListQuery {
  readonly page: number;
  readonly pageSize: number;
}

/** The order service's HTTP API (estate-quellbrook-orders, contracts/openapi.yaml). */
export interface OrdersApi {
  list(operatorId: string, query: OrderListQuery): Promise<UpstreamResponse>;
  get(operatorId: string, orderId: string): Promise<UpstreamResponse>;
  /** A retried submission carries the same idempotency key, and the order service places one order for it. */
  place(operatorId: string, order: unknown, idempotencyKey?: string): Promise<UpstreamResponse>;
  cancel(operatorId: string, orderId: string, reason: string): Promise<UpstreamResponse>;
}

export function createOrdersApi(client: UpstreamClient): OrdersApi {
  return {
    list(operatorId, query) {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      return client.send({ method: 'GET', path: `/orders?${params.toString()}`, operatorId });
    },
    get(operatorId, orderId) {
      return client.send({
        method: 'GET',
        path: `/orders/${encodeURIComponent(orderId)}`,
        operatorId,
      });
    },
    place(operatorId, order, idempotencyKey) {
      return client.send({
        method: 'POST',
        path: '/orders',
        operatorId,
        body: order,
        ...(idempotencyKey === undefined ? {} : { headers: { 'idempotency-key': idempotencyKey } }),
      });
    },
    cancel(operatorId, orderId, reason) {
      return client.send({
        method: 'POST',
        path: `/orders/${encodeURIComponent(orderId)}/cancellation`,
        operatorId,
        body: { reason },
      });
    },
  };
}
