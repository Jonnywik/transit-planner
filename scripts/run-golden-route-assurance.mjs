import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { validateGoldenRouteSuite } from './validate-golden-routes.mjs';

function responseSummary(payload) {
  return {
    availability: payload?.availability || 'INVALID_RESPONSE',
    itineraryCount: Array.isArray(payload?.itineraries) ? payload.itineraries.length : 0,
    transitModes: [...new Set((payload?.itineraries || []).flatMap((itinerary) => (itinerary.legs || []).filter((leg) => leg.mode !== 'WALK').map((leg) => leg.mode)))],
  };
}

export function evaluateGoldenRoute(routeCase, payload) {
  const actual = responseSummary(payload);
  const expected = routeCase.expected || {};
  const failures = [];
  if (actual.availability !== expected.availability) failures.push(`Expected ${expected.availability}; received ${actual.availability}.`);
  for (const mode of expected.requiredTransitModes || []) if (!actual.transitModes.includes(mode)) failures.push(`Expected a ${mode} transit leg.`);
  if (Number.isInteger(expected.minimumItineraries) && actual.itineraryCount < expected.minimumItineraries) failures.push(`Expected at least ${expected.minimumItineraries} itinerary.`);
  return { id: routeCase.id, passed: failures.length === 0, expected, actual, failures };
}

async function main() {
  const suitePath = process.env.SAKAY_GOLDEN_ROUTE_SUITE || 'data/pilot/golden-routes.draft.json';
  const baseUrl = process.env.SAKAY_BASE_URL || '';
  const reportPath = process.env.SAKAY_GOLDEN_REPORT_PATH || 'artifacts/golden-routes/report.json';
  const suite = JSON.parse(await readFile(suitePath, 'utf8'));
  const validation = validateGoldenRouteSuite(suite);
  if (!validation.valid) throw new Error(`Golden-route suite is structurally invalid:\n- ${validation.errors.join('\n- ')}`);
  if (!validation.ready) throw new Error('Golden-route suite is draft-only. No routing requests were sent; approve the cases against the authoritative graph first.');
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) throw new Error('Set SAKAY_BASE_URL to an operator-controlled Sakay service before running approved golden routes.');

  const report = { suiteId: suite.pilotId, runAt: new Date().toISOString(), target: new URL(baseUrl).origin, cases: [] };
  for (const routeCase of suite.cases) {
    if (!routeCase.request?.origin || !routeCase.request?.destination || !routeCase.request?.departureTime) throw new Error(`Approved golden route ${routeCase.id} is missing a complete request.`);
    const response = await fetch(new URL('/api/routes', baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...routeCase.request, limit: 3 }),
    });
    const payload = await response.json().catch(() => ({ availability: 'INVALID_RESPONSE' }));
    report.cases.push({ ...evaluateGoldenRoute(routeCase, payload), httpStatus: response.status });
  }
  report.passed = report.cases.filter((routeCase) => routeCase.passed).length;
  report.failed = report.cases.length - report.passed;
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Golden-route assurance complete: ${report.passed}/${report.cases.length} passed. Report: ${reportPath}`);
  if (report.failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
