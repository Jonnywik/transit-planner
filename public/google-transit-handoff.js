/* Transit Operations Calm: creates a user-initiated Google Maps transit handoff, never imports or fabricates third-party itineraries. */
function coordinate(value, label, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new TypeError(`A valid ${label} is required for the transit handoff.`);
  }
  return parsed;
}

function location(value, label) {
  return {
    latitude: coordinate(value?.latitude, `${label} latitude`, -90, 90),
    longitude: coordinate(value?.longitude, `${label} longitude`, -180, 180),
  };
}

export function createGoogleTransitDirectionsUrl({ origin, destination } = {}) {
  const from = location(origin, 'Origin');
  const to = location(destination, 'Destination');
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', `${from.latitude},${from.longitude}`);
  url.searchParams.set('destination', `${to.latitude},${to.longitude}`);
  url.searchParams.set('travelmode', 'transit');
  return url.toString();
}
