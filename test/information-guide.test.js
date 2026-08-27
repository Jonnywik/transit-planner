import test from 'node:test';
import assert from 'node:assert/strict';
import { createInformationGuideStatus } from '../server/information-guide.js';

test('makes fallback transit unavailability explicit while preserving independent estimate capabilities', () => {
  const guide = createInformationGuideStatus({
    now: () => '2026-08-27T00:00:00.000Z',
    roadEtaProvider: { trafficStatus: () => ({ availability: 'ROAD_ETA_AVAILABLE' }) },
    walkingEtaProvider: { walkingStatus: () => ({ availability: 'WALKING_ETA_UNAVAILABLE' }) },
  });
  const state = guide.capabilities();
  assert.equal(state.mode, 'INFORMATION_GUIDE');
  assert.equal(state.transitRouting.code, 'NO_GOVERNED_TRANSIT_SCHEDULE');
  assert.equal(state.roadEta.availability, 'ROAD_ETA_AVAILABLE');
  assert.equal(state.mapContext.availability, 'ADVISORY_ONLY');
  assert.doesNotMatch(state.transitRouting.message, /estimate|prediction/i);
});
