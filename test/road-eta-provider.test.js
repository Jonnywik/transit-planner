import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadEtaProvider, RoadEtaProviderError, validateRoadEtaRequest } from '../server/road-eta-provider.js';

test('validates a bounded traffic-aware road request', () => {
  const request = validateRoadEtaRequest({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 }, departureTime: '2026-08-27T08:00:00+08:00' });
  assert.equal(request.origin.latitude, 14.6);
  assert.equal(request.departureTime, '2026-08-27T00:00:00.000Z');
  assert.throws(() => validateRoadEtaRequest({ origin: {}, destination: {} }), RoadEtaProviderError);
});

test('does not call Google Routes when road ETA configuration is absent', async () => {
  const provider = createRoadEtaProvider({ fetchImpl: async () => { throw new Error('must not fetch'); } });
  await assert.rejects(
    () => provider.estimate({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 } }),
    (error) => error instanceof RoadEtaProviderError && error.code === 'ROAD_ETA_UNAVAILABLE',
  );
  assert.equal(provider.trafficStatus().availability, 'ROAD_ETA_UNAVAILABLE');
});

test('normalizes configured traffic-aware driving data without making a transit claim', async () => {
  let body;
  const provider = createRoadEtaProvider({
    apiKey: 'test-server-key',
    sourceStatus: 'CONFIGURED',
    now: () => '2026-08-27T00:00:00.000Z',
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return new Response(JSON.stringify({ routes: [{ duration: '780s', distanceMeters: 4200, polyline: { encodedPolyline: 'abc' }, travelAdvisory: { speedReadingIntervals: [{ endPolylinePointIndex: 3, speed: 'SLOW' }] } }] }), { status: 200 });
    },
  });
  const result = await provider.estimate({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 }, departureTime: '2026-08-27T08:00:00+08:00' });
  assert.equal(body.travelMode, 'DRIVE');
  assert.deepEqual(body.extraComputations, ['TRAFFIC_ON_POLYLINE']);
  assert.equal(result.availability, 'ROAD_ETA_READY');
  assert.equal(result.roadRoute.durationSeconds, 780);
  assert.equal(result.source.scope, 'traffic-aware road ETA for DRIVE requests only');
});

test('caches matching time-bucket requests and rate limits uncached upstream requests', async () => {
  let calls = 0;
  let currentTime = 10_000;
  const provider = createRoadEtaProvider({
    apiKey: 'test-server-key', sourceStatus: 'CONFIGURED', timestamp: () => currentTime,
    fetchImpl: async () => { calls += 1; return new Response(JSON.stringify({ routes: [{ duration: '60s', distanceMeters: 1 }] }), { status: 200 }); },
  });
  const first = { origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 }, departureTime: '2026-08-27T08:00:00+08:00' };
  await provider.estimate(first);
  await provider.estimate(first);
  assert.equal(calls, 1);
  await assert.rejects(() => provider.estimate({ ...first, destination: { latitude: 14.56, longitude: 121.02 } }), (error) => error.code === 'ROAD_ETA_RATE_LIMITED');
  currentTime += 251;
  await provider.estimate({ ...first, destination: { latitude: 14.56, longitude: 121.02 } });
  assert.equal(calls, 2);
});
