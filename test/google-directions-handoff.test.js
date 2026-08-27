import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleDirectionsUrl } from '../public/google-directions-handoff.js';

const trip = { origin: { latitude: 14.5995, longitude: 120.9842 }, destination: { latitude: 14.5547, longitude: 121.0244 } };

test('creates user-initiated external driving and walking directions with selected coordinates only', () => {
  for (const travelMode of ['driving', 'walking']) {
    const url = new URL(createGoogleDirectionsUrl({ ...trip, travelMode }));
    assert.equal(url.origin, 'https://www.google.com');
    assert.equal(url.pathname, '/maps/dir/');
    assert.equal(url.searchParams.get('api'), '1');
    assert.equal(url.searchParams.get('origin'), '14.5995,120.9842');
    assert.equal(url.searchParams.get('destination'), '14.5547,121.0244');
    assert.equal(url.searchParams.get('travelmode'), travelMode);
    assert.equal(url.searchParams.has('departure_time'), false);
  }
});

test('rejects unsupported travel modes and incomplete selected coordinates', () => {
  assert.throws(() => createGoogleDirectionsUrl({ ...trip, travelMode: 'rail' }), /supported Google Maps travel mode/);
  assert.throws(() => createGoogleDirectionsUrl({ origin: { latitude: 14.5 }, destination: trip.destination, travelMode: 'walking' }), /Origin longitude/);
});
