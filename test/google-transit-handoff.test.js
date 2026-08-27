import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleTransitDirectionsUrl } from '../public/google-transit-handoff.js';

test('builds a universal user-initiated Google Maps transit handoff from selected coordinates', () => {
  const url = new URL(createGoogleTransitDirectionsUrl({
    origin: { latitude: 14.62, longitude: 121.05 },
    destination: { latitude: 14.55, longitude: 121.02 },
  }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('origin'), '14.62,121.05');
  assert.equal(url.searchParams.get('destination'), '14.55,121.02');
  assert.equal(url.searchParams.get('travelmode'), 'transit');
});

test('does not create a transit handoff from invalid coordinates', () => {
  assert.throws(() => createGoogleTransitDirectionsUrl({ origin: { latitude: 'x', longitude: 121 }, destination: { latitude: 14, longitude: 121 } }), /valid Origin latitude/);
});
