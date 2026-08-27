import { readFile } from 'node:fs/promises';

const requiredScenarios = new Set(['direct', 'transfer', 'walking_access', 'no_route', 'pilot_boundary']);

export function validateGoldenRouteSuite(suite) {
  const errors = [];
  if (suite?.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!Array.isArray(suite?.cases) || suite.cases.length < 20) errors.push('At least 20 golden-route cases are required.');
  const ids = new Set();
  const scenarios = new Set();
  for (const routeCase of suite?.cases || []) {
    if (!routeCase.id || ids.has(routeCase.id)) errors.push(`Golden-route IDs must be unique and non-empty: ${routeCase.id || '(missing)'}.`);
    ids.add(routeCase.id);
    if (!requiredScenarios.has(routeCase.scenario)) errors.push(`Unsupported scenario for ${routeCase.id}.`);
    scenarios.add(routeCase.scenario);
    if (!routeCase.originRef || !routeCase.destinationRef || !routeCase.riderOutcome) errors.push(`Golden route ${routeCase.id} requires originRef, destinationRef, and riderOutcome.`);
  }
  for (const scenario of requiredScenarios) if (!scenarios.has(scenario)) errors.push(`Golden-route suite is missing ${scenario} coverage.`);
  const ready = errors.length === 0 && suite.status === 'APPROVED' && suite.cases.every((routeCase) => routeCase.status === 'APPROVED');
  return { valid: errors.length === 0, ready, errors };
}

async function main() {
  const requireReady = process.argv.includes('--require-ready');
  const suite = JSON.parse(await readFile('data/pilot/golden-routes.draft.json', 'utf8'));
  const result = validateGoldenRouteSuite(suite);
  if (!result.valid) throw new Error(`Golden-route suite is structurally invalid:\n- ${result.errors.join('\n- ')}`);
  if (requireReady && !result.ready) throw new Error('Golden-route suite is structurally valid but not approved against an authoritative routing graph.');
  console.log(`Golden-route structural validation passed: ${result.ready ? 'READY_FOR_LIVE_ROUTING' : 'PENDING_EXTERNAL_ROUTE_REVIEW'}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
