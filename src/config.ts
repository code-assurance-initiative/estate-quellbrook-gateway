import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const environmentSchema = z.object({
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(0).max(65_535).default(8080),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  OIDC_ISSUER: z.url({ protocol: /^https$/ }),
  OIDC_AUDIENCE: z.string().min(1).default('quellbrook-console'),
  OIDC_JWKS_URL: z.url({ protocol: /^https$/ }),
  TOKEN_URL: z.url({ protocol: /^https$/ }),
  GATEWAY_CLIENT_ID: z.string().min(1).default('quellbrook-gateway'),
  GATEWAY_CLIENT_SECRET: z.string().min(1),
  ORDERS_API_URL: z.url(),
  DISPATCH_API_URL: z.url(),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  CORS_ORIGINS: z.string().min(1).default('https://ops.quellbrook.example'),
});

export type LogLevel = (typeof logLevels)[number];

export interface GatewayConfig {
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly operatorTokens: {
    readonly issuer: string;
    readonly audience: string;
    readonly jwksUrl: string;
  };
  readonly serviceIdentity: {
    readonly tokenUrl: string;
    readonly clientId: string;
    readonly clientSecret: string;
  };
  readonly upstreams: {
    readonly orders: string;
    readonly dispatch: string;
    readonly timeoutMs: number;
  };
  readonly corsOrigins: readonly string[];
}

export class ConfigurationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid configuration: ${problems.join('; ')}`);
    this.name = 'ConfigurationError';
  }
}

/** Reads and validates the gateway's configuration from the environment. Values are never echoed in errors. */
export function loadConfig(environment: NodeJS.ProcessEnv): GatewayConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new ConfigurationError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const env = parsed.data;
  return {
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    operatorTokens: {
      issuer: env.OIDC_ISSUER,
      audience: env.OIDC_AUDIENCE,
      jwksUrl: env.OIDC_JWKS_URL,
    },
    serviceIdentity: {
      tokenUrl: env.TOKEN_URL,
      clientId: env.GATEWAY_CLIENT_ID,
      clientSecret: env.GATEWAY_CLIENT_SECRET,
    },
    upstreams: {
      orders: env.ORDERS_API_URL,
      dispatch: env.DISPATCH_API_URL,
      timeoutMs: env.UPSTREAM_TIMEOUT_MS,
    },
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  };
}
