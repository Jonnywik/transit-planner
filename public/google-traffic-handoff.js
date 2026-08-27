/* Transit Operations Calm: launches the provider-owned Google Maps traffic view externally and never renders provider traffic content on Sakay’s Leaflet map. */
function coordinate(value, label, minimum, maximum) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new TypeError(`A valid ${label} is required for the traffic handoff.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new TypeError(`A valid ${label} is required for the traffic handoff.`);
  }
  return parsed;
}

export function createGoogleTrafficMapUrl({ latitude, longitude, zoom = 12 } = {}) {
  const lat = coordinate(latitude, 'latitude', -90, 90);
  const lng = coordinate(longitude, 'longitude', -180, 180);
  const safeZoom = Number.isInteger(zoom) && zoom >= 0 && zoom <= 21 ? zoom : 12;
  const url = new URL('https://www.google.com/maps/@');
  url.searchParams.set('api', '1');
  url.searchParams.set('map_action', 'map');
  url.searchParams.set('center', `${lat},${lng}`);
  url.searchParams.set('zoom', String(safeZoom));
  url.searchParams.set('layer', 'traffic');
  return url.toString();
}
