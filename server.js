import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GatewayError, createGeocodingGateway } from './server/geocoding-gateway.js';
import { RoutingProviderError, createOtpRoutingProvider } from './server/routing-provider.js';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

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

async function handleApi(request, response, url, geocodingGateway, routingProvider) {
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

    return sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    const knownError = error instanceof GatewayError || error instanceof RoutingProviderError;
    const status = knownError ? error.status : 500;
    const message = knownError ? error.message : 'An unexpected service error occurred.';
    return sendJson(response, status, { error: message, code: knownError ? error.code || null : 'INTERNAL_ERROR' });
  }
}

function serveStatic(response, pathname, rootDir) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(rootDir, requestedPath));
  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found.');
    return;
  }

  response.writeHead(200, {
    'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.tile.openstreetmap.org; img-src 'self' data: https://*.tile.openstreetmap.org https://3000-itph7nc61pkgr18fbw6gh-aca06218.sg1.manus.computer; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; script-src 'self' https://unpkg.com; font-src 'self' https://fonts.gstatic.com;",
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(response);
}

export function createSakayServer({
  rootDir = resolve(fileURLToPath(new URL('.', import.meta.url))),
  geocodingGateway = createGeocodingGateway(),
  routingProvider = createOtpRoutingProvider(),
} = {}) {
  return createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      handleApi(request, response, url, geocodingGateway, routingProvider);
      return;
    }
    serveStatic(response, url.pathname, rootDir);
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
