import type { UpstreamClient, UpstreamResponse } from './upstream-client.js';

export interface OrderListQuery {
  readonly page: number;
  readonly pageSize: number;
}

/** The order service's HTTP API (estate-quellbrook-orders, contracts/openapi.yaml). */
export interface OrdersApi {
  list(operatorId: string, query: OrderListQuery): Promise<UpstreamResponse>;
  get(operatorId: string, orderId: string): Promise<UpstreamResponse>;
  place(operatorId: string, order: unknown): Promise<UpstreamResponse>;
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
    place(operatorId, order) {
      return client.send({ method: 'POST', path: '/orders', operatorId, body: order });
    },
  };
}
