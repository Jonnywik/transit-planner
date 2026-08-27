import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPilotSource, PilotReadinessError } from '../server/pilot-readiness.js';
import { validatePilotManifest } from '../scripts/validate-pilot-manifest.mjs';
import { validateGoldenRouteSuite } from '../scripts/validate-golden-routes.mjs';
import { evaluateGoldenRoute } from '../scripts/run-golden-route-assurance.mjs';

test('blocks a rider-facing routing source when pilot provenance is incomplete', () => {
  assert.throws(
    () => buildPilotSource({ otpVersion: '2.9.0', dataVersion: '2026-08-27' }),
    (error) => error instanceof PilotReadinessError && error.code === 'PILOT_DATA_UNVERIFIED',
  );
});

test('records complete pilot provenance in every ready routing response', () => {
  const source = buildPilotSource({
    otpVersion: '2.9.0',
    dataVersion: 'mrt3-2026-08-27',
    manifestId: 'mrt3-2026-08-27-a',
    supportBoundary: 'MRT-3 pilot corridor only',
    retrievedAt: '2026-08-27T00:00:00.000Z',
  });
  assert.deepEqual(source, {
    provider: 'OpenTripPlanner',
    apiVersion: '2.9.0',
    dataVersion: 'mrt3-2026-08-27',
    manifestId: 'mrt3-2026-08-27-a',
    supportBoundary: 'MRT-3 pilot corridor only',
    retrievedAt: '2026-08-27T00:00:00.000Z',
    status: 'schedule',
    fareStatus: 'UNAVAILABLE',
  });
});

test('accepts structural pilot artifacts without treating a draft as routing-ready', async () => {
  const manifest = JSON.parse(await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../data/pilot/pilot-manifest.draft.json', import.meta.url), 'utf8')));
  const suite = JSON.parse(await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../data/pilot/golden-routes.draft.json', import.meta.url), 'utf8')));
  const manifestResult = validatePilotManifest(manifest);
  const goldenResult = validateGoldenRouteSuite(suite);
  assert.equal(manifestResult.valid, true);
  assert.equal(manifestResult.ready, false);
  assert.equal(goldenResult.valid, true);
  assert.equal(goldenResult.ready, false);
  assert.equal(suite.cases.length, 20);
});

test('evaluates approved golden-route expectations against a controlled routing response', () => {
  const routeCase = { id: 'controlled-ready-case', expected: { availability: 'READY', minimumItineraries: 1, requiredTransitModes: ['RAIL'] } };
  const result = evaluateGoldenRoute(routeCase, { availability: 'READY', itineraries: [{ legs: [{ mode: 'WALK' }, { mode: 'RAIL' }] }] });
  assert.equal(result.passed, true);
  assert.deepEqual(result.failures, []);
  assert.equal(evaluateGoldenRoute(routeCase, { availability: 'NO_ROUTE', itineraries: [] }).passed, false);
});
