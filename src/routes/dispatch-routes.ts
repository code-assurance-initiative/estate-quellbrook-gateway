import type { FastifyInstance } from 'fastify';
import { authenticate, requireScope, type OperatorVerifier } from '../auth/operator-auth.js';
import type { DispatchApi } from '../upstream/dispatch-api.js';
import { operatorOf, relay } from './orders-routes.js';

export interface DispatchRouteDependencies {
  readonly verifier: OperatorVerifier;
  readonly dispatch: DispatchApi;
}

const uuid = { type: 'string', format: 'uuid' } as const;
const date = { type: 'string', format: 'date' } as const;

/** The dispatch board: routes of a day, assigning consignments, starting routes, the route planner's drivers. */
export function dispatchRoutes(
  app: FastifyInstance,
  dependencies: DispatchRouteDependencies,
): void {
  const signedIn = authenticate(dependencies.verifier);

  app.get<{ Querystring: { date: string } }>(
    '/api/dispatch/board',
    {
      preHandler: [signedIn, requireScope('dispatch:read')],
      schema: { querystring: { type: 'object', required: ['date'], properties: { date } } },
    },
    async (request, reply) =>
      relay(reply, await dependencies.dispatch.board(operatorOf(request), request.query.date)),
  );

  app.post<{ Params: { consignmentId: string }; Body: { serviceDate: string } }>(
    '/api/dispatch/consignments/:consignmentId/assignment',
    {
      preHandler: [signedIn, requireScope('dispatch:write')],
      schema: {
        params: {
          type: 'object',
          required: ['consignmentId'],
          properties: { consignmentId: uuid },
        },
        body: {
          type: 'object',
          required: ['serviceDate'],
          additionalProperties: false,
          properties: { serviceDate: date },
        },
      },
    },
    async (request, reply) =>
      relay(
        reply,
        await dependencies.dispatch.assign(
          operatorOf(request),
          request.params.consignmentId,
          request.body.serviceDate,
        ),
      ),
  );

  app.post<{ Params: { routeId: string } }>(
    '/api/dispatch/routes/:routeId/start',
    {
      preHandler: [signedIn, requireScope('dispatch:write')],
      schema: { params: { type: 'object', required: ['routeId'], properties: { routeId: uuid } } },
    },
    async (request, reply) =>
      relay(
        reply,
        await dependencies.dispatch.startRoute(operatorOf(request), request.params.routeId),
      ),
  );

  app.get<{ Querystring: { date: string; depot: string } }>(
    '/api/dispatch/drivers/available',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['date', 'depot'],
          properties: { date, depot: { type: 'string', pattern: '^[A-Z]{3}$' } },
        },
      },
    },
    async (request, reply) => {
      const operatorId = request.operator?.id ?? 'anonymous';
      return relay(
        reply,
        await dependencies.dispatch.availableDrivers(
          operatorId,
          request.query.date,
          request.query.depot,
        ),
      );
    },
  );
}
