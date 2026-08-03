import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { remoteKeys } from '../../src/auth/operator-auth.js';
import { sendProblem } from '../../src/http/problem.js';
import { loggerOptions } from '../../src/logger.js';

describe('helpers', () => {
  it('redacts the credentials of incoming requests in logs', () => {
    expect(loggerOptions('info').redact).toEqual([
      'req.headers.authorization',
      'req.headers.cookie',
    ]);
  });

  it('builds a remote key set for the identity provider without fetching it yet', () => {
    expect(typeof remoteKeys('https://id.test/certs')).toBe('function');
  });

  it('gives an unlisted status a generic title', async () => {
    const app = Fastify();
    app.get('/teapot', (_request, reply) => sendProblem(reply, 418, 'short and stout'));

    const response = await app.inject({ method: 'GET', url: '/teapot' });

    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Error',
      status: 418,
      detail: 'short and stout',
    });
  });
});
