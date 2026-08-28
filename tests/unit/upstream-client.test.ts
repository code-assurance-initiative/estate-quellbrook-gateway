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
    retries: 0,
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

describe('retries', () => {
  const retrying = (upstream: FakeUpstream, delays: number[]) =>
    createUpstreamClient({
      name: 'dispatch',
      baseUrl: 'http://dispatch.test',
      timeoutMs: 1_000,
      tokens: fixedToken,
      fetch: upstream.fetch,
      logger: pino({ level: 'silent' }),
      sleep: (milliseconds) => {
        delays.push(milliseconds);
        return Promise.resolve();
      },
    });

  it('retries a read after a 503 and an unreachable upstream, backing off', async () => {
    const upstream = new FakeUpstream().answer(
      new Response(null, { status: 503 }),
      new TypeError('fetch failed'),
      new Response('{"ok":true}', { status: 200 }),
    );
    const delays: number[] = [];

    const response = await retrying(upstream, delays).send({
      method: 'GET',
      path: '/routes?date=2026-08-26',
      operatorId: 'dispatcher-2',
    });

    expect(response.body).toEqual({ ok: true });
    expect(upstream.calls).toHaveLength(3);
    expect(delays).toEqual([100, 200]);
  });

  it('gives up after the last attempt', async () => {
    const upstream = new FakeUpstream().always(new Response(null, { status: 502 }));

    await expect(
      retrying(upstream, []).send({ method: 'GET', path: '/routes', operatorId: 'dispatcher-2' }),
    ).rejects.toMatchObject({ status: 502 });
    expect(upstream.calls).toHaveLength(3);
  });

  it('never retries a write or a 500', async () => {
    const writes = new FakeUpstream().always(new Response(null, { status: 503 }));
    const failing = new FakeUpstream().always(new Response(null, { status: 500 }));

    await expect(
      retrying(writes, []).send({
        method: 'POST',
        path: '/routes/1/start',
        operatorId: 'dispatcher-2',
      }),
    ).rejects.toBeInstanceOf(UpstreamError);
    await expect(
      retrying(failing, []).send({ method: 'GET', path: '/routes', operatorId: 'dispatcher-2' }),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(writes.calls).toHaveLength(1);
    expect(failing.calls).toHaveLength(1);
  });
});

describe('failure logging', () => {
  it('logs the failed request with its upstream, status and attempt', async () => {
    const lines: string[] = [];
    const logger = pino({ level: 'warn' }, { write: (line: string) => lines.push(line) });
    const upstream = new FakeUpstream().always(new Response(null, { status: 503 }));
    const client = createUpstreamClient({
      name: 'orders',
      baseUrl: 'http://orders.test',
      timeoutMs: 1_000,
      tokens: fixedToken,
      fetch: upstream.fetch,
      logger,
      retries: 0,
    });

    await expect(
      client.send({ method: 'GET', path: '/orders', operatorId: 'operator-4' }),
    ).rejects.toBeInstanceOf(UpstreamError);

    const logged = JSON.parse(lines[0] ?? '{}') as {
      upstream?: string;
      status?: number;
      attempt?: number;
      request?: { url?: string };
    };
    expect(logged).toMatchObject({
      upstream: 'orders',
      status: 503,
      attempt: 1,
      request: { url: 'http://orders.test/orders' },
    });
  });
});
