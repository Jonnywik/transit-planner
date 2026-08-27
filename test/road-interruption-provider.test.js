import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadInterruptionProvider } from '../server/road-interruption-provider.js';

test('reports verified road interruptions as unavailable without an approved authority source', () => {
  const provider = createRoadInterruptionProvider({ now: () => '2026-08-27T00:00:00.000Z' });
  const status = provider.status();
  assert.equal(status.availability, 'VERIFIED_INTERRUPTION_UNAVAILABLE');
  assert.equal(status.code, 'NO_APPROVED_ROAD_INTERRUPTION_SOURCE');
  assert.match(status.message, /cannot claim road closures/i);
});

test('does not fabricate interruption events when a source profile is approved but no provider is connected', () => {
  const provider = createRoadInterruptionProvider({ sourceStatus: 'APPROVED' });
  const status = provider.status();
  assert.equal(status.availability, 'VERIFIED_INTERRUPTION_PROVIDER_REQUIRED');
  assert.equal(status.code, 'NO_CONNECTED_VERIFIED_INTERRUPTION_PROVIDER');
});
