import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const REQUIRED_FILES = ['agency.txt', 'routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt'];

function parseCsvHeader(text) {
  return text.trim().split(/\r?\n/, 1)[0]?.split(',').map((value) => value.trim()) || [];
}

export async function inspectStagingGtfs({ inputDirectory, sourceProfile, reportPath = 'artifacts/staging-gtfs/report.json', inspectedAt = new Date().toISOString() } = {}) {
  if (!inputDirectory) throw new Error('Set --input=<directory> to an isolated GTFS directory.');
  if (!sourceProfile || !['REFERENCE_ONLY', 'STAGING_ONLY'].includes(sourceProfile.sourceClass)) throw new Error('Only REFERENCE_ONLY or STAGING_ONLY sources can be inspected by this command.');
  const files = new Set(await readdir(inputDirectory));
  const missingFiles = REQUIRED_FILES.filter((file) => !files.has(file));
  const feedInfoPath = resolve(inputDirectory, 'feed_info.txt');
  const feedInfoHeaders = files.has('feed_info.txt') ? parseCsvHeader(await readFile(feedInfoPath, 'utf8')) : [];
  const report = {
    status: missingFiles.length ? 'STAGING_INPUT_INVALID' : 'HISTORICAL_STAGING_ONLY',
    inspectedAt,
    source: { id: sourceProfile.id, sourceClass: sourceProfile.sourceClass, status: sourceProfile.status, revision: sourceProfile.revision || null },
    input: { directory: basename(resolve(inputDirectory)), requiredFiles: REQUIRED_FILES, missingFiles, feedInfoHeaders },
    productionEligible: false,
    limitation: 'This inspection does not validate timetable currency, grant production rights, build a live graph, or enable routing.',
  };
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const inputDirectory = process.argv.find((argument) => argument.startsWith('--input='))?.slice('--input='.length);
  const reportPath = process.argv.find((argument) => argument.startsWith('--report='))?.slice('--report='.length) || undefined;
  const profile = { id: 'sakayph-metro-manila-gtfs-historical', sourceClass: 'REFERENCE_ONLY', status: 'HISTORICAL', revision: 'user-supplied-pinned-source' };
  const report = await inspectStagingGtfs({ inputDirectory, sourceProfile: profile, reportPath });
  console.log(`Staging GTFS inspection: ${report.status}. Report: ${reportPath || 'artifacts/staging-gtfs/report.json'}`);
  if (report.status !== 'HISTORICAL_STAGING_ONLY') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
