import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { json } from '../support/fake-upstream.js';
import { createTestApp, type TestApp } from '../support/test-app.js';

const routeId = '0198f1a2-0000-7000-8000-0000000000a1';
const consignmentId = '0198f1a2-0000-7000-8000-0000000000c1';

describe('dispatch routes', () => {
  let test: TestApp;
  beforeAll(async () => {
    test = await createTestApp();
  });
  afterAll(async () => {
    await test.app.close();
  });

  it('shows the board of a day', async () => {
    test.dispatch.answer(json(200, [{ routeId, zone: 'DK-AAR', stops: [] }]));

    const response = await test.app.inject({
      method: 'GET',
      url: '/api/dispatch/board?date=2026-08-12',
      headers: await test.bearer(['dispatch:read']),
    });

    expect(response.statusCode).toBe(200);
    expect(test.dispatch.calls.at(-1)?.url).toBe('http://dispatch.test/routes?date=2026-08-12');
  });

  it('assigns a consignment and starts a route', async () => {
    test.dispatch.answer(json(200, { routeId }), new Response(null, { status: 204 }));
    const headers = await test.bearer(['dispatch:write'], 'dispatcher-2');

    const assigned = await test.app.inject({
      method: 'POST',
      url: `/api/dispatch/consignments/${consignmentId}/assignment`,
      payload: { serviceDate: '2026-08-12' },
      headers,
    });
    const started = await test.app.inject({
      method: 'POST',
      url: `/api/dispatch/routes/${routeId}/start`,
      headers,
    });

    expect(assigned.statusCode).toBe(200);
    expect(started.statusCode).toBe(204);
    expect(test.dispatch.calls.at(-2)?.body).toEqual({ serviceDate: '2026-08-12' });
    expect(test.dispatch.calls.at(-1)?.headers['x-quellbrook-operator']).toBe('dispatcher-2');
  });

  it('lists the drivers available for the route planner', async () => {
    test.dispatch.answer(json(200, { drivers: [], vehicles: [] }));

    const response = await test.app.inject({
      method: 'GET',
      url: '/api/dispatch/drivers/available?date=2026-08-12&depot=AAR',
      headers: await test.bearer(['dispatch:read']),
    });

    expect(response.statusCode).toBe(200);
    expect(test.dispatch.calls.at(-1)?.url).toBe(
      'http://dispatch.test/drivers/available?date=2026-08-12&depot=AAR',
    );
  });

  it('refuses writes without the write scope and malformed dates', async () => {
    const reader = await test.bearer(['dispatch:read']);

    const start = await test.app.inject({
      method: 'POST',
      url: `/api/dispatch/routes/${routeId}/start`,
      headers: reader,
    });
    const board = await test.app.inject({
      method: 'GET',
      url: '/api/dispatch/board?date=tomorrow',
      headers: reader,
    });

    expect(start.statusCode).toBe(403);
    expect(board.statusCode).toBe(400);
  });
});

describe('shipment view', () => {
  let test: TestApp;
  const orderId = '0198f1a2-0000-7000-8000-000000000001';
  beforeAll(async () => {
    test = await createTestApp();
  });
  afterAll(async () => {
    await test.app.close();
  });

  it('joins the order with its delivery', async () => {
    test.orders.answer(json(200, { id: orderId, status: 'placed' }));
    test.dispatch.answer(json(200, { orderId, status: 'OutForDelivery' }));

    const response = await test.app.inject({
      method: 'GET',
      url: `/api/shipments/${orderId}`,
      headers: await test.bearer(['orders:read', 'dispatch:read']),
    });

    expect(response.json()).toEqual({
      order: { id: orderId, status: 'placed' },
      delivery: { orderId, status: 'OutForDelivery' },
    });
  });

  it('shows no delivery while dispatch has not received the order', async () => {
    test.orders.answer(json(200, { id: orderId }));
    test.dispatch.answer(json(404, {}));

    const response = await test.app.inject({
      method: 'GET',
      url: `/api/shipments/${orderId}`,
      headers: await test.bearer(['orders:read', 'dispatch:read']),
    });

    expect(response.json<{ delivery: unknown }>().delivery).toBeNull();
  });

  it('is not found when the order is not', async () => {
    test.orders.answer(json(404, { status: 404 }));
    test.dispatch.answer(json(404, {}));

    const response = await test.app.inject({
      method: 'GET',
      url: `/api/shipments/${orderId}`,
      headers: await test.bearer(['orders:read', 'dispatch:read']),
    });

    expect(response.statusCode).toBe(404);
  });

  it('needs both read scopes', async () => {
    const response = await test.app.inject({
      method: 'GET',
      url: `/api/shipments/${orderId}`,
      headers: await test.bearer(['orders:read']),
    });

    expect(response.statusCode).toBe(403);
  });
});
