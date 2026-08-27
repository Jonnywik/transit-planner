/* Signal Ribbon: walking estimation is a same-origin, explicitly limited information-guide capability. */
export function createWalkingEtaClient({ fetchImpl = globalThis.fetch } = {}) {
  async function sendRequest(path, options) {
    const response = await fetchImpl(path, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'Walking ETA is unavailable.');
      error.code = payload.code || 'WALKING_ETA_UNAVAILABLE';
      error.source = payload.source;
      throw error;
    }
    return payload;
  }
  return {
    estimate(payload) { return sendRequest('/api/walking-eta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); },
    status() { return sendRequest('/api/walking-eta/status'); },
  };
}
