import test from 'node:test';
import assert from 'node:assert/strict';
import { GatewayError, createGeocodingGateway, normalizePlace, validateCoordinates, validateSearchQuery } from '../server/geocoding-gateway.js';

test('validates and normalizes search queries', () => {
  assert.equal(validateSearchQuery('  Makati  '), 'Makati');
  assert.throws(() => validateSearchQuery('ab'), GatewayError);
});

test('validates coordinates before provider use', () => {
  assert.deepEqual(validateCoordinates('14.5547', '121.0244'), { latitude: 14.5547, longitude: 121.0244 });
  assert.throws(() => validateCoordinates('95', '121.0244'), GatewayError);
});

test('normalizes provider results into the client place contract', () => {
  assert.deepEqual(normalizePlace({ osm_type: 'node', osm_id: 123, display_name: 'Ayala, Makati, Metro Manila, Philippines', lat: '14.5547', lon: '121.0244' }), {
    placeId: 'node-123',
    label: 'Ayala, Makati, Metro Manila',
    primaryLabel: 'Ayala',
    secondaryLabel: 'Makati, Metro Manila',
    latitude: 14.5547,
    longitude: 121.0244,
  });
});

test('caches duplicate searches and forwards an identifying user agent', async () => {
  let calls = 0;
  let receivedUserAgent = '';
  const gateway = createGeocodingGateway({
    fetchImpl: async (_url, options) => {
      calls += 1;
      receivedUserAgent = options.headers['User-Agent'];
      return new Response(JSON.stringify([{ osm_type: 'node', osm_id: 1, display_name: 'Makati, Metro Manila, Philippines', lat: '14.5547', lon: '121.0244' }]));
    },
    userAgent: 'Sakay-Test/1.0 (contact: test@example.com)',
    minUpstreamIntervalMs: 0,
  });

  const first = await gateway.search('Makati');
  const second = await gateway.search('Makati');
  assert.equal(calls, 1);
  assert.equal(receivedUserAgent, 'Sakay-Test/1.0 (contact: test@example.com)');
  assert.deepEqual(first, second);
});

test('refuses upstream requests when an operator identifier is not configured', async () => {
  let calls = 0;
  const gateway = createGeocodingGateway({
    fetchImpl: async () => {
      calls += 1;
      return new Response('[]');
    },
    minUpstreamIntervalMs: 0,
  });

  await assert.rejects(() => gateway.search('Makati'), (error) => error instanceof GatewayError && error.status === 503);
  assert.equal(calls, 0);
});
