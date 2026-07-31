import type { BaseLogger } from 'pino';
import type { ServiceTokenSource } from './service-token.js';

export interface UpstreamRequest {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  /** The operator on whose behalf the gateway calls; the services record it on what the operator changes. */
  readonly operatorId: string;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface UpstreamResponse {
  readonly status: number;
  readonly body: unknown;
  readonly contentType?: string;
  readonly location?: string;
}

export type UpstreamFailure = 'timeout' | 'unavailable' | 'error';

/** The upstream did not answer usefully: it timed out, could not be reached, or failed with a 5xx. */
export class UpstreamError extends Error {
  constructor(
    readonly upstream: string,
    readonly failure: UpstreamFailure,
    readonly status?: number,
  ) {
    super(`${upstream} ${failure}${status === undefined ? '' : ` (${status})`}`);
    this.name = 'UpstreamError';
  }
}

export interface UpstreamClient {
  send(request: UpstreamRequest): Promise<UpstreamResponse>;
}

export interface UpstreamClientOptions {
  readonly name: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly tokens: ServiceTokenSource;
  readonly fetch: typeof fetch;
  readonly logger: BaseLogger;
}

/**
 * Calls one downstream service with the gateway's service token. Answers below 500 are relayed to the caller as they
 * are (a 404 or a validation problem is the service's answer); timeouts, unreachable services and 5xx answers become
 * an {@link UpstreamError}.
 */
export function createUpstreamClient(options: UpstreamClientOptions): UpstreamClient {
  return {
    async send(request) {
      const url = new URL(request.path, options.baseUrl);
      const headers: Record<string, string> = {
        accept: 'application/json',
        authorization: `Bearer ${await options.tokens.token()}`,
        'x-quellbrook-operator': request.operatorId,
        ...request.headers,
      };
      if (request.body !== undefined) {
        headers['content-type'] = 'application/json';
      }
      let response: Response;
      try {
        response = await options.fetch(url, {
          method: request.method,
          headers,
          body: request.body === undefined ? null : JSON.stringify(request.body),
          signal: AbortSignal.timeout(options.timeoutMs),
        });
      } catch (error) {
        const failure: UpstreamFailure =
          error instanceof DOMException && error.name === 'TimeoutError'
            ? 'timeout'
            : 'unavailable';
        options.logger.warn(
          { upstream: options.name, method: request.method, path: url.pathname, failure },
          'upstream call failed',
        );
        throw new UpstreamError(options.name, failure);
      }
      if (response.status >= 500) {
        options.logger.warn(
          {
            upstream: options.name,
            method: request.method,
            path: url.pathname,
            status: response.status,
          },
          'upstream call failed',
        );
        throw new UpstreamError(options.name, 'error', response.status);
      }
      const text = await response.text();
      return {
        status: response.status,
        body: text.length === 0 ? undefined : (JSON.parse(text) as unknown),
        ...optional('contentType', response.headers.get('content-type')),
        ...optional('location', response.headers.get('location')),
      };
    },
  };
}

function optional<K extends string>(key: K, value: string | null): Partial<Record<K, string>> {
  return value === null ? {} : ({ [key]: value } as Record<K, string>);
}
