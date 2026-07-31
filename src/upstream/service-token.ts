/** Obtains and caches the gateway's own access token for the downstream services (OAuth 2.0 client credentials). */
export interface ServiceTokenSource {
  token(): Promise<string>;
}

export interface ServiceIdentity {
  readonly tokenUrl: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

const refreshMarginMs = 60_000;
const scopes = 'orders:read orders:write dispatch:read dispatch:write';

export function createServiceTokenSource(
  identity: ServiceIdentity,
  fetchImpl: typeof fetch,
  now: () => number = Date.now,
): ServiceTokenSource {
  let cached: { value: string; expiresAt: number } | undefined;
  let pending: Promise<string> | undefined;

  async function fetchToken(): Promise<string> {
    const response = await fetchImpl(identity.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: identity.clientId,
        client_secret: identity.clientSecret,
        scope: scopes,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(
        `The identity provider refused the gateway's client credentials (${response.status}).`,
      );
    }
    const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== 'string' || typeof body.expires_in !== 'number') {
      throw new Error('The identity provider answered without an access token.');
    }
    cached = {
      value: body.access_token,
      expiresAt: now() + body.expires_in * 1_000 - refreshMarginMs,
    };
    return body.access_token;
  }

  return {
    async token() {
      if (cached && cached.expiresAt > now()) {
        return cached.value;
      }
      pending ??= fetchToken().finally(() => {
        pending = undefined;
      });
      return pending;
    },
  };
}
