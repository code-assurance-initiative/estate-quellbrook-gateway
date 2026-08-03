import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyBaseLogger, type FastifyError, type FastifyInstance } from 'fastify';
import type { OperatorVerifier } from './auth/operator-auth.js';
import { sendProblem } from './http/problem.js';
import { healthRoutes } from './routes/health-routes.js';
import { ordersRoutes } from './routes/orders-routes.js';
import type { OrdersApi } from './upstream/orders-api.js';
import { UpstreamError } from './upstream/upstream-client.js';

export interface AppDependencies {
  readonly logger: FastifyBaseLogger;
  readonly verifier: OperatorVerifier;
  readonly orders: OrdersApi;
  readonly corsOrigins: readonly string[];
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
    request.log.error({ err: error }, 'unhandled error');
    return sendProblem(reply, 500, 'Something went wrong on our side.');
  });

  healthRoutes(app);
  ordersRoutes(app, dependencies);
  return app;
}
