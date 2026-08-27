/* Transit Operations Calm: walking estimates require an approved routing provider and do not assert accessibility or pedestrian safety. */
const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export class WalkingEtaProviderError extends Error {
  constructor(message, { status = 502, code = 'WALKING_ETA_UNAVAILABLE' } = {}) {
    super(message);
    this.name = 'WalkingEtaProviderError';
    this.status = status;
    this.code = code;
  }
}

function coordinate(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new WalkingEtaProviderError(`${label} must be a valid coordinate.`, { status: 400, code: 'INVALID_REQUEST' });
  return parsed;
}

function location(value, label) {
  const latitude = coordinate(value?.latitude, `${label} latitude`);
  const longitude = coordinate(value?.longitude, `${label} longitude`);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new WalkingEtaProviderError(`${label} is outside valid coordinate bounds.`, { status: 400, code: 'INVALID_REQUEST' });
  return { latitude, longitude };
}

function parseDuration(value) {
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(String(value || ''));
  return match ? Math.round(Number(match[1])) : null;
}

export function validateWalkingEtaRequest(request = {}) {
  return { origin: location(request.origin, 'Origin'), destination: location(request.destination, 'Destination') };
}

export function createWalkingEtaProvider({
  fetchImpl = globalThis.fetch,
  apiKey = process.env.GOOGLE_ROUTES_API_KEY || '',
  sourceStatus = process.env.GOOGLE_WALKING_ETA_SOURCE_STATUS || 'PENDING_CONFIGURATION',
  endpoint = GOOGLE_ROUTES_ENDPOINT,
  now = () => new Date().toISOString(),
  timeoutMs = 5_000,
} = {}) {
  const configured = Boolean(apiKey) && sourceStatus === 'CONFIGURED' && endpoint === GOOGLE_ROUTES_ENDPOINT;

  function walkingStatus() {
    return {
      availability: configured ? 'WALKING_ETA_AVAILABLE' : 'WALKING_ETA_UNAVAILABLE',
      source: {
        provider: 'Google Maps Platform',
        scope: 'network-based WALK route estimate only; not an accessibility or pedestrian-safety assessment',
        status: configured ? 'configured' : 'pending configuration',
        retrievedAt: now(),
      },
    };
  }

  async function estimate(request) {
    const validated = validateWalkingEtaRequest(request);
    if (!configured) throw new WalkingEtaProviderError('Walking ETA is not configured. Sakay does not estimate walking time from straight-line distance.', { status: 503, code: 'WALKING_ETA_UNAVAILABLE' });
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline' },
        body: JSON.stringify({
          origin: { location: { latLng: validated.origin } },
          destination: { location: { latLng: validated.destination } },
          travelMode: 'WALK',
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new WalkingEtaProviderError('Walking ETA could not be reached. Please try again shortly.', { status: 503, code: 'WALKING_ETA_UNAVAILABLE' });
    }
    if (!response.ok) throw new WalkingEtaProviderError('Walking ETA is unavailable for this request.', { status: 503, code: 'WALKING_ETA_UNAVAILABLE' });
    const payload = await response.json().catch(() => null);
    const route = payload?.routes?.[0];
    if (!route) return { availability: 'NO_WALKING_ROUTE', walkingRoute: null, source: { ...walkingStatus().source, status: 'no route', retrievedAt: now() } };
    return {
      availability: 'WALKING_ETA_READY',
      walkingRoute: {
        durationSeconds: parseDuration(route.duration),
        distanceMeters: Number.isFinite(Number(route.distanceMeters)) ? Number(route.distanceMeters) : null,
        encodedPolyline: typeof route?.polyline?.encodedPolyline === 'string' ? route.polyline.encodedPolyline : null,
      },
      source: { ...walkingStatus().source, status: 'network-based walking estimate', retrievedAt: now() },
    };
  }

  return { estimate, walkingStatus };
}
