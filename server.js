import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GatewayError, createGeocodingGateway } from './server/geocoding-gateway.js';

const rootDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 3000);
const gateway = createGeocodingGateway();

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

async function handleApi(request, response, url) {
  try {
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' });

    if (url.pathname === '/api/geocode/search') {
      const places = await gateway.search(url.searchParams.get('q'));
      return sendJson(response, 200, { places });
    }

    if (url.pathname === '/api/geocode/reverse') {
      const places = await gateway.reverse(url.searchParams.get('lat'), url.searchParams.get('lon'));
      return sendJson(response, 200, { place: places[0] || null });
    }

    return sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    const status = error instanceof GatewayError ? error.status : 500;
    const message = error instanceof GatewayError ? error.message : 'An unexpected location-service error occurred.';
    return sendJson(response, status, { error: message });
  }
}

function serveStatic(response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(rootDir, requestedPath));
  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found.');
    return;
  }

  response.writeHead(200, {
    'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.tile.openstreetmap.org; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; script-src 'self' https://unpkg.com; font-src 'self' https://fonts.gstatic.com;",
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(request, response, url);
    return;
  }
  serveStatic(response, url.pathname);
});

server.listen(port, () => {
  console.log(`Sakay is running at http://localhost:${port}`);
});
