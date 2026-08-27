import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOtpRoutingProvider, decodePolyline, RoutingProviderError, validateRouteRequest } from '../server/routing-provider.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/otp-plan-connection.json', import.meta.url), 'utf8'));

test('validates a bounded route-planning request', () => {
  const result = validateRouteRequest({
    origin: { latitude: 14.5995, longitude: 120.9842 },
    destination: { latitude: 14.549, longitude: 121.0278 },
    departureTime: '2026-08-27T08:00:00+08:00',
    limit: 7,
  });
  assert.equal(result.limit, 3);
  assert.equal(result.origin.latitude, 14.5995);
  assert.throws(() => validateRouteRequest({ origin: {}, destination: {} }), RoutingProviderError);
});

test('decodes OTP encoded leg geometry', () => {
  assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
});

test('sends a version-pinned GraphQL plan request and normalizes the itinerary', async () => {
  let requestBody;
  const provider = createOtpRoutingProvider({
    endpoint: 'https://otp.example.test/graphql',
    otpVersion: '2.9.0',
    dataVersion: 'metro-manila-2026-08-01',
    dataManifestId: 'metro-manila-2026-08-01-a',
    supportBoundary: 'MRT-3 pilot corridor only',
    now: () => '2026-08-27T00:00:00.000Z',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify(fixture), { status: 200 });
    },
  });

  const result = await provider.plan({
    origin: { latitude: 14.5995, longitude: 120.9842 },
    destination: { latitude: 14.549, longitude: 121.0278 },
    departureTime: '2026-08-27T08:00:00+08:00',
  });

  assert.equal(requestBody.variables.first, 3);
  assert.equal(requestBody.variables.origin.location.coordinate.latitude, 14.5995);
  assert.equal(result.availability, 'READY');
  assert.equal(result.source.apiVersion, '2.9.0');
  assert.equal(result.source.manifestId, 'metro-manila-2026-08-01-a');
  assert.equal(result.source.supportBoundary, 'MRT-3 pilot corridor only');
  assert.equal(result.itineraries[0].totalDuration, 35);
  assert.equal(result.itineraries[0].legs[1].route, 'MRT-3');
  assert.equal(result.itineraries[0].legs[1].distance, 4300);
});

test('returns a truthful no-route state when OTP returns no itinerary edges', async () => {
  const provider = createOtpRoutingProvider({
    endpoint: 'https://otp.example.test/graphql',
    otpVersion: '2.9.0',
    dataVersion: 'metro-manila-2026-08-01',
    dataManifestId: 'metro-manila-2026-08-01-a',
    supportBoundary: 'MRT-3 pilot corridor only',
    fetchImpl: async () => new Response(JSON.stringify({ data: { planConnection: { edges: [] } } }), { status: 200 }),
  });
  const result = await provider.plan({ origin: { latitude: 14.5995, longitude: 120.9842 }, destination: { latitude: 14.549, longitude: 121.0278 } });
  assert.equal(result.availability, 'NO_ROUTE');
  assert.deepEqual(result.itineraries, []);
});

test('does not fall back to fixtures when routing is unconfigured', async () => {
  const provider = createOtpRoutingProvider({ fetchImpl: async () => { throw new Error('should not run'); } });
  await assert.rejects(
    () => provider.plan({ origin: { latitude: 14.5995, longitude: 120.9842 }, destination: { latitude: 14.549, longitude: 121.0278 } }),
    (error) => error instanceof RoutingProviderError && error.status === 503 && error.code === 'ROUTING_UNAVAILABLE',
  );
});

test('does not contact OpenTripPlanner when pilot provenance is incomplete', async () => {
  const provider = createOtpRoutingProvider({
    endpoint: 'https://otp.example.test/graphql',
    otpVersion: '2.9.0',
    fetchImpl: async () => { throw new Error('provider must not be called'); },
  });
  await assert.rejects(
    () => provider.plan({ origin: { latitude: 14.5995, longitude: 120.9842 }, destination: { latitude: 14.549, longitude: 121.0278 } }),
    (error) => error instanceof RoutingProviderError || error.code === 'PILOT_DATA_UNVERIFIED',
  );
});
