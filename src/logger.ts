import type { LoggerOptions } from 'pino';
import type { LogLevel } from './config.js';

/**
 * Structured JSON logs for Fastify's pino logger. Credentials in the incoming request's headers are redacted before
 * a line is written.
 */
export function loggerOptions(level: LogLevel): LoggerOptions {
  return {
    level,
    base: { service: 'quellbrook-gateway' },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  };
}
