import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateMultiSourceReadiness } from '../scripts/run-multisource-readiness.mjs';

test('reports the draft multi-source data programme as blocked without making network requests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sakay-multisource-'));
  try {
    const registryPath = new URL('../data/pilot/multi-source-registry.draft.json', import.meta.url);
    const reportPath = join(directory, 'status.json');
    const report = await evaluateMultiSourceReadiness({ registryPath, reportPath, now: '2026-08-27T00:00:00.000Z' });
    assert.equal(report.status, 'BLOCKED');
    assert.equal(report.networkRequestsMade, 0);
    assert.ok(report.blockers.includes('REGISTRY_NOT_APPROVED'));
    assert.deepEqual(JSON.parse(await readFile(reportPath, 'utf8')).sharedLineages, [{ lineage: 'dotc-philippine-transit-app-challenge', ids: ['sakayph-metro-manila-gtfs-historical', 'mobility-database-philippines-catalog'] }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports eligible only when every live-capability profile is approved and current', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sakay-multisource-'));
  try {
    const registry = {
      schemaVersion: 1, status: 'APPROVED', profiles: [
        { id: 'rail-static', lineage: 'rail-static', sourceClass: 'APPROVED_STATIC', role: 'RAIL_STATIC', status: 'APPROVED', canonicalUrl: 'https://operator.example/rail.zip', rightsEvidence: 'rights-1', retrievedAt: '2026-08-26T00:00:00.000Z', expiresAt: '2026-09-01T00:00:00.000Z', sha256: 'b'.repeat(64), dataVersion: 'rail-v1' },
        { id: 'rail-realtime', lineage: 'rail-realtime', sourceClass: 'APPROVED_REALTIME', role: 'RAIL_REALTIME', status: 'APPROVED', canonicalUrl: 'https://operator.example/rail-rt', rightsEvidence: 'rights-2', retrievedAt: '2026-08-26T00:00:00.000Z', expiresAt: '2026-09-01T00:00:00.000Z', staticDataVersion: 'rail-v1', freshnessSeconds: 120 },
        { id: 'closures', lineage: 'closures', sourceClass: 'APPROVED_REALTIME', role: 'ROAD_INTERRUPTION', status: 'APPROVED', canonicalUrl: 'https://roads.example/closures', rightsEvidence: 'rights-3', retrievedAt: '2026-08-26T00:00:00.000Z', expiresAt: '2026-09-01T00:00:00.000Z', staticDataVersion: 'roads-v1', freshnessSeconds: 300 },
        { id: 'road-eta', lineage: 'google', sourceClass: 'EXTERNAL_ROAD_ETA', role: 'ROAD_ETA', status: 'CONFIGURED' },
      ],
    };
    const registryPath = join(directory, 'registry.json');
    await writeFile(registryPath, JSON.stringify(registry));
    const report = await evaluateMultiSourceReadiness({ registryPath, reportPath: join(directory, 'status.json'), now: '2026-08-27T00:00:00.000Z' });
    assert.equal(report.status, 'ELIGIBLE');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
