/* Signal Ribbon live interaction smoke: exercise the real mobile dock, real local geocoding selections, demo route-card state, and truthful unavailable-routing state in a browser. */
import { access, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const baseUrl = process.env.SAKAY_BASE_URL || 'http://127.0.0.1:4177';
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(rootDir, 'artifacts', 'live-mobile');
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9228);

function findBrowser() {
  for (const candidate of [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const found = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (found.status === 0) return found.stdout.trim() || candidate;
  }
  throw new Error('No Chromium-compatible browser was found. Set CHROME_BIN to run the live interaction smoke test.');
}

function delay(milliseconds) { return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)); }

async function waitForDebugEndpoint() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return response.json();
    } catch { /* Chrome is still starting. */ }
    await delay(100);
  }
  throw new Error('Chromium did not expose a debugging endpoint in time.');
}

class CdpClient {
  constructor(endpoint) {
    this.socket = new WebSocket(endpoint);
    this.nextId = 1;
    this.pending = new Map();
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolvePromise, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolvePromise(message.result);
    });
  }

  async connect() {
    await new Promise((resolvePromise, reject) => {
      this.socket.addEventListener('open', resolvePromise, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  close() { this.socket.close(); }
}

async function evaluate(client, sessionId, expression) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (exceptionDetails) throw new Error(exceptionDetails.text || 'Browser evaluation failed.');
  return result.value;
}

const browser = findBrowser();
const chrome = spawn(browser, [
  '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${debugPort}`,
  '--window-size=390,844',
  `--user-data-dir=${resolve(outputDir, 'chrome-profile')}`,
  'about:blank',
], { stdio: 'ignore' });

let client;
try {
  const health = await fetch(baseUrl);
  if (!health.ok) throw new Error(`The live planner is unavailable at ${baseUrl}.`);
  await mkdir(outputDir, { recursive: true });
  const version = await waitForDebugEndpoint();
  client = new CdpClient(version.webSocketDebuggerUrl);
  await client.connect();

  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  await client.send('Page.navigate', { url: `${baseUrl}/?demo=1` }, sessionId);
  await delay(900);

  const initialShell = await evaluate(client, sessionId, `(() => {
    const sheet = document.getElementById('search-panel');
    const gps = document.getElementById('btn-gps').getBoundingClientRect();
    const search = document.getElementById('btn-search').getBoundingClientRect();
    const roadEta = document.getElementById('btn-road-eta').getBoundingClientRect();
    const walkingEta = document.getElementById('btn-walking-eta').getBoundingClientRect();
    const departure = document.getElementById('departure-time').getBoundingClientRect();
    const mrt3Reference = document.getElementById('btn-mrt3-reference').getBoundingClientRect();
    const fareReference = document.getElementById('btn-fare-reference').getBoundingClientRect();
    const trafficHandoff = document.getElementById('btn-traffic-handoff');
    return { viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, docked: getComputedStyle(sheet).bottom === '0px', handle: Boolean(document.querySelector('.sheet-handle')), gpsReachable: gps.height >= 34, searchReachable: search.height >= 40, roadEtaReachable: roadEta.height >= 40, walkingEtaReachable: walkingEta.height >= 40, departureReachable: departure.height >= 40, mrt3ReferenceReachable: mrt3Reference.height >= 30, fareReferenceReachable: fareReference.height >= 30, trafficHandoff: { href: trafficHandoff.href, target: trafficHandoff.target, rel: trafficHandoff.rel }, departureValue: document.getElementById('departure-time').value };
  })()`);
  if (initialShell.viewportWidth !== 390 || initialShell.viewportHeight !== 844 || !initialShell.docked || !initialShell.handle || !initialShell.gpsReachable || !initialShell.searchReachable || !initialShell.roadEtaReachable || !initialShell.walkingEtaReachable || !initialShell.departureReachable || !initialShell.mrt3ReferenceReachable || !initialShell.fareReferenceReachable || !initialShell.trafficHandoff.href.includes('www.google.com/maps/@') || !initialShell.trafficHandoff.href.includes('layer=traffic') || initialShell.trafficHandoff.target !== '_blank' || !initialShell.trafficHandoff.rel.includes('noopener') || !initialShell.departureValue) throw new Error(`The mobile bottom-sheet shell, reference controls, traffic handoff, or primary touch targets failed their live check: ${JSON.stringify(initialShell)}`);

  await client.send('Browser.grantPermissions', { origin: baseUrl, permissions: ['geolocation'] });
  await client.send('Emulation.setGeolocationOverride', { latitude: 14.6424, longitude: 121.0387, accuracy: 10 }, sessionId);
  await evaluate(client, sessionId, `document.getElementById('btn-gps').click()`);
  let gpsStatus = '';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await delay(200);
    gpsStatus = await evaluate(client, sessionId, `document.getElementById('origin-status').textContent`);
    if (gpsStatus.includes('selected from your current location.')) break;
  }
  if (!gpsStatus.includes('selected from your current location.')) throw new Error(`The live geolocation control did not resolve and reverse-geocode the emulated location. Status: ${gpsStatus}`);

  const enterAndSelect = async (inputId, text, listId) => {
    await evaluate(client, sessionId, `(() => { const input = document.getElementById(${JSON.stringify(inputId)}); input.value = ${JSON.stringify(text)}; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    let ready = { count: 0, status: '' };
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await delay(200);
      ready = await evaluate(client, sessionId, `(() => ({ count: document.querySelectorAll('#${listId} li').length, hasPrimary: Boolean(document.querySelector('#${listId} .suggestion__primary')), hasSecondary: Boolean(document.querySelector('#${listId} .suggestion__secondary')), busy: document.getElementById(${JSON.stringify(inputId)}).getAttribute('aria-busy'), status: document.getElementById(${JSON.stringify(inputId === 'input-origin' ? 'origin-status' : 'destination-status')}).textContent }))()`);
      if (ready.count > 0 && ready.hasPrimary && ready.hasSecondary && ready.busy === 'false') break;
    }
    if (ready.count < 1 || !ready.hasPrimary || !ready.hasSecondary || ready.busy !== 'false') throw new Error(`Expected a completed, rich live recommendation for ${inputId}; received ${JSON.stringify(ready)}.`);
    await evaluate(client, sessionId, `document.querySelector('#${listId} li').click()`);
  };

  await enterAndSelect('input-origin', 'Quezon Avenue', 'origin-suggestions');
  await enterAndSelect('input-destination', 'Ayala', 'destination-suggestions');
  await evaluate(client, sessionId, `(() => { const input = document.getElementById('departure-time'); input.value = '2026-09-01T08:15'; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await evaluate(client, sessionId, `document.getElementById('btn-search').click()`);
  await delay(300);

  const routeState = await evaluate(client, sessionId, `(() => {
    const panel = document.getElementById('results-panel');
    const cards = [...document.querySelectorAll('.route-card')];
    const departureValue = document.getElementById('departure-time').value;
    const demoDisclosure = document.querySelector('.results-provenance')?.textContent || '';
    document.getElementById('btn-map-focus').click();
    const mapFocused = panel.classList.contains('results-panel--map-focus');
    document.getElementById('btn-map-focus').click();
    const beforeReverse = [document.getElementById('input-origin').value, document.getElementById('input-destination').value];
    document.getElementById('btn-reverse').click();
    const afterReverse = [document.getElementById('input-origin').value, document.getElementById('input-destination').value];
    cards[1]?.click();
    return { panelVisible: !panel.hidden, plannerHidden: document.getElementById('search-panel').hidden, routes: cards.length, firstSelected: cards[0]?.classList.contains('route-card--selected'), secondSelected: cards[1]?.classList.contains('route-card--selected'), reversed: beforeReverse[0] === afterReverse[1] && beforeReverse[1] === afterReverse[0], departureValue, demoDisclosure, mapFocused };
  })()`);
  if (!routeState.panelVisible || !routeState.plannerHidden || routeState.routes < 2 || !routeState.secondSelected || !routeState.reversed || routeState.departureValue !== '2026-09-01T08:15' || !routeState.demoDisclosure.includes('Demo fixtures only') || !routeState.mapFocused) throw new Error(`The live route result, source disclosure, selected departure, map focus, planner-sheet dismissal, or reverse-trip interaction failed: ${JSON.stringify(routeState)}`);

  await client.send('Page.navigate', { url: baseUrl }, sessionId);
  await delay(700);
  await enterAndSelect('input-origin', 'Quezon Avenue', 'origin-suggestions');
  await enterAndSelect('input-destination', 'Ayala', 'destination-suggestions');
  await evaluate(client, sessionId, `(() => { const input = document.getElementById('departure-time'); input.value = '2026-08-24T08:00'; input.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('btn-mrt3-reference').click(); })()`);
  await delay(200);
  const mrt3Reference = await evaluate(client, sessionId, `(() => {
    const panel = document.getElementById('results-panel');
    const officialLink = panel.querySelector('.reference-card__link');
    const state = { visible: !panel.hidden, text: panel.textContent, officialLink: officialLink ? { href: officialLink.href, target: officialLink.target, rel: officialLink.rel } : null };
    document.getElementById('btn-close-results').click();
    return { ...state, plannerRecovered: !document.getElementById('search-panel').hidden };
  })()`);
  if (!mrt3Reference.visible || !mrt3Reference.text.includes('Scheduled service reference') || !mrt3Reference.text.includes('3.5 min') || !mrt3Reference.text.includes('not a station arrival') || !mrt3Reference.officialLink?.href.includes('dotrmrt3.gov.ph') || mrt3Reference.officialLink.target !== '_blank' || !mrt3Reference.officialLink.rel.includes('noopener') || !mrt3Reference.plannerRecovered) throw new Error(`The MRT-3 scheduled reference was not clearly labeled, source-linked, or recoverable: ${JSON.stringify(mrt3Reference)}`);
  await evaluate(client, sessionId, `(() => { const input = document.getElementById('departure-time'); input.value = '2026-08-24T02:00'; input.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('btn-mrt3-reference').click(); })()`);
  await delay(200);
  const mrt3BeforeService = await evaluate(client, sessionId, `(() => {
    const panel = document.getElementById('results-panel');
    const state = { visible: !panel.hidden, text: panel.textContent };
    document.getElementById('btn-close-results').click();
    return { ...state, plannerRecovered: !document.getElementById('search-panel').hidden };
  })()`);
  if (!mrt3BeforeService.visible || !mrt3BeforeService.text.includes('Before published service window') || !mrt3BeforeService.text.includes('04:30–23:40') || !mrt3BeforeService.text.includes('cannot confirm a first train or station arrival') || !mrt3BeforeService.plannerRecovered) throw new Error(`The before-service MRT-3 guidance was not clearly labeled or recoverable: ${JSON.stringify(mrt3BeforeService)}`);
  await evaluate(client, sessionId, `document.getElementById('btn-fare-reference').click()`);
  await delay(200);
  const fareReference = await evaluate(client, sessionId, `(() => {
    const panel = document.getElementById('results-panel');
    const image = panel.querySelector('.fare-notice');
    const state = { visible: !panel.hidden, text: panel.textContent, image: image ? { src: image.src, alt: image.alt } : null };
    document.getElementById('btn-close-results').click();
    return { ...state, plannerRecovered: !document.getElementById('search-panel').hidden };
  })()`);
  if (!fareReference.visible || !fareReference.text.includes('not a calculation') || !fareReference.text.includes('does not cover rail fares') || !fareReference.image?.src.includes('ltfrb-puv-fare-notice-user-supplied.png') || !fareReference.image.alt.includes('effective dates') || !fareReference.plannerRecovered) throw new Error(`The dated PUV fare reference was not clearly labeled, rendered, or recoverable: ${JSON.stringify(fareReference)}`);
  await evaluate(client, sessionId, `document.getElementById('btn-walking-eta').click()`);
  await delay(500);
  const walkingEtaUnavailable = await evaluate(client, sessionId, `(() => {
    const panel = document.getElementById('results-panel');
    const handoff = document.getElementById('btn-external-directions-handoff');
    const state = { visible: !panel.hidden, text: panel.textContent, handoff: handoff ? { href: handoff.href, target: handoff.target, rel: handoff.rel } : null };
    document.getElementById('btn-adjust-trip')?.click();
    return { ...state, plannerRecovered: !document.getElementById('search-panel').hidden };
  })()`);
  if (!walkingEtaUnavailable.visible || !walkingEtaUnavailable.text.includes('Walking ETA unavailable.') || !walkingEtaUnavailable.handoff?.href.includes('travelmode=walking') || walkingEtaUnavailable.handoff.target !== '_blank' || !walkingEtaUnavailable.handoff.rel.includes('noopener') || !walkingEtaUnavailable.plannerRecovered) throw new Error(`The unconfigured walking-ETA path did not preserve its external recovery option: ${JSON.stringify(walkingEtaUnavailable)}`);
  await evaluate(client, sessionId, `document.getElementById('btn-road-eta').click()`);
  await delay(500);
  const roadEtaUnavailable = await evaluate(client, sessionId, `(() => {
    const panel = document.getElementById('results-panel');
    const handoff = document.getElementById('btn-external-directions-handoff');
    const state = { visible: !panel.hidden, text: panel.textContent, handoff: handoff ? { href: handoff.href, target: handoff.target, rel: handoff.rel } : null };
    document.getElementById('btn-adjust-trip')?.click();
    return { ...state, plannerRecovered: !document.getElementById('search-panel').hidden };
  })()`);
  if (!roadEtaUnavailable.visible || !roadEtaUnavailable.text.includes('Traffic-aware road ETA unavailable.') || !roadEtaUnavailable.handoff?.href.includes('travelmode=driving') || roadEtaUnavailable.handoff.target !== '_blank' || !roadEtaUnavailable.handoff.rel.includes('noopener') || !roadEtaUnavailable.plannerRecovered) throw new Error(`The unconfigured road-ETA path did not preserve its external recovery option: ${JSON.stringify(roadEtaUnavailable)}`);
  await evaluate(client, sessionId, `document.getElementById('btn-search').click()`);
  await delay(600);
  const unavailableState = await evaluate(client, sessionId, `(() => {
    const paragraphs = [...document.querySelectorAll('#results-panel .results-empty p')].map((element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, text: element.textContent.trim() };
    });
    const handoff = document.getElementById('btn-google-transit-handoff');
    const state = { visible: !document.getElementById('results-panel').hidden, plannerHidden: document.getElementById('search-panel').hidden, text: document.getElementById('results-panel').textContent, paragraphs, handoff: handoff ? { href: handoff.href, target: handoff.target, rel: handoff.rel } : null };
    const recovery = document.getElementById('btn-adjust-trip');
    recovery?.click();
    return { ...state, recoveryAvailable: Boolean(recovery), plannerRecovered: !document.getElementById('search-panel').hidden };
  })()`);
  const textOverlaps = unavailableState.paragraphs.some((paragraph, index) => index > 0 && paragraph.top < unavailableState.paragraphs[index - 1].bottom + 6);
  if (!unavailableState.visible || !unavailableState.plannerHidden || !unavailableState.text.includes('Sakay schedules are unavailable') || !unavailableState.handoff || !unavailableState.handoff.href.includes('www.google.com/maps/dir/') || !unavailableState.handoff.href.includes('travelmode=transit') || unavailableState.handoff.target !== '_blank' || !unavailableState.handoff.rel.includes('noopener') || !unavailableState.recoveryAvailable || !unavailableState.plannerRecovered || textOverlaps) throw new Error(`The no-GTFS transit handoff sheet did not render clearly or recover to the planner. Details: ${JSON.stringify(unavailableState)}`);

  const screenshotPath = resolve(outputDir, 'mobile-route-result.png');
  await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId).then(async ({ data }) => {
    await (await import('node:fs/promises')).writeFile(screenshotPath, Buffer.from(data, 'base64'));
  });
  await access(screenshotPath, constants.R_OK);
  const screenshot = await stat(screenshotPath);
  if (screenshot.size < 5_000) throw new Error('The live mobile interaction screenshot is unexpectedly small.');

  console.log(`Live mobile interaction smoke passed: bottom sheet, departure time, GPS selection, real geocoding selections, demo disclosure, route selection, map focus, distinct walking/driving estimate recovery, reverse trip, and truthful external transit handoff. Artifact: ${screenshotPath} (${screenshot.size} bytes)`);
} finally {
  client?.close();
  chrome.kill('SIGTERM');
}
