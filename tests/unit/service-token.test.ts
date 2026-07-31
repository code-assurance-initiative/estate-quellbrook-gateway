import { describe, expect, it } from 'vitest';
import { createServiceTokenSource } from '../../src/upstream/service-token.js';
import { FakeUpstream, json } from '../support/fake-upstream.js';

const identity = {
  tokenUrl: 'https://id.test/token',
  clientId: 'quellbrook-gateway',
  clientSecret: 'unit-test-client-secret',
};

describe('service token', () => {
  it('asks for client credentials once and reuses the token until shortly before it expires', async () => {
    const idp = new FakeUpstream().answer(
      json(200, { access_token: 'first', expires_in: 300 }),
      json(200, { access_token: 'second', expires_in: 300 }),
    );
    let now = 0;
    const source = createServiceTokenSource(identity, idp.fetch, () => now);

    const first = await source.token();
    now = 200_000;
    const reused = await source.token();
    now = 241_000;
    const renewed = await source.token();

    expect([first, reused, renewed]).toEqual(['first', 'first', 'second']);
    expect(idp.calls).toHaveLength(2);
    expect(String(idp.calls[0]?.body)).toContain('grant_type=client_credentials');
  });

  it('fails when the identity provider refuses or answers without a token', async () => {
    const refusing = createServiceTokenSource(
      identity,
      new FakeUpstream().always(json(401, {})).fetch,
    );
    const empty = createServiceTokenSource(
      identity,
      new FakeUpstream().always(json(200, {})).fetch,
    );

    await expect(refusing.token()).rejects.toThrow(/401/);
    await expect(empty.token()).rejects.toThrow(/without an access token/);
  });
});
