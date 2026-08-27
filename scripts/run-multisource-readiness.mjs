import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSourceProfile, findSharedLineages, validateSourceRegistry } from '../server/multi-source-governance.js';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultRegistry = resolve(rootDir, 'data/pilot/multi-source-registry.draft.json');
const defaultReport = resolve(rootDir, 'artifacts/multisource-readiness/status.json');

const PURPOSES = {
  RAIL_STATIC: 'LIVE_TRANSIT',
  RAIL_REALTIME: 'REALTIME_TRANSIT',
  ROAD_INTERRUPTION: 'ROAD_INTERRUPTION',
  ROAD_ETA: 'ROAD_ETA',
};

export async function evaluateMultiSourceReadiness({ registryPath = defaultRegistry, reportPath = defaultReport, now = new Date().toISOString() } = {}) {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const validation = validateSourceRegistry(registry);
  const profiles = (registry.profiles || []).map((profile) => {
    const purpose = PURPOSES[profile.role];
    const evaluation = purpose ? evaluateSourceProfile(profile, { purpose, now }) : { eligible: false, reasons: ['STAGING_OR_REFERENCE_ONLY'] };
    return { id: profile.id, role: profile.role, sourceClass: profile.sourceClass, sourceStatus: profile.status, eligible: evaluation.eligible, reasons: evaluation.reasons };
  });
  const blockers = [
    ...(validation.valid ? [] : validation.errors.map((error) => `REGISTRY_INVALID:${error}`)),
    ...(registry.status === 'APPROVED' ? [] : ['REGISTRY_NOT_APPROVED']),
    ...profiles.filter((profile) => ['RAIL_STATIC', 'RAIL_REALTIME', 'ROAD_INTERRUPTION', 'ROAD_ETA'].includes(profile.role) && !profile.eligible).map((profile) => `${profile.id}:${profile.reasons.join(',')}`),
  ];
  const report = {
    generatedAt: now,
    status: blockers.length ? 'BLOCKED' : 'ELIGIBLE',
    networkRequestsMade: 0,
    profiles,
    sharedLineages: findSharedLineages(registry.profiles),
    blockers,
    limitation: 'This report evaluates registered source metadata only. It does not retrieve feeds, infer closures, calculate traffic, or create transit predictions.',
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const registryPath = process.argv.find((argument) => argument.startsWith('--registry='))?.slice('--registry='.length) || defaultRegistry;
  const reportPath = process.argv.find((argument) => argument.startsWith('--report='))?.slice('--report='.length) || defaultReport;
  const required = process.argv.includes('--required');
  const report = await evaluateMultiSourceReadiness({ registryPath, reportPath });
  console.log(`Multi-source readiness: ${report.status}. Report: ${reportPath}`);
  if (required && report.status !== 'ELIGIBLE') process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
