/* Transit Operations Calm: journey results carry explicit availability and source metadata. */
(function () {
  'use strict';

  window.SakayRouting = {
    async plan({ origin, destination, departureTime, limit = 3 }, signal) {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ origin, destination, departureTime, limit }),
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || 'Routing service is unavailable.');
        error.code = payload.code || 'ROUTING_ERROR';
        error.source = payload.source || null;
        throw error;
      }
      return payload;
    },
  };
})();
