import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../support/test-app.js';

describe('platform', () => {
  let test: TestApp;
  beforeAll(async () => {
    test = await createTestApp();
  });
  afterAll(async () => {
    await test.app.close();
  });

  it.each(['/healthz', '/readyz'])('answers %s without a token', async (url) => {
    const response = await test.app.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(200);
  });

  it('sends security headers', async () => {
    const response = await test.app.inject({ method: 'GET', url: '/healthz' });

    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('allows the console origin with credentials', async () => {
    const response = await test.app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'https://ops.test' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://ops.test');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('limits the requests of one client address, but not the probes', async () => {
    const limited = await createTestApp({ rateLimitPerMinute: 2 });
    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) {
      statuses.push((await limited.app.inject({ method: 'GET', url: '/api/orders' })).statusCode);
    }
    const probe = await limited.app.inject({ method: 'GET', url: '/healthz' });
    await limited.app.close();

    expect(statuses).toEqual([401, 401, 429]);
    expect(probe.statusCode).toBe(200);
  });

  it('answers an unexpected failure with a generic problem', async () => {
    const fresh = await createTestApp();
    fresh.app.get('/boom', () => {
      throw new Error('kaboom');
    });

    const response = await fresh.app.inject({ method: 'GET', url: '/boom' });
    await fresh.app.close();

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('kaboom');
  });
});
