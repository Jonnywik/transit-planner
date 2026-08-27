/* Transit Operations Calm: creates user-initiated, provider-owned Google Maps directions links without importing, caching, or presenting returned route content. */
const SUPPORTED_TRAVEL_MODES = new Set(['driving', 'walking', 'transit', 'bicycling', 'two-wheeler']);

function coordinate(value, label, minimum, maximum) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new TypeError(`A valid ${label} is required for the directions handoff.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new TypeError(`A valid ${label} is required for the directions handoff.`);
  }
  return parsed;
}

function location(value, label) {
  return {
    latitude: coordinate(value?.latitude, `${label} latitude`, -90, 90),
    longitude: coordinate(value?.longitude, `${label} longitude`, -180, 180),
  };
}

export function createGoogleDirectionsUrl({ origin, destination, travelMode } = {}) {
  if (!SUPPORTED_TRAVEL_MODES.has(travelMode)) throw new TypeError('A supported Google Maps travel mode is required for the directions handoff.');
  const from = location(origin, 'Origin');
  const to = location(destination, 'Destination');
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', `${from.latitude},${from.longitude}`);
  url.searchParams.set('destination', `${to.latitude},${to.longitude}`);
  url.searchParams.set('travelmode', travelMode);
  return url.toString();
}
