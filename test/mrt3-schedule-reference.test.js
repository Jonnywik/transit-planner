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
  assert.equal(reference.availability, 'BEFORE_PUBLISHED_SERVICE_WINDOW');
  assert.equal(reference.live, false);
  assert.equal(reference.publishedHeadway, null);
  assert.equal(reference.serviceWindow, '04:30–23:40');
  assert.match(reference.guidance, /before the published weekday service window/i);
  assert.match(reference.guidance, /cannot confirm a first train or station arrival/i);
});

test('reports after-service guidance instead of estimating a final train arrival', () => {
  const reference = getMrt3ScheduledHeadwayReference('2026-08-30T23:15:00');
  assert.equal(reference.availability, 'AFTER_PUBLISHED_SERVICE_WINDOW');
  assert.equal(reference.live, false);
  assert.equal(reference.serviceWindow, '04:30–22:40');
  assert.match(reference.guidance, /after the published sunday\/holiday service window/i);
  assert.match(reference.guidance, /cannot confirm a final train or station arrival/i);
});
