import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyBaseLogger, type FastifyError, type FastifyInstance } from 'fastify';
import type { OperatorVerifier } from './auth/operator-auth.js';
import { sendProblem } from './http/problem.js';
import { dispatchRoutes } from './routes/dispatch-routes.js';
import { healthRoutes } from './routes/health-routes.js';
import { ordersRoutes } from './routes/orders-routes.js';
import { shipmentRoutes } from './routes/shipment-routes.js';
import type { DispatchApi } from './upstream/dispatch-api.js';
import type { OrdersApi } from './upstream/orders-api.js';
import { UpstreamError } from './upstream/upstream-client.js';

export interface AppDependencies {
  readonly logger: FastifyBaseLogger;
  readonly verifier: OperatorVerifier;
  readonly orders: OrdersApi;
  readonly dispatch: DispatchApi;
  readonly corsOrigins: readonly string[];
  /** Requests per minute and client address; the probes are exempt. */
  readonly rateLimitPerMinute?: number;
}

/** Builds the gateway: security headers, CORS for the console, operator routes and health probes. */
export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: dependencies.logger,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
  });

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: { maxAge: 31_536_000, includeSubDomains: true },
  });
  await app.register(cors, { origin: [...dependencies.corsOrigins], credentials: true });
  await app.register(rateLimit, {
    max: dependencies.rateLimitPerMinute ?? 300,
    timeWindow: '1 minute',
    allowList: (request) => request.url === '/healthz' || request.url === '/readyz',
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof UpstreamError) {
      return sendProblem(
        reply,
        error.failure === 'timeout' ? 504 : 502,
        `The ${error.upstream} service did not answer. Try again in a moment.`,
      );
    }
    if (error.validation) {
      return sendProblem(reply, 400, error.message);
    }
    if (error.statusCode !== undefined && error.statusCode < 500) {
      return sendProblem(reply, error.statusCode, error.message);
    }
    request.log.error({ err: error }, 'unhandled error');
    return sendProblem(reply, 500, 'Something went wrong on our side.');
  });

  healthRoutes(app);
  ordersRoutes(app, dependencies);
  dispatchRoutes(app, dependencies);
  shipmentRoutes(app, dependencies);
  return app;
}
