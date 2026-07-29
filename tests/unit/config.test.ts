import { describe, expect, it } from 'vitest';
import { ConfigurationError, loadConfig } from '../../src/config.js';

const complete = {
  OIDC_ISSUER: 'https://id.quellbrook.example/realms/operations',
  OIDC_JWKS_URL: 'https://id.quellbrook.example/realms/operations/protocol/openid-connect/certs',
  TOKEN_URL: 'https://id.quellbrook.example/realms/operations/protocol/openid-connect/token',
  GATEWAY_CLIENT_SECRET: 'from-the-environment',
  ORDERS_API_URL: 'http://quellbrook-orders.quellbrook-orders.svc.cluster.local',
  DISPATCH_API_URL: 'http://quellbrook-dispatch.quellbrook-dispatch.svc.cluster.local',
};

describe('configuration', () => {
  it('reads a complete environment with defaults for the rest', () => {
    const config = loadConfig({
      ...complete,
      CORS_ORIGINS: 'https://a.example, https://b.example',
    });

    expect(config.port).toBe(8080);
    expect(config.operatorTokens.audience).toBe('quellbrook-console');
    expect(config.upstreams.timeoutMs).toBe(5_000);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });

  it('refuses an issuer that is not https and names the problem without the value', () => {
    const attempt = () => loadConfig({ ...complete, OIDC_ISSUER: 'http://id.example' });

    expect(attempt).toThrow(ConfigurationError);
    expect(attempt).toThrow(/OIDC_ISSUER/);
  });

  it('refuses to start without the client secret', () => {
    const withoutSecret: Partial<typeof complete> = { ...complete };
    delete withoutSecret.GATEWAY_CLIENT_SECRET;

    expect(() => loadConfig(withoutSecret)).toThrow(/GATEWAY_CLIENT_SECRET/);
  });
});
