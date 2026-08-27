import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateSourceRegistry } from '../server/multi-source-governance.js';

export async function validateRegistryFile(path) {
  let registry;
  try {
    registry = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return { valid: false, errors: [`Could not read registry: ${error.message}`] };
  }
  return validateSourceRegistry(registry);
}

async function main() {
  const path = process.argv[2] || fileURLToPath(new URL('../data/pilot/multi-source-registry.draft.json', import.meta.url));
  const result = await validateRegistryFile(path);
  if (!result.valid) {
    console.error(`Multi-source registry is invalid:\n- ${result.errors.join('\n- ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('Multi-source registry is structurally valid. Its draft statuses remain non-production.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
