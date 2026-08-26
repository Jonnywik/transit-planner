/* Transit Operations Calm: the browser only talks to a controlled same-origin provider boundary. */
export function createGeocodingClient({ fetchImpl = globalThis.fetch, baseUrl = globalThis.location?.origin || 'http://localhost' } = {}) {
  async function request(path, params, signal) {
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'Location service is unavailable.');
      error.code = payload.code || 'GEOCODING_ERROR';
      throw error;
    }
    return payload;
  }

  return {
    async search(query, signal) {
      const payload = await request('/api/geocode/search', { q: query }, signal);
      return payload.places || [];
    },
    async reverse(latitude, longitude, signal) {
      const payload = await request('/api/geocode/reverse', { lat: latitude, lon: longitude }, signal);
      return payload.place || null;
    },
  };
}
