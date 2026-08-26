/* Transit Operations Calm: the browser only talks to a controlled same-origin provider boundary. */
(function () {
  'use strict';

  async function request(path, params, signal) {
    const url = new URL(path, window.location.origin);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Location service is unavailable.');
    return payload;
  }

  window.SakayGeocoding = {
    async search(query, signal) {
      const payload = await request('/api/geocode/search', { q: query }, signal);
      return payload.places || [];
    },
    async reverse(latitude, longitude, signal) {
      const payload = await request('/api/geocode/reverse', { lat: latitude, lon: longitude }, signal);
      return payload.place || null;
    },
  };
})();
