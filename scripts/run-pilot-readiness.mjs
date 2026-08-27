import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { evaluatePilotRelease } from '../server/pilot-automation.js';
import { validateGoldenRouteSuite } from './validate-golden-routes.mjs';
import { validatePilotManifest } from './validate-pilot-manifest.mjs';

async function readJson(path, { optional = false } = {}) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function runPilotReadiness({
  policyPath = process.env.SAKAY_PILOT_POLICY || 'data/pilot/pilot-source-policy.draft.json',
  manifestPath = process.env.SAKAY_PILOT_MANIFEST || 'data/pilot/pilot-manifest.draft.json',
  goldenSuitePath = process.env.SAKAY_GOLDEN_ROUTE_SUITE || 'data/pilot/golden-routes.draft.json',
  assurancePath = process.env.SAKAY_GOLDEN_ASSURANCE_REPORT || 'artifacts/golden-routes/report.json',
  reportPath = process.env.SAKAY_PILOT_READINESS_REPORT || 'artifacts/pilot-readiness/status.json',
  checkedAt = new Date().toISOString(),
} = {}) {
  const [policy, manifest, goldenSuite, assuranceReport] = await Promise.all([
    readJson(policyPath), readJson(manifestPath), readJson(goldenSuitePath), readJson(assurancePath, { optional: true }),
  ]);
  const report = {
    automation: 'NO_TOUCH_PILOT_RELEASE_GATE',
    ...evaluatePilotRelease({ policy, manifest, goldenSuite, assuranceReport, checkedAt, validateManifest: validatePilotManifest, validateGoldenSuite: validateGoldenRouteSuite }),
  };
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
}

async function main() {
  const { report, reportPath } = await runPilotReadiness();
  console.log(`Pilot automation readiness: ${report.status}. Report: ${reportPath}`);
  for (const reason of report.reasons) console.log(`- ${reason.code}: ${reason.message}`);
  if (process.argv.includes('--require-eligible') && !report.eligible) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
