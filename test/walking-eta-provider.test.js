import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkingEtaProvider, validateWalkingEtaRequest } from '../server/walking-eta-provider.js';

test('validates walking-estimate coordinates and rejects unconfigured estimates without using straight-line fallback', async () => {
  assert.throws(() => validateWalkingEtaRequest({ origin: {}, destination: {} }), (error) => error.code === 'INVALID_REQUEST');
  const provider = createWalkingEtaProvider({ fetchImpl: async () => { throw new Error('must not fetch'); } });
  await assert.rejects(() => provider.estimate({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 } }), (error) => error.code === 'WALKING_ETA_UNAVAILABLE');
});

test('normalizes a configured network walking estimate with non-accessibility source wording', async () => {
  const provider = createWalkingEtaProvider({
    apiKey: 'test-server-key', sourceStatus: 'CONFIGURED', now: () => '2026-08-27T00:00:00.000Z',
    fetchImpl: async (_url, options) => {
      assert.equal(JSON.parse(options.body).travelMode, 'WALK');
      return new Response(JSON.stringify({ routes: [{ duration: '780s', distanceMeters: 850, polyline: { encodedPolyline: 'abc' } }] }), { status: 200 });
    },
  });
  const result = await provider.estimate({ origin: { latitude: 14.6, longitude: 121 }, destination: { latitude: 14.55, longitude: 121.02 } });
  assert.equal(result.availability, 'WALKING_ETA_READY');
  assert.equal(result.walkingRoute.durationSeconds, 780);
  assert.match(result.source.scope, /not an accessibility/i);
});
