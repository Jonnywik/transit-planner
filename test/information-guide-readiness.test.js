import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeInformationGuideReport } from '../scripts/run-information-guide-readiness.mjs';

test('writes a no-touch fallback capability report without requesting schedules or estimates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sakay-guide-'));
  try {
    const report = await writeInformationGuideReport({
      informationGuide: { capabilities: () => ({ mode: 'INFORMATION_GUIDE', transitRouting: { availability: 'UNAVAILABLE', code: 'NO_GOVERNED_TRANSIT_SCHEDULE' } }) },
      reportPath: join(directory, 'status.json'),
    });
    assert.equal(report.networkRequestsMade, 0);
    assert.equal(report.transitRouting.code, 'NO_GOVERNED_TRANSIT_SCHEDULE');
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'status.json'), 'utf8')).mode, 'INFORMATION_GUIDE');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
