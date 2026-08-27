const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MIN_UPSTREAM_INTERVAL_MS = 1000;

export class GatewayError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
  }
}

export function validateSearchQuery(query) {
  const normalized = String(query || '').trim();
  if (normalized.length < 3 || normalized.length > 120) {
    throw new GatewayError('Enter at least three characters and no more than 120 characters.', 400);
  }
  return normalized;
}

export function validateCoordinates(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new GatewayError('Enter valid latitude and longitude values.', 400);
  }
  return { latitude, longitude };
}

export function normalizePlace(place) {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !place.display_name) return null;

  const labelParts = String(place.display_name).split(',').map((part) => part.trim()).filter(Boolean);

  return {
    placeId: `${place.osm_type || 'place'}-${place.osm_id || `${latitude},${longitude}`}`,
    label: labelParts.slice(0, 3).join(', '),
    primaryLabel: labelParts[0],
    secondaryLabel: labelParts.slice(1, 3).join(', '),
    latitude,
    longitude,
  };
}

export function createGeocodingGateway({
  fetchImpl = globalThis.fetch,
  baseUrl = process.env.GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org',
  userAgent = process.env.GEOCODER_USER_AGENT || '',
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  minUpstreamIntervalMs = DEFAULT_MIN_UPSTREAM_INTERVAL_MS,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const cache = new Map();
  let lastUpstreamRequestAt = 0;
  let requestQueue = Promise.resolve();

  async function throttledFetch(url) {
    const nextRequest = requestQueue.then(async () => {
      if (!userAgent.trim()) {
        throw new GatewayError('Location service is not configured. Contact the service operator.', 503);
      }
      const elapsed = now() - lastUpstreamRequestAt;
      const waitTime = Math.max(0, minUpstreamIntervalMs - elapsed);
      if (waitTime) await sleep(waitTime);
      lastUpstreamRequestAt = now();

      const response = await fetchImpl(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en',
          'User-Agent': userAgent,
        },
      });

      if (!response.ok) {
        throw new GatewayError('Location service is unavailable. Please try again shortly.', 502);
      }
      return response.json();
    });

    requestQueue = nextRequest.catch(() => undefined);
    return nextRequest;
  }

  async function requestPlaces(pathname, params, cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.createdAt < cacheTtlMs) return cached.value;

    const url = new URL(pathname, baseUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const payload = await throttledFetch(url);
    const rawPlaces = Array.isArray(payload) ? payload : [payload];
    const places = rawPlaces.map(normalizePlace).filter(Boolean);
    cache.set(cacheKey, { createdAt: now(), value: places });
    return places;
  }

  return {
    search(query) {
      const validQuery = validateSearchQuery(query);
      return requestPlaces('/search', {
        q: validQuery,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'ph',
        viewbox: '120.85,14.75,121.15,14.45',
        bounded: '1',
      }, `search:${validQuery.toLocaleLowerCase('en')}`);
    },
    reverse(lat, lon) {
      const { latitude, longitude } = validateCoordinates(lat, lon);
      return requestPlaces('/reverse', {
        format: 'jsonv2',
        lat: String(latitude),
        lon: String(longitude),
        zoom: '18',
        addressdetails: '1',
      }, `reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`);
    },
  };
}
