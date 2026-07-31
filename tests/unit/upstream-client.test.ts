import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { createUpstreamClient, UpstreamError } from '../../src/upstream/upstream-client.js';
import { FakeUpstream, fixedToken } from '../support/fake-upstream.js';

const client = (upstream: FakeUpstream) =>
  createUpstreamClient({
    name: 'orders',
    baseUrl: 'http://orders.test',
    timeoutMs: 1_000,
    tokens: fixedToken,
    fetch: upstream.fetch,
    logger: pino({ level: 'silent' }),
  });

describe('upstream client', () => {
  it('reports an unreachable service as unavailable', async () => {
    const upstream = new FakeUpstream().answer(new TypeError('fetch failed'));

    await expect(
      client(upstream).send({ method: 'GET', path: '/orders', operatorId: 'operator-4' }),
    ).rejects.toMatchObject({
      failure: 'unavailable',
    });
  });

  it('sends JSON bodies and returns an empty body as undefined', async () => {
    const upstream = new FakeUpstream().answer(new Response(null, { status: 204 }));

    const response = await client(upstream).send({
      method: 'POST',
      path: '/orders/1/cancellation',
      operatorId: 'operator-4',
      body: { reason: 'x' },
    });

    expect(response).toEqual({ status: 204, body: undefined });
    expect(upstream.calls[0]?.headers['content-type']).toBe('application/json');
  });

  it('names the upstream and the status in its errors', () => {
    expect(new UpstreamError('dispatch', 'error', 503).message).toBe('dispatch error (503)');
  });
});
