import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { json } from '../support/fake-upstream.js';
import { createTestApp, type TestApp } from '../support/test-app.js';

const order = {
  customerAccountId: 'QB-104233',
  serviceLevel: 'standard',
  consignee: {
    name: 'Halden Bikes ApS',
    line1: 'Søndergade 12',
    postalCode: '8000',
    city: 'Aarhus C',
    countryCode: 'DK',
  },
  parcels: [{ weightGrams: 2400, lengthCm: 40, widthCm: 30, heightCm: 20 }],
};

describe('order routes', () => {
  let test: TestApp;
  beforeAll(async () => {
    test = await createTestApp();
  });
  afterAll(async () => {
    await test.app.close();
  });

  it('lists orders through the order service with the service token and the operator id', async () => {
    test.orders.answer(json(200, { items: [], page: 2, pageSize: 10, totalCount: 0 }));

    const response = await test.app.inject({
      method: 'GET',
      url: '/api/orders?page=2&pageSize=10',
      headers: await test.bearer(['orders:read'], 'operator-4'),
    });

    expect(response.statusCode).toBe(200);
    const call = test.orders.calls.at(-1);
    expect(call?.url).toBe('http://orders.test/orders?page=2&pageSize=10');
    expect(call?.headers.authorization).toBe('Bearer service-token-for-tests');
    expect(call?.headers['x-quellbrook-operator']).toBe('operator-4');
  });

  it('places an order and points Location at the gateway path', async () => {
    test.orders.answer(
      json(
        201,
        { id: '0198f1a2-0000-7000-8000-000000000001' },
        { location: '/orders/0198f1a2-0000-7000-8000-000000000001' },
      ),
    );

    const response = await test.app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: order,
      headers: await test.bearer(['orders:write']),
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers.location).toBe('/api/orders/0198f1a2-0000-7000-8000-000000000001');
    expect(test.orders.calls.at(-1)?.body).toEqual(order);
  });

  it('relays the order service answer for one order, including its 404', async () => {
    test.orders.answer(
      json(
        404,
        { title: 'Not Found', status: 404 },
        { 'content-type': 'application/problem+json' },
      ),
    );

    const response = await test.app.inject({
      method: 'GET',
      url: '/api/orders/0198f1a2-0000-7000-8000-000000000009',
      headers: await test.bearer(['orders:read']),
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  it('refuses a malformed order before calling the order service', async () => {
    const calls = test.orders.calls.length;

    const response = await test.app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { ...order, serviceLevel: 'overnight' },
      headers: await test.bearer(['orders:write']),
    });

    expect(response.statusCode).toBe(400);
    expect(test.orders.calls.length).toBe(calls);
  });

  it('refuses an order id that is not a UUID', async () => {
    const response = await test.app.inject({
      method: 'GET',
      url: '/api/orders/..%2Fadmin',
      headers: await test.bearer(['orders:read']),
    });

    expect(response.statusCode).toBe(400);
  });

  it('needs a valid operator token and the right scope', async () => {
    const anonymous = await test.app.inject({ method: 'GET', url: '/api/orders' });
    const forged = await test.app.inject({
      method: 'GET',
      url: '/api/orders',
      headers: { authorization: 'Bearer not-a-token' },
    });
    const wrongScope = await test.app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: order,
      headers: await test.bearer(['orders:read']),
    });

    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.headers['www-authenticate']).toBe('Bearer');
    expect(forged.statusCode).toBe(401);
    expect(wrongScope.statusCode).toBe(403);
  });

  it('turns an unavailable order service into 502 and a slow one into 504', async () => {
    test.orders.answer(json(503, {}), new DOMException('timed out', 'TimeoutError'));

    const failed = await test.app.inject({
      method: 'GET',
      url: '/api/orders',
      headers: await test.bearer(['orders:read']),
    });
    const slow = await test.app.inject({
      method: 'GET',
      url: '/api/orders',
      headers: await test.bearer(['orders:read']),
    });

    expect(failed.statusCode).toBe(502);
    expect(slow.statusCode).toBe(504);
  });
});
