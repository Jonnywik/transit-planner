import { readFile } from 'node:fs/promises';

const requiredSourceFields = ['id', 'status', 'sourceUrl', 'licenseOrPermission', 'retrievedAt', 'sha256', 'feedInfoVersion', 'validatorResult'];

export function validatePilotManifest(manifest) {
  const errors = [];
  if (manifest?.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!manifest?.pilot?.id || !manifest?.pilot?.supportBoundary) errors.push('pilot.id and pilot.supportBoundary are required.');
  if (!Array.isArray(manifest?.sources) || !manifest.sources.length) errors.push('At least one source record is required.');

  const sourceIds = new Set();
  for (const source of manifest?.sources || []) {
    if (!source.id || sourceIds.has(source.id)) errors.push(`Source IDs must be unique and non-empty: ${source.id || '(missing)'}.`);
    sourceIds.add(source.id);
    if (!['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(source.status)) errors.push(`Unsupported source status for ${source.id}.`);
    if (source.status === 'APPROVED') {
      for (const field of requiredSourceFields) if (!source[field]) errors.push(`Approved source ${source.id} requires ${field}.`);
    }
  }

  const requiredApprovals = ['product', 'data', 'engineering', 'operations'];
  for (const approval of requiredApprovals) if (!manifest?.approvals?.[approval]) errors.push(`Approval record ${approval} is required.`);
  const ready = errors.length === 0 && manifest.status === 'APPROVED' && (manifest.sources || []).every((source) => source.status === 'APPROVED') && requiredApprovals.every((approval) => manifest.approvals[approval].status === 'APPROVED');
  return { valid: errors.length === 0, ready, errors };
}

async function main() {
  const requireReady = process.argv.includes('--require-ready');
  const pathArgument = process.argv.find((argument) => argument.startsWith('--manifest='));
  const manifestPath = pathArgument?.slice('--manifest='.length) || 'data/pilot/pilot-manifest.draft.json';
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const result = validatePilotManifest(manifest);
  if (!result.valid) throw new Error(`Pilot manifest is structurally invalid:\n- ${result.errors.join('\n- ')}`);
  if (requireReady && !result.ready) throw new Error('Pilot manifest is structurally valid but not approved for live routing.');
  console.log(`Pilot manifest validation passed: ${result.ready ? 'READY_FOR_LIVE_ROUTING' : 'PENDING_EXTERNAL_APPROVAL'}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
