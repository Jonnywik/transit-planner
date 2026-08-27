/* Signal Ribbon: road ETA stays a same-origin, explicitly road-only request. */
export function createRoadEtaClient({ fetchImpl = globalThis.fetch, endpoint = '/api/road-eta' } = {}) {
  return {
    async estimate(payload, signal) {
      const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Traffic-aware road ETA is unavailable.');
      return body;
    },
    async trafficStatus(signal) {
      const response = await fetchImpl('/api/traffic/status', { signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Traffic status is unavailable.');
      return body;
    },
  };
}
