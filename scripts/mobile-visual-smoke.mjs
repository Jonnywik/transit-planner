/* Signal Ribbon visual smoke: verify the map-led 390 × 844 mobile shell renders, captures, and preserves its planning dock. */
import { createServer } from 'node:http';
import { access, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createSakayServer } from '../server.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(rootDir, 'artifacts', 'visual-smoke');
const viewport = { width: 390, height: 844 };

function findBrowser() {
  const candidates = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const candidate of candidates) {
    const located = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (located.status === 0) return located.stdout.trim() || candidate;
  }
  throw new Error('No Chromium-compatible browser was found. Set CHROME_BIN to run the mobile visual smoke check.');
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const process = spawn(command, args, { stdio: 'inherit' });
    process.on('error', reject);
    process.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}.`)));
  });
}

function listen(server) {
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolvePromise(server.address().port));
  });
}

function close(server) {
  return new Promise((resolvePromise) => server.close(resolvePromise));
}

const server = createSakayServer({ rootDir: resolve(rootDir, 'public') });
const port = await listen(server);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotPath = resolve(outputDir, 'mobile-home.png');

try {
  const [homepage, stylesheet] = await Promise.all([fetch(`${baseUrl}/`), fetch(`${baseUrl}/style.css`)]);
  if (homepage.status !== 200 || stylesheet.status !== 200) throw new Error('The live mobile shell did not serve its homepage and stylesheet successfully.');

  const [html, css] = await Promise.all([homepage.text(), stylesheet.text()]);
  const requiredShell = ['id="search-panel"', 'class="sheet-handle"', 'id="route-form"', 'id="departure-time"', 'id="btn-depart-now"', 'id="btn-mrt3-reference"', 'id="btn-fare-reference"', 'id="btn-walking-eta"', 'id="btn-road-eta"', 'id="btn-traffic-handoff"', 'id="traffic-capability"', 'id="guide-capability"', 'id="btn-search"', 'id="results-panel"'];
  const missingShell = requiredShell.filter((token) => !html.includes(token));
  if (missingShell.length) throw new Error(`Missing mobile planning-shell markup: ${missingShell.join(', ')}`);
  const requiredMobileRules = ['@media (min-width: 720px)', '.search-panel { position: absolute', 'bottom: 0;', '.journey-time {', '.journey-time__reference {', '.btn-walking-eta {', '.btn-road-eta {', '.traffic-handoff {', '.guide-capability {', '.traffic-capability {', '.results-panel { position: absolute', '.results-provenance {'];
  const missingRules = requiredMobileRules.filter((token) => !css.includes(token));
  if (missingRules.length) throw new Error(`Missing responsive Signal Ribbon rules: ${missingRules.join(', ')}`);

  await mkdir(outputDir, { recursive: true });
  const browser = findBrowser();
  await run(browser, [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${screenshotPath}`,
    baseUrl,
  ]);
  await access(screenshotPath, constants.R_OK);
  const screenshot = await stat(screenshotPath);
  if (screenshot.size < 5_000) throw new Error('The mobile screenshot is unexpectedly small and cannot be trusted as a visual smoke artifact.');

  console.log(`Mobile visual smoke passed at ${viewport.width}×${viewport.height}. Artifact: ${screenshotPath} (${screenshot.size} bytes)`);
} finally {
  await close(server);
}
