import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSourceDisclosure, evaluateSourceProfile, findSharedLineages, validateSourceRegistry } from '../server/multi-source-governance.js';
import { inspectStagingGtfs } from '../scripts/inspect-staging-gtfs.mjs';

const registry = JSON.parse(await readFile(new URL('../data/pilot/multi-source-registry.draft.json', import.meta.url), 'utf8'));

test('accepts the draft multi-source registry while keeping historical and pending profiles ineligible for live use', () => {
  assert.equal(validateSourceRegistry(registry).valid, true);
  const sakayProfile = registry.profiles.find((profile) => profile.id === 'sakayph-metro-manila-gtfs-historical');
  assert.deepEqual(evaluateSourceProfile(sakayProfile, { purpose: 'LIVE_TRANSIT' }).reasons.sort(), ['SOURCE_CLASS_NOT_LIVE_ELIGIBLE', 'SOURCE_STATUS_NOT_APPROVED']);
  assert.equal(buildSourceDisclosure(sakayProfile).liveUse, 'not-eligible');
});

test('identifies shared historical lineage rather than treating catalog metadata as independent confirmation', () => {
  const shared = findSharedLineages(registry.profiles);
  assert.deepEqual(shared, [{ lineage: 'dotc-philippine-transit-app-challenge', ids: ['sakayph-metro-manila-gtfs-historical', 'mobility-database-philippines-catalog'] }]);
});

test('inspects a staged GTFS directory without making it production eligible', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sakay-gtfs-'));
  const reportPath = join(directory, 'report.json');
  try {
    await Promise.all(['agency.txt', 'routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt', 'feed_info.txt'].map((file) => writeFile(join(directory, file), file === 'feed_info.txt' ? 'feed_publisher_name,feed_lang\nHistorical Sakay,en\n' : 'id\nvalue\n')));
    const report = await inspectStagingGtfs({ inputDirectory: directory, sourceProfile: registry.profiles[1], reportPath, inspectedAt: '2026-08-27T00:00:00.000Z' });
    assert.equal(report.status, 'HISTORICAL_STAGING_ONLY');
    assert.equal(report.productionEligible, false);
    assert.deepEqual(JSON.parse(await readFile(reportPath, 'utf8')).input.missingFiles, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
