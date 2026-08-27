import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleTrafficMapUrl } from '../public/google-traffic-handoff.js';

test('builds an external Google Maps traffic-layer handoff around a valid map center', () => {
  const url = new URL(createGoogleTrafficMapUrl({ latitude: 14.5995, longitude: 120.9842 }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/@');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('map_action'), 'map');
  assert.equal(url.searchParams.get('center'), '14.5995,120.9842');
  assert.equal(url.searchParams.get('layer'), 'traffic');
});

test('rejects missing traffic handoff coordinates', () => {
  assert.throws(() => createGoogleTrafficMapUrl({ latitude: null, longitude: 121 }), /valid latitude/);
});
