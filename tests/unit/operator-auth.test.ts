import { describe, expect, it } from 'vitest';
import { createOperatorVerifier } from '../../src/auth/operator-auth.js';
import { audience, createOperatorTokens, issuer } from '../support/operator-tokens.js';

describe('operator tokens', () => {
  it('accepts a token of the identity provider for the console and reads subject and scopes', async () => {
    const tokens = await createOperatorTokens();
    const verifier = createOperatorVerifier({ issuer, audience }, tokens.keys);

    const operator = await verifier.verify(
      await tokens.sign('operator-4', ['orders:read', 'dispatch:read']),
    );

    expect(operator?.id).toBe('operator-4');
    expect([...(operator?.scopes ?? [])]).toEqual(['orders:read', 'dispatch:read']);
  });

  it('refuses a token for another audience, an expired one and one signed by someone else', async () => {
    const tokens = await createOperatorTokens();
    const other = await createOperatorTokens();
    const verifier = createOperatorVerifier({ issuer, audience }, tokens.keys);

    expect(
      await verifier.verify(await tokens.sign('operator-4', [], { audience: 'another-app' })),
    ).toBeUndefined();
    expect(
      await verifier.verify(await tokens.sign('operator-4', [], { expiresIn: '-5m' })),
    ).toBeUndefined();
    expect(await verifier.verify(await other.sign('operator-4', []))).toBeUndefined();
  });
});
