import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeocodingClient } from '../geocoding-client.js';
import { createRoutingClient } from '../routing-client.js';

test('geocoding adapter serializes search and reverse requests and returns normalized payload fields', async () => {
  const calls = [];
  const client = createGeocodingClient({
    baseUrl: 'https://sakay.example.test',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify(url.pathname.includes('reverse') ? { place: { label: 'Ayala' } } : { places: [{ label: 'Makati' }] }), { status: 200 });
    },
  });
  assert.deepEqual(await client.search('Makati'), [{ label: 'Makati' }]);
  assert.deepEqual(await client.reverse(14.55, 121.02), { label: 'Ayala' });
  assert.match(calls[0].url, /q=Makati/);
  assert.match(calls[1].url, /lat=14.55/);
});

test('geocoding adapter preserves provider errors and aborts', async () => {
  const unavailable = createGeocodingClient({ baseUrl: 'https://sakay.example.test', fetchImpl: async () => new Response(JSON.stringify({ error: 'Unavailable', code: 'GEOCODER_DOWN' }), { status: 503 }) });
  await assert.rejects(() => unavailable.search('Makati'), (error) => error.message === 'Unavailable' && error.code === 'GEOCODER_DOWN');
  const abort = new DOMException('Aborted', 'AbortError');
  const aborted = createGeocodingClient({ baseUrl: 'https://sakay.example.test', fetchImpl: async () => { throw abort; } });
  await assert.rejects(() => aborted.search('Makati'), (error) => error === abort);
});

test('geocoding adapter handles successful empty payloads without inventing places', async () => {
  const client = createGeocodingClient({ baseUrl: 'https://sakay.example.test', fetchImpl: async () => new Response('{}', { status: 200 }) });
  assert.deepEqual(await client.search('Makati'), []);
  assert.equal(await client.reverse(14.55, 121.02), null);
});

test('routing adapter serializes plan requests and returns source metadata', async () => {
  let request;
  const client = createRoutingClient({ fetchImpl: async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ availability: 'READY', source: { provider: 'OTP' } }), { status: 200 }); } });
  const result = await client.plan({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 }, departureTime: '2026-08-27T08:00:00+08:00' });
  assert.equal(request.url, '/api/routes');
  assert.equal(JSON.parse(request.options.body).limit, 3);
  assert.equal(result.source.provider, 'OTP');
});

test('routing adapter retains non-success metadata and aborts', async () => {
  const unavailable = createRoutingClient({ fetchImpl: async () => new Response(JSON.stringify({ error: 'Routing unavailable', code: 'ROUTING_UNAVAILABLE', source: { provider: 'OTP' } }), { status: 503 }) });
  await assert.rejects(() => unavailable.plan({}), (error) => error.code === 'ROUTING_UNAVAILABLE' && error.source.provider === 'OTP');
  const abort = new DOMException('Aborted', 'AbortError');
  const aborted = createRoutingClient({ fetchImpl: async () => { throw abort; } });
  await assert.rejects(() => aborted.plan({}), (error) => error === abort);
});

test('routing adapter falls back to a stable error code when the provider omits one', async () => {
  const client = createRoutingClient({ fetchImpl: async () => new Response('{}', { status: 502 }) });
  await assert.rejects(() => client.plan({}), (error) => error.code === 'ROUTING_ERROR' && error.message === 'Routing service is unavailable.');
});
