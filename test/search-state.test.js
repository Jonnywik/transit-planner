import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchRequestState } from '../search-state.js';

test('invalidates stale autocomplete responses when a user continues typing', () => {
  const state = createSearchRequestState();
  const firstRequest = state.beginInput();
  const secondRequest = state.beginInput();
  assert.equal(state.isCurrent(firstRequest), false);
  assert.equal(state.isCurrent(secondRequest), true);
});

test('preserves a selected place only until the next manual input change', () => {
  const state = createSearchRequestState();
  const place = { placeId: 'node-1', label: 'Ayala', latitude: 14.55, longitude: 121.02 };
  state.select(place);
  assert.deepEqual(state.selected(), place);
  state.beginInput();
  assert.equal(state.selected(), null);
});
