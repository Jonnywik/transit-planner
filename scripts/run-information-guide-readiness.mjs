import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInformationGuideStatus } from '../server/information-guide.js';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultReportPath = resolve(rootDir, 'artifacts/information-guide/status.json');

export async function writeInformationGuideReport({ informationGuide, reportPath = defaultReportPath } = {}) {
  const state = informationGuide?.capabilities?.() || createInformationGuideStatus().capabilities();
  const report = {
    ...state,
    networkRequestsMade: 0,
    limitation: 'This report reads configured capability state only. It does not request an ETA, retrieve schedules, infer transit service, or enable routing.',
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const reportPath = process.argv.find((argument) => argument.startsWith('--report='))?.slice('--report='.length) || defaultReportPath;
  const report = await writeInformationGuideReport({ reportPath });
  console.log(`Information-guide mode: ${report.mode}. Report: ${reportPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
