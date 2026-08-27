import test from 'node:test';
import assert from 'node:assert/strict';
import { MRT3_STATIONS, createMrt3StationReference } from '../public/mrt3-station-reference.js';

test('uses the published MRT-3 station order and regular matrix for a static station reference', () => {
  const reference = createMrt3StationReference({
    originStation: 'North Avenue',
    destinationStation: 'Ayala',
    fareCategory: 'regular',
    departureTime: '2026-08-24T08:00:00',
  });
  assert.equal(MRT3_STATIONS.length, 13);
  assert.equal(reference.availability, 'MRT3_STATION_REFERENCE_READY');
  assert.equal(reference.direction, 'Toward Taft Avenue');
  assert.equal(reference.stationHops, 10);
  assert.deepEqual(reference.intermediateStations, ['Quezon Avenue', 'GMA Kamuning', 'Araneta-Cubao', 'Santolan-Annapolis', 'Ortigas', 'Shaw Boulevard', 'Boni Avenue', 'Guadalupe', 'Buendia']);
  assert.equal(reference.fare.amount, 24);
  assert.equal(reference.fare.currency, 'PHP');
  assert.match(reference.fare.limitation, /does not state an effective date/i);
  assert.equal(reference.service.live, false);
});

test('returns the official concessionary matrix amount and northbound station order', () => {
  const reference = createMrt3StationReference({
    originStation: 'Taft Avenue',
    destinationStation: 'North Avenue',
    fareCategory: 'concessionary',
    departureTime: '2026-08-30T12:00:00',
  });
  assert.equal(reference.direction, 'Toward North Avenue');
  assert.equal(reference.fare.amount, 14);
  assert.equal(reference.fare.categoryLabel, 'Student, senior citizen, or PWD matrix');
  assert.equal(reference.intermediateStations[0], 'Magallanes');
  assert.equal(reference.intermediateStations.at(-1), 'Quezon Avenue');
});

test('rejects stations and fare categories outside the published static reference scope', () => {
  assert.throws(() => createMrt3StationReference({ originStation: 'Ayala', destinationStation: 'Ayala' }), /must be different/);
  assert.throws(() => createMrt3StationReference({ originStation: 'EDSA', destinationStation: 'Ayala' }), /published MRT-3 station/);
  assert.throws(() => createMrt3StationReference({ originStation: 'Ayala', destinationStation: 'Taft Avenue', fareCategory: 'promo' }), /regular or concessionary/);
});
