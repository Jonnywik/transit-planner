import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFileReleaseGate, evaluatePilotRelease, validatePilotSourcePolicy } from '../server/pilot-automation.js';
import { validateGoldenRouteSuite } from '../scripts/validate-golden-routes.mjs';
import { validatePilotManifest } from '../scripts/validate-pilot-manifest.mjs';

const draftPolicy = JSON.parse(await readFile(new URL('../data/pilot/pilot-source-policy.draft.json', import.meta.url), 'utf8'));
const draftManifest = JSON.parse(await readFile(new URL('../data/pilot/pilot-manifest.draft.json', import.meta.url), 'utf8'));
const draftSuite = JSON.parse(await readFile(new URL('../data/pilot/golden-routes.draft.json', import.meta.url), 'utf8'));
const CHECKSUM = 'a'.repeat(64);

function approvedInputs({ expired = false, mismatchedGraph = false } = {}) {
  const sources = [
    { id: 'official-mrt3-gtfs-schedule', status: 'APPROVED', sourceUrl: 'https://agency.example.test/mrt3.zip', rightsEvidence: 'approval-gtfs-1', licenseOrPermission: 'approval-gtfs-1', retrievedAt: '2026-08-25T00:00:00.000Z', approvedAt: '2026-08-01T00:00:00.000Z', expiresAt: expired ? '2026-08-26T00:00:00.000Z' : '2026-09-30T00:00:00.000Z', sha256: CHECKSUM, feedInfoVersion: '2026-09-01', validatorResult: 'report-1' },
    { id: 'openstreetmap-mrt3-pedestrian-network', status: 'APPROVED', sourceUrl: 'https://extract.example.test/mrt3.osm.pbf', rightsEvidence: 'attribution-reviewed', licenseOrPermission: 'attribution-reviewed', retrievedAt: '2026-08-25T00:00:00.000Z', approvedAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-09-30T00:00:00.000Z', sha256: CHECKSUM, feedInfoVersion: '2026-09-01', validatorResult: 'report-2' },
  ];
  const release = { otpApiVersion: '2.9.0', dataVersion: 'mrt3-2026-09-01', manifestId: 'mrt3-release-a', graphChecksum: CHECKSUM };
  const policy = { schemaVersion: 1, status: 'APPROVED', pilotId: 'mrt3-north-avenue-taft-avenue', sources, release };
  const manifest = { schemaVersion: 1, status: 'APPROVED', pilot: { id: policy.pilotId, supportBoundary: 'MRT-3 pilot corridor only' }, routing: { otpApiVersion: release.otpApiVersion, dataVersion: release.dataVersion }, release: { manifestId: release.manifestId, graphChecksum: mismatchedGraph ? 'b'.repeat(64) : release.graphChecksum }, sources, approvals: { product: { status: 'APPROVED' }, data: { status: 'APPROVED' }, engineering: { status: 'APPROVED' }, operations: { status: 'APPROVED' } } };
  const suite = structuredClone(draftSuite);
  suite.status = 'APPROVED';
  suite.cases.forEach((routeCase) => { routeCase.status = 'APPROVED'; });
  const assuranceReport = { status: 'PASSED', manifestId: release.manifestId, graphChecksum: release.graphChecksum };
  return { policy, manifest, goldenSuite: suite, assuranceReport };
}

function evaluate(inputs) {
  return evaluatePilotRelease({ ...inputs, checkedAt: '2026-08-27T00:00:00.000Z', validateManifest: validatePilotManifest, validateGoldenSuite: validateGoldenRouteSuite });
}

test('treats a structurally valid draft policy as a safe blocked release', () => {
  assert.equal(validatePilotSourcePolicy(draftPolicy).valid, true);
  const report = evaluate({ policy: draftPolicy, manifest: draftManifest, goldenSuite: draftSuite, assuranceReport: null });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.eligible, false);
  assert.ok(report.reasons.some((reason) => reason.code === 'SOURCE_POLICY_NOT_READY'));
});

test('automatically blocks an expired source or graph checksum mismatch', () => {
  const expired = evaluate(approvedInputs({ expired: true }));
  assert.ok(expired.reasons.some((reason) => reason.code === 'SOURCE_EXPIRED'));
  const mismatch = evaluate(approvedInputs({ mismatchedGraph: true }));
  assert.ok(mismatch.reasons.some((reason) => reason.code === 'GRAPH_CHECKSUM_MISMATCH'));
});

test('marks a fully approved, matched, and assured release eligible', () => {
  const report = evaluate(approvedInputs());
  assert.deepEqual({ status: report.status, eligible: report.eligible, reasons: report.reasons }, { status: 'ELIGIBLE', eligible: true, reasons: [] });
});

test('file release gate only permits an explicit eligible readiness state', async () => {
  const eligibleGate = createFileReleaseGate({
    statePath: '/secure/pilot-state.json',
    readFile: async () => JSON.stringify({ status: 'ELIGIBLE', eligible: true }),
  });
  const blockedGate = createFileReleaseGate({
    statePath: '/secure/pilot-state.json',
    readFile: async () => JSON.stringify({ status: 'BLOCKED', eligible: false, reasons: [{ message: 'Expired source.' }] }),
  });
  const unavailableGate = createFileReleaseGate({ statePath: '/secure/pilot-state.json', readFile: async () => { throw new Error('missing'); } });

  assert.deepEqual(await eligibleGate(), { eligible: true, reason: null });
  assert.deepEqual(await blockedGate(), { eligible: false, reason: 'Expired source.' });
  assert.equal((await unavailableGate()).eligible, false);
});
