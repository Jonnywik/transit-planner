import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInterruption, evaluateRailArrival, validateInterruption } from '../server/interruption-and-realtime.js';

const now = '2026-08-27T00:00:00.000Z';
const staticProfile = { sourceClass: 'APPROVED_STATIC', status: 'APPROVED', rightsEvidence: 'rail-rights', sha256: 'a'.repeat(64), expiresAt: '2026-09-01T00:00:00.000Z', dataVersion: 'rail-2026-08-26' };
const realtimeProfile = { sourceClass: 'APPROVED_REALTIME', status: 'APPROVED', rightsEvidence: 'rail-realtime-rights', expiresAt: '2026-09-01T00:00:00.000Z', staticDataVersion: 'rail-2026-08-26', freshnessSeconds: 120 };
const interruption = { id: 'road-1', sourceId: 'operator-road-interruptions', confidence: 'VERIFIED_ACTIVE', severity: 'MAJOR', publishedAt: '2026-08-26T23:50:00.000Z', expiresAt: '2026-08-27T01:00:00.000Z', affected: { kind: 'ROAD_SEGMENT', ids: ['way/123'] } };

test('keeps mapped or expired road conditions advisory and non-routing-impacting', () => {
  assert.equal(validateInterruption({ ...interruption, confidence: 'MAPPED_BASELINE' }).valid, true);
  assert.deepEqual(evaluateInterruption({ ...interruption, confidence: 'MAPPED_BASELINE' }, null, { now }).routingImpact, false);
  assert.equal(evaluateInterruption({ ...interruption, expiresAt: '2026-08-26T23:59:59.000Z' }, realtimeProfile, { now }).status, 'INTERRUPTION_EXPIRED');
});

test('allows a closure to affect routing only with an approved, current realtime authority profile', () => {
  assert.equal(evaluateInterruption(interruption, realtimeProfile, { now }).routingImpact, true);
  assert.equal(evaluateInterruption(interruption, { ...realtimeProfile, status: 'PENDING_APPROVAL' }, { now }).routingImpact, false);
});

test('never relabels static rail data as live without a fresh reconciled operational update', () => {
  assert.deepEqual(evaluateRailArrival({ staticProfile, realtimeProfile: null, now }), { status: 'SCHEDULED_ESTIMATE', live: false, reasons: ['LIVE_TRANSIT_UPDATE_UNAVAILABLE'] });
  assert.equal(evaluateRailArrival({ staticProfile, realtimeProfile, update: { tripId: 'trip-1', stopId: 'stop-1', updatedAt: '2026-08-26T23:55:00.000Z' }, now }).status, 'LIVE_TRANSIT_UNAVAILABLE');
  assert.equal(evaluateRailArrival({ staticProfile, realtimeProfile, update: { tripId: 'trip-1', stopId: 'stop-1', updatedAt: '2026-08-26T23:59:00.000Z' }, now }).status, 'LIVE_TRANSIT_UPDATE');
});
