import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createSakayServer, startServer } from '../server.js';
import { RoutingProviderError } from '../server/routing-provider.js';

async function withServer(options, run) {
  const server = createSakayServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function providers({ routeError } = {}) {
  return {
    geocodingGateway: {
      async search(query) { return [{ placeId: 'search-1', label: query, latitude: 14.6, longitude: 121 }]; },
      async reverse(latitude, longitude) { return [{ placeId: 'reverse-1', label: 'Current location', latitude: Number(latitude), longitude: Number(longitude) }]; },
    },
    routingProvider: {
      async plan(request, language) {
        if (routeError) throw routeError;
        return { availability: 'READY', itineraries: [], source: { provider: 'Test OTP', language, request } };
      },
    },
  };
}

test('serves the application with security headers and protects missing static paths', async () => {
  await withServer(providers(), async (baseUrl) => {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    const missing = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(missing.status, 404);
  });
});

test('routes geocoding requests through injected providers', async () => {
  await withServer(providers(), async (baseUrl) => {
    const search = await fetch(`${baseUrl}/api/geocode/search?q=Ayala`);
    assert.equal(search.status, 200);
    assert.deepEqual((await search.json()).places[0].label, 'Ayala');
    const reverse = await fetch(`${baseUrl}/api/geocode/reverse?lat=14.55&lon=121.02`);
    assert.equal(reverse.status, 200);
    assert.equal((await reverse.json()).place.placeId, 'reverse-1');
  });
});

test('validates and forwards route HTTP requests with language metadata', async () => {
  await withServer(providers(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/routes`, {
      method: 'POST',
      headers: { 'Accept-Language': 'fil-PH', 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 } }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.source.language, 'fil-PH');
    assert.equal(payload.source.request.origin.latitude, 14.6);
  });
});

test('maps invalid, unsupported, and provider-error API paths to truthful statuses', async () => {
  await withServer(providers({ routeError: new RoutingProviderError('OTP unavailable', { status: 503, code: 'ROUTING_UNAVAILABLE' }) }), async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_REQUEST');
    const unavailable = await fetch(`${baseUrl}/api/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).code, 'ROUTING_UNAVAILABLE');
    const unknown = await fetch(`${baseUrl}/api/not-a-route`);
    assert.equal(unknown.status, 404);
  });
});

test('maps unexpected provider failures to a non-leaking internal-service response', async () => {
  await withServer(providers({ routeError: new Error('database password should not leak') }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'An unexpected service error occurred.', code: 'INTERNAL_ERROR' });
  });
});

test('starts the production entrypoint through the exported server launcher', async () => {
  const server = startServer({ port: 0, ...providers() });
  await once(server, 'listening');
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/geocode/search?q=Ayala`);
    assert.equal(response.status, 200);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
