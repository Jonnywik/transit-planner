import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GatewayError, createGeocodingGateway } from './server/geocoding-gateway.js';
import { RoutingProviderError, createOtpRoutingProvider } from './server/routing-provider.js';
import { RoadEtaProviderError, createRoadEtaProvider } from './server/road-eta-provider.js';
import { createInformationGuideStatus } from './server/information-guide.js';
import { WalkingEtaProviderError, createWalkingEtaProvider } from './server/walking-eta-provider.js';
import { createRoadInterruptionProvider } from './server/road-interruption-provider.js';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const defaultPublicRoot = resolve(projectRoot, 'public');

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new RoutingProviderError('Request body is too large.', { status: 413, code: 'REQUEST_TOO_LARGE' });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RoutingProviderError('Request body must be valid JSON.', { status: 400, code: 'INVALID_REQUEST' });
  }
}

async function handleApi(request, response, url, geocodingGateway, routingProvider, roadEtaProvider, walkingEtaProvider, roadInterruptionProvider, informationGuide) {
  try {
    if (request.method === 'GET' && url.pathname === '/api/geocode/search') {
      const places = await geocodingGateway.search(url.searchParams.get('q'));
      return sendJson(response, 200, { places });
    }

    if (request.method === 'GET' && url.pathname === '/api/geocode/reverse') {
      const places = await geocodingGateway.reverse(url.searchParams.get('lat'), url.searchParams.get('lon'));
      return sendJson(response, 200, { place: places[0] || null });
    }

    if (request.method === 'POST' && url.pathname === '/api/routes') {
      const requestBody = await readJsonBody(request);
      const result = await routingProvider.plan(requestBody, request.headers['accept-language'] || 'en');
      return sendJson(response, 200, result);
    }

    if (request.method === 'POST' && url.pathname === '/api/road-eta') {
      const requestBody = await readJsonBody(request);
      const result = await roadEtaProvider.estimate(requestBody);
      return sendJson(response, 200, result);
    }

    if (request.method === 'GET' && url.pathname === '/api/traffic/status') {
      return sendJson(response, 200, roadEtaProvider.trafficStatus());
    }

    if (request.method === 'GET' && url.pathname === '/api/capabilities') {
      return sendJson(response, 200, informationGuide.capabilities());
    }

    if (request.method === 'POST' && url.pathname === '/api/walking-eta') {
      const requestBody = await readJsonBody(request);
      const result = await walkingEtaProvider.estimate(requestBody);
      return sendJson(response, 200, result);
    }

    if (request.method === 'GET' && url.pathname === '/api/walking-eta/status') {
      return sendJson(response, 200, walkingEtaProvider.walkingStatus());
    }

    if (request.method === 'GET' && url.pathname === '/api/road-interruptions/status') {
      return sendJson(response, 200, roadInterruptionProvider.status());
    }

    return sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    const knownError = error instanceof GatewayError || error instanceof RoutingProviderError || error instanceof RoadEtaProviderError || error instanceof WalkingEtaProviderError;
    const status = knownError ? error.status : 500;
    const message = knownError ? error.message : 'An unexpected service error occurred.';
    return sendJson(response, status, { error: message, code: knownError ? error.code || null : 'INTERNAL_ERROR' });
  }
}

function denyStaticPath(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  response.end('Not found.');
}

function serveStatic(request, response, pathname, rootDir) {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    response.end('Method not allowed.');
    return;
  }

  const requestedPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const hasHiddenPathSegment = requestedPath.split('/').some((segment) => segment.startsWith('.'));
  const filePath = resolve(rootDir, requestedPath);
  const escapesPublicRoot = relative(rootDir, filePath).startsWith('..');
  if (hasHiddenPathSegment || escapesPublicRoot || !existsSync(filePath)) {
    denyStaticPath(response);
    return;
  }

  response.writeHead(200, {
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self' https://*.tile.openstreetmap.org; img-src 'self' data: https://*.tile.openstreetmap.org https://3000-itph7nc61pkgr18fbw6gh-aca06218.sg1.manus.computer; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; script-src 'self' https://unpkg.com; font-src 'self' https://fonts.gstatic.com;",
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).on('error', () => {
    if (!response.headersSent) denyStaticPath(response);
    else response.destroy();
  }).pipe(response);
}

export function createSakayServer({
  rootDir = defaultPublicRoot,
  geocodingGateway = createGeocodingGateway(),
  routingProvider = createOtpRoutingProvider(),
  roadEtaProvider = createRoadEtaProvider(),
  walkingEtaProvider = createWalkingEtaProvider(),
  roadInterruptionProvider = createRoadInterruptionProvider(),
  informationGuide = createInformationGuideStatus({ roadEtaProvider, walkingEtaProvider, roadInterruptionProvider }),
} = {}) {
  return createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      handleApi(request, response, url, geocodingGateway, routingProvider, roadEtaProvider, walkingEtaProvider, roadInterruptionProvider, informationGuide);
      return;
    }
    serveStatic(request, response, url.pathname, rootDir);
  });
}

export function startServer({ port = Number(process.env.PORT || 3000), ...options } = {}) {
  const server = createSakayServer(options);
  server.listen(port, () => {
    const address = server.address();
    const listeningPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Sakay is running at http://localhost:${listeningPort}`);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer();
