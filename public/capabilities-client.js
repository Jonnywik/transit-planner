/* Signal Ribbon: information-guide availability is retrieved only from Sakay's same-origin service. */
export function createCapabilitiesClient({ fetchImpl = globalThis.fetch } = {}) {
  return {
    async get() {
      const response = await fetchImpl('/api/capabilities');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || 'Guide capability information is unavailable.');
        error.code = payload.code || 'CAPABILITIES_UNAVAILABLE';
        throw error;
      }
      return payload;
    },
  };
}
