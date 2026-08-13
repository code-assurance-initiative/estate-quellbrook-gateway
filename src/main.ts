import { pino } from 'pino';
import { buildApp } from './app.js';
import { createOperatorVerifier, remoteKeys } from './auth/operator-auth.js';
import { loadConfig } from './config.js';
import { loggerOptions } from './logger.js';
import { createDispatchApi } from './upstream/dispatch-api.js';
import { createOrdersApi } from './upstream/orders-api.js';
import { createServiceTokenSource } from './upstream/service-token.js';
import { createUpstreamClient } from './upstream/upstream-client.js';

const config = loadConfig(process.env);
const logger = pino(loggerOptions(config.logLevel));
const tokens = createServiceTokenSource(config.serviceIdentity, fetch);
const upstream = (name: string, baseUrl: string) =>
  createUpstreamClient({
    name,
    baseUrl,
    timeoutMs: config.upstreams.timeoutMs,
    tokens,
    fetch,
    logger: logger.child({ component: 'upstream' }),
  });

const app = await buildApp({
  logger,
  verifier: createOperatorVerifier(
    config.operatorTokens,
    remoteKeys(config.operatorTokens.jwksUrl),
  ),
  orders: createOrdersApi(upstream('orders', config.upstreams.orders)),
  dispatch: createDispatchApi(upstream('dispatch', config.upstreams.dispatch)),
  corsOrigins: config.corsOrigins,
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });
