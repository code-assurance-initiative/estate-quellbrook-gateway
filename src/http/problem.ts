import type { FastifyReply } from 'fastify';

/** Sends an RFC 9457 problem details response. */
export function sendProblem(reply: FastifyReply, status: number, detail: string): FastifyReply {
  return reply
    .code(status)
    .type('application/problem+json')
    .send({ type: 'about:blank', title: titleFor(status), status, detail });
}

function titleFor(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 502:
      return 'Bad Gateway';
    case 504:
      return 'Gateway Timeout';
    default:
      return 'Error';
  }
}
