import test from 'node:test';
import assert from 'node:assert/strict';
import { getMrt3ScheduledHeadwayReference } from '../public/mrt3-schedule-reference.js';

test('reports the official weekday peak headway as a non-live scheduled reference', () => {
  const reference = getMrt3ScheduledHeadwayReference('2026-08-24T08:00:00');
  assert.equal(reference.availability, 'SCHEDULED_HEADWAY_REFERENCE');
  assert.equal(reference.serviceDay, 'Weekday');
  assert.equal(reference.publishedHeadway, '3.5 min');
  assert.equal(reference.live, false);
  assert.match(reference.limitation, /not a station arrival/i);
});

test('reports service-window absence rather than inventing an overnight train arrival', () => {
  const reference = getMrt3ScheduledHeadwayReference('2026-08-24T02:00:00');
  assert.equal(reference.availability, 'OUTSIDE_PUBLISHED_SERVICE_WINDOW');
  assert.equal(reference.live, false);
  assert.equal(reference.publishedHeadway, null);
});
