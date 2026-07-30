import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { sendProblem } from '../http/problem.js';

export interface Operator {
  readonly id: string;
  readonly scopes: ReadonlySet<string>;
}

declare module 'fastify' {
  interface FastifyRequest {
    operator?: Operator;
  }
}

export interface OperatorVerifier {
  /** The operator, or undefined when the token is malformed, forged, expired or meant for someone else. */
  verify(token: string): Promise<Operator | undefined>;
}

export interface OperatorTokenSettings {
  readonly issuer: string;
  readonly audience: string;
}

/**
 * Operators sign in at the identity provider through the ingress's authentication proxy, which forwards their access
 * token. The gateway verifies it again (signature, issuer, audience, expiry) before trusting any claim in it.
 */
export function createOperatorVerifier(
  settings: OperatorTokenSettings,
  keys: JWTVerifyGetKey,
): OperatorVerifier {
  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, keys, {
          issuer: settings.issuer,
          audience: settings.audience,
          algorithms: ['RS256', 'ES256'],
          requiredClaims: ['sub', 'exp'],
          clockTolerance: 30,
        });
        return toOperator(payload);
      } catch (error) {
        if (error instanceof errors.JOSEError) {
          return undefined;
        }
        throw error;
      }
    },
  };
}

export function remoteKeys(jwksUrl: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 30_000, cacheMaxAge: 600_000 });
}

/** Requires a valid operator token and keeps the operator on the request. */
export function authenticate(verifier: OperatorVerifier): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = bearerToken(request.headers.authorization);
    const operator = token === undefined ? undefined : await verifier.verify(token);
    if (!operator) {
      void reply.header('WWW-Authenticate', 'Bearer');
      return sendProblem(reply, 401, 'Sign in to use the operations console.');
    }
    request.operator = operator;
  };
}

/** Requires the authenticated operator to hold a scope. Register after `authenticate`. */
export function requireScope(scope: string): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.operator?.scopes.has(scope)) {
      return sendProblem(reply, 403, `This needs the ${scope} permission.`);
    }
  };
}

function bearerToken(header: string | undefined): string | undefined {
  const [scheme, token, ...rest] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token && rest.length === 0 ? token : undefined;
}

function toOperator(payload: JWTPayload): Operator {
  const scope = typeof payload.scope === 'string' ? payload.scope : '';
  return {
    id: payload.sub ?? '',
    scopes: new Set(scope.split(' ').filter((value) => value.length > 0)),
  };
}
