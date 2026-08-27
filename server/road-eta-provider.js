/* Transit Operations Calm: Google road traffic informs road-mode ETA only, never transit arrival prediction. */
const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export class RoadEtaProviderError extends Error {
  constructor(message, { status = 502, code = 'ROAD_ETA_UNAVAILABLE' } = {}) {
    super(message);
    this.name = 'RoadEtaProviderError';
    this.status = status;
    this.code = code;
  }
}

function coordinate(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new RoadEtaProviderError(`${label} must be a valid coordinate.`, { status: 400, code: 'INVALID_REQUEST' });
  return parsed;
}

function location(value, label) {
  const latitude = coordinate(value?.latitude, `${label} latitude`);
  const longitude = coordinate(value?.longitude, `${label} longitude`);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new RoadEtaProviderError(`${label} is outside valid coordinate bounds.`, { status: 400, code: 'INVALID_REQUEST' });
  return { latitude, longitude };
}

function parseDuration(value) {
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(String(value || ''));
  return match ? Math.round(Number(match[1])) : null;
}

export function validateRoadEtaRequest(request = {}) {
  const origin = location(request.origin, 'Origin');
  const destination = location(request.destination, 'Destination');
  const departure = request.departureTime ? Date.parse(request.departureTime) : Date.now();
  if (!Number.isFinite(departure)) throw new RoadEtaProviderError('Departure time must be an ISO 8601 timestamp.', { status: 400, code: 'INVALID_REQUEST' });
  return { origin, destination, departureTime: new Date(departure).toISOString() };
}

export function normalizeRoadEtaRoute(route = {}) {
  const speedReadingIntervals = route?.travelAdvisory?.speedReadingIntervals || [];
  return {
    durationSeconds: parseDuration(route.duration),
    distanceMeters: Number.isFinite(Number(route.distanceMeters)) ? Number(route.distanceMeters) : null,
    encodedPolyline: typeof route?.polyline?.encodedPolyline === 'string' ? route.polyline.encodedPolyline : null,
    traffic: speedReadingIntervals.map((interval) => ({
      startPolylinePointIndex: Number.isInteger(interval.startPolylinePointIndex) ? interval.startPolylinePointIndex : 0,
      endPolylinePointIndex: Number.isInteger(interval.endPolylinePointIndex) ? interval.endPolylinePointIndex : null,
      speed: ['NORMAL', 'SLOW', 'TRAFFIC_JAM'].includes(interval.speed) ? interval.speed : 'UNKNOWN',
    })),
  };
}

function cacheKey({ origin, destination, departureTime }) {
  const round = (value) => Number(value).toFixed(5);
  const departureBucket = Math.floor(Date.parse(departureTime) / 300_000);
  return [round(origin.latitude), round(origin.longitude), round(destination.latitude), round(destination.longitude), departureBucket].join(':');
}

export function createRoadEtaProvider({
  fetchImpl = globalThis.fetch,
  apiKey = process.env.GOOGLE_ROUTES_API_KEY || '',
  sourceStatus = process.env.GOOGLE_ROUTES_SOURCE_STATUS || 'PENDING_CONFIGURATION',
  endpoint = GOOGLE_ROUTES_ENDPOINT,
  now = () => new Date().toISOString(),
  timestamp = () => Date.now(),
  timeoutMs = 5_000,
  cacheTtlMs = 60_000,
  minimumRequestIntervalMs = 250,
} = {}) {
  const configured = Boolean(apiKey) && sourceStatus === 'CONFIGURED' && endpoint === GOOGLE_ROUTES_ENDPOINT;
  const cache = new Map();
  let lastRequestAt = 0;

  function trafficStatus() {
    return {
      availability: configured ? 'ROAD_ETA_AVAILABLE' : 'ROAD_ETA_UNAVAILABLE',
      trafficLayer: 'MAP_RENDERER_NOT_CONFIGURED',
      source: {
        provider: 'Google Maps Platform',
        scope: 'traffic-aware road ETA for DRIVE requests only',
        status: configured ? 'configured' : 'pending configuration',
        retrievedAt: now(),
      },
    };
  }

  async function estimate(request) {
    const validated = validateRoadEtaRequest(request);
    if (!configured) throw new RoadEtaProviderError('Traffic-aware road ETA is not configured. Transit schedules and train arrivals are not substituted.', { status: 503, code: 'ROAD_ETA_UNAVAILABLE' });
    const key = cacheKey(validated);
    const cached = cache.get(key);
    if (cached && timestamp() - cached.createdAt < cacheTtlMs) return cached.result;
    if (timestamp() - lastRequestAt < minimumRequestIntervalMs) throw new RoadEtaProviderError('Traffic-aware road ETA is busy. Please try again shortly.', { status: 429, code: 'ROAD_ETA_RATE_LIMITED' });
    lastRequestAt = timestamp();
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: validated.origin.latitude, longitude: validated.origin.longitude } } },
          destination: { location: { latLng: { latitude: validated.destination.latitude, longitude: validated.destination.longitude } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          departureTime: validated.departureTime,
          extraComputations: ['TRAFFIC_ON_POLYLINE'],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new RoadEtaProviderError('Traffic-aware road ETA could not be reached. Please try again shortly.', { status: 503, code: 'ROAD_ETA_UNAVAILABLE' });
    }
    if (!response.ok) throw new RoadEtaProviderError('Traffic-aware road ETA is unavailable for this request.', { status: 503, code: 'ROAD_ETA_UNAVAILABLE' });
    const payload = await response.json().catch(() => null);
    const route = payload?.routes?.[0];
    if (!route) return { availability: 'NO_ROAD_ROUTE', roadRoute: null, source: { ...trafficStatus().source, status: 'no route', retrievedAt: now() } };
    const result = {
      availability: 'ROAD_ETA_READY',
      roadRoute: normalizeRoadEtaRoute(route),
      source: { ...trafficStatus().source, status: 'traffic-aware road ETA', retrievedAt: now() },
    };
    cache.set(key, { createdAt: timestamp(), result });
    if (cache.size > 50) cache.delete(cache.keys().next().value);
    return result;
  }

  return { estimate, trafficStatus };
}

export { GOOGLE_ROUTES_ENDPOINT };
