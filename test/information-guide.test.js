import test from 'node:test';
import assert from 'node:assert/strict';
import { createInformationGuideStatus } from '../server/information-guide.js';

test('makes Sakay transit unavailability explicit while preserving an unverified external handoff and independent estimate capabilities', () => {
  const guide = createInformationGuideStatus({
    now: () => '2026-08-27T00:00:00.000Z',
    roadEtaProvider: { trafficStatus: () => ({ availability: 'ROAD_ETA_AVAILABLE' }) },
    walkingEtaProvider: { walkingStatus: () => ({ availability: 'WALKING_ETA_UNAVAILABLE' }) },
  });
  const state = guide.capabilities();
  assert.equal(state.mode, 'INFORMATION_GUIDE');
  assert.equal(state.transitRouting.code, 'NO_GOVERNED_TRANSIT_SCHEDULE');
  assert.equal(state.transitRouting.availability, 'EXTERNAL_HANDOFF_ONLY');
  assert.equal(state.transitRouting.handoff.availability, 'AVAILABLE');
  assert.equal(state.roadInterruptions.availability, 'VERIFIED_INTERRUPTION_UNAVAILABLE');
  assert.equal(state.roadEta.availability, 'ROAD_ETA_AVAILABLE');
  assert.equal(state.mapContext.availability, 'ADVISORY_ONLY');
  assert.doesNotMatch(state.transitRouting.message, /estimate|prediction/i);
});
