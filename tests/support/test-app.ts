import type { FastifyInstance } from 'fastify';
import { pino } from 'pino';
import { buildApp } from '../../src/app.js';
import { createOperatorVerifier } from '../../src/auth/operator-auth.js';
import { createOrdersApi } from '../../src/upstream/orders-api.js';
import { createUpstreamClient } from '../../src/upstream/upstream-client.js';
import { FakeUpstream, fixedToken } from './fake-upstream.js';
import { audience, createOperatorTokens, issuer, type OperatorTokens } from './operator-tokens.js';

export interface TestApp {
  readonly app: FastifyInstance;
  readonly tokens: OperatorTokens;
  readonly orders: FakeUpstream;
  bearer(scopes: readonly string[], subject?: string): Promise<{ authorization: string }>;
}

export async function createTestApp(): Promise<TestApp> {
  const tokens = await createOperatorTokens();
  const orders = new FakeUpstream();
  const logger = pino({ level: 'silent' });
  const client = (name: string, baseUrl: string, upstream: FakeUpstream) =>
    createUpstreamClient({
      name,
      baseUrl,
      timeoutMs: 1_000,
      tokens: fixedToken,
      fetch: upstream.fetch,
      logger,
    });
  const app = await buildApp({
    logger,
    verifier: createOperatorVerifier({ issuer, audience }, tokens.keys),
    orders: createOrdersApi(client('orders', 'http://orders.test', orders)),
    corsOrigins: ['https://ops.test'],
  });
  return {
    app,
    tokens,
    orders,
    bearer: async (scopes, subject = 'operator-17') => ({
      authorization: `Bearer ${await tokens.sign(subject, scopes)}`,
    }),
  };
}
