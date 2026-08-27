import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixturePath = new URL('../data/documentation-fixtures/sakayph-gtfs-historical.manifest.json', import.meta.url);

test('keeps the historical SakayPH GTFS source as a private documentation fixture, not a production routing source', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.equal(fixture.status, 'DOCUMENTATION_ONLY');
  assert.equal(fixture.sourceClass, 'HISTORICAL_FIXTURE');
  assert.equal(fixture.revision, 'b7394ccd0c22e7fcc18cc6b53baa1200e99e8a87');
  assert.equal(fixture.revisionAuthoredAt, '2015-03-24T14:16:49+08:00');
  assert.equal(fixture.observedCalendarEndDate, '20200630');
  assert.equal(fixture.productionEligible, false);
  assert.equal(fixture.riderVisible, false);
  assert.equal(fixture.requiresExplicitDeveloperOptIn, true);
  assert.ok(fixture.prohibitedUse.includes('current travel guidance'));
  assert.ok(fixture.prohibitedUse.includes('production activation'));
  assert.ok(fixture.prohibitedUse.includes('automatic external-feed retrieval'));
});
