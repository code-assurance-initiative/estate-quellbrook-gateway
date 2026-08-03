import type { FastifyInstance } from 'fastify';

/** Liveness and readiness for the kubelet. They report a status word and nothing else, and need no sign-in. */
export function healthRoutes(app: FastifyInstance): void {
  app.get('/healthz', (_request, reply) => reply.send({ status: 'ok' }));
  app.get('/readyz', (_request, reply) => reply.send({ status: 'ready' }));
}
