import type { UpstreamClient, UpstreamResponse } from './upstream-client.js';

/** The dispatch service's HTTP API (estate-quellbrook-dispatch, contracts/openapi.yaml). */
export interface DispatchApi {
  board(operatorId: string, date: string): Promise<UpstreamResponse>;
  assign(operatorId: string, consignmentId: string, serviceDate: string): Promise<UpstreamResponse>;
  startRoute(operatorId: string, routeId: string): Promise<UpstreamResponse>;
  availableDrivers(operatorId: string, date: string, depot: string): Promise<UpstreamResponse>;
  consignmentForOrder(operatorId: string, orderId: string): Promise<UpstreamResponse>;
}

export function createDispatchApi(client: UpstreamClient): DispatchApi {
  return {
    board(operatorId, date) {
      return client.send({
        method: 'GET',
        path: `/routes?${new URLSearchParams({ date }).toString()}`,
        operatorId,
      });
    },
    assign(operatorId, consignmentId, serviceDate) {
      return client.send({
        method: 'POST',
        path: `/consignments/${encodeURIComponent(consignmentId)}/assignment`,
        operatorId,
        body: { serviceDate },
      });
    },
    startRoute(operatorId, routeId) {
      return client.send({
        method: 'POST',
        path: `/routes/${encodeURIComponent(routeId)}/start`,
        operatorId,
      });
    },
    availableDrivers(operatorId, date, depot) {
      const query = new URLSearchParams({ date, depot }).toString();
      return client.send({ method: 'GET', path: `/drivers/available?${query}`, operatorId });
    },
    consignmentForOrder(operatorId, orderId) {
      return client.send({
        method: 'GET',
        path: `/consignments/by-order/${encodeURIComponent(orderId)}`,
        operatorId,
      });
    },
  };
}
