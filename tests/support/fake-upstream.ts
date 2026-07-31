export interface RecordedCall {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

type Answer = Response | Error | ((call: RecordedCall) => Response | Error);

/** A fetch implementation that records calls and answers from a queue (or a fixed answer), with no network. */
export class FakeUpstream {
  readonly calls: RecordedCall[] = [];
  private readonly answers: Answer[] = [];
  private fallback: Answer = json(200, {});

  readonly fetch: typeof fetch = (input, init) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : init?.body;
    const url = input instanceof Request ? input.url : input.toString();
    const call: RecordedCall = { url, method: init?.method ?? 'GET', headers, body };
    this.calls.push(call);
    const answer = this.answers.shift() ?? this.fallback;
    const result = typeof answer === 'function' ? answer(call) : answer;
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result.clone());
  };

  answer(...answers: Answer[]): this {
    this.answers.push(...answers);
    return this;
  }

  always(answer: Answer): this {
    this.fallback = answer;
    return this;
  }
}

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export const fixedToken = { token: () => Promise.resolve('service-token-for-tests') };
