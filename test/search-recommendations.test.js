import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeRecommendationCache, rankRecommendations } from '../public/search-recommendations.js';

const places = [
  { placeId: '1', primaryLabel: 'Ayala Triangle Gardens', label: 'Ayala Triangle Gardens, Makati, Metro Manila' },
  { placeId: '2', primaryLabel: 'Ayala MRT Station', label: 'Ayala MRT Station, Makati, Metro Manila' },
  { placeId: '3', primaryLabel: 'Makati City Hall', label: 'Makati City Hall, Makati, Metro Manila' },
];

test('ranks cached address recommendations by the primary label and typed query', () => {
  assert.deepEqual(rankRecommendations(places, 'aya').map((place) => place.placeId), ['2', '1']);
  assert.deepEqual(rankRecommendations(places, 'makati').map((place) => place.placeId), ['3', '2', '1']);
  assert.deepEqual(rankRecommendations(places, 'zzzz'), []);
});

test('merges fresh address results ahead of older cached results without duplicates', () => {
  const merged = mergeRecommendationCache([places[0], places[1]], [places[1], places[2]]);
  assert.deepEqual(merged.map((place) => place.placeId), ['2', '3', '1']);
});
