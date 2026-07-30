import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';

export const issuer = 'https://id.test/realms/operations';
export const audience = 'quellbrook-console';

/** An in-process identity provider: an ES256 key pair generated for the test run, never written anywhere. */
export interface OperatorTokens {
  readonly keys: JWTVerifyGetKey;
  sign(
    subject: string,
    scopes: readonly string[],
    options?: { audience?: string; expiresIn?: string },
  ): Promise<string>;
}

export async function createOperatorTokens(): Promise<OperatorTokens> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256' };
  return {
    keys: createLocalJWKSet({ keys: [jwk] }),
    sign: (subject, scopes, options) =>
      new SignJWT({ scope: scopes.join(' ') })
        .setProtectedHeader({ alg: 'ES256', kid: 'test' })
        .setSubject(subject)
        .setIssuer(issuer)
        .setAudience(options?.audience ?? audience)
        .setIssuedAt()
        .setExpirationTime(options?.expiresIn ?? '10m')
        .sign(privateKey),
  };
}
