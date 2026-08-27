/* Transit Operations Calm: static MRT-3 station-reference routing and official matrix lookup only; never claims live operations, a general itinerary, or a current fare guarantee. */
import { getMrt3ScheduledHeadwayReference } from './mrt3-schedule-reference.js';

export const MRT3_STATIONS = [
  'North Avenue',
  'Quezon Avenue',
  'GMA Kamuning',
  'Araneta-Cubao',
  'Santolan-Annapolis',
  'Ortigas',
  'Shaw Boulevard',
  'Boni Avenue',
  'Guadalupe',
  'Buendia',
  'Ayala',
  'Magallanes',
  'Taft Avenue',
];

const REGULAR_FARES = [
  [null, 13, 13, 16, 16, 20, 20, 20, 24, 24, 24, 28, 28],
  [13, null, 13, 13, 16, 16, 20, 20, 20, 24, 24, 24, 28],
  [13, 13, null, 13, 13, 16, 16, 20, 20, 20, 24, 24, 24],
  [16, 13, 13, null, 13, 13, 16, 16, 20, 20, 20, 24, 24],
  [16, 16, 13, 13, null, 13, 13, 16, 16, 20, 20, 20, 24],
  [20, 16, 16, 13, 13, null, 13, 13, 16, 16, 20, 20, 20],
  [20, 20, 16, 16, 13, 13, null, 13, 13, 16, 16, 20, 20],
  [20, 20, 20, 16, 16, 13, 13, null, 13, 13, 16, 16, 20],
  [24, 20, 20, 20, 16, 16, 13, 13, null, 13, 13, 16, 16],
  [24, 24, 20, 20, 20, 16, 16, 13, 13, null, 13, 13, 16],
  [24, 24, 24, 20, 20, 20, 16, 16, 13, 13, null, 13, 13],
  [28, 24, 24, 24, 20, 20, 20, 16, 16, 13, 13, null, 13],
  [28, 28, 24, 24, 24, 20, 20, 20, 16, 16, 13, 13, null],
];

const CONCESSIONARY_FARES = REGULAR_FARES.map((row) => row.map((fare) => fare === null ? null : Math.floor(fare / 2)));

const FARE_CATEGORIES = {
  regular: {
    label: 'Regular matrix',
    sourceUrl: 'https://dotrmrt3.gov.ph/fare-matrix.pdf',
    sourceLabel: 'DOTr MRT-3 Regular Fare Matrix',
    fares: REGULAR_FARES,
  },
  concessionary: {
    label: 'Student, senior citizen, or PWD matrix',
    sourceUrl: 'https://dotrmrt3.gov.ph/discounted-fare-matrix.pdf',
    sourceLabel: 'DOTr MRT-3 Student, Senior Citizen, and PWD Fare Matrix',
    fares: CONCESSIONARY_FARES,
  },
};

function stationIndex(value, field) {
  const index = MRT3_STATIONS.indexOf(value);
  if (index === -1) throw new TypeError(`${field} must be a published MRT-3 station.`);
  return index;
}

function fareCategory(value) {
  if (!Object.hasOwn(FARE_CATEGORIES, value)) throw new TypeError('Fare category must be regular or concessionary.');
  return FARE_CATEGORIES[value];
}

function stationsBetween(originIndex, destinationIndex) {
  if (destinationIndex > originIndex) return MRT3_STATIONS.slice(originIndex + 1, destinationIndex);
  return MRT3_STATIONS.slice(destinationIndex + 1, originIndex).reverse();
}

export function createMrt3StationReference({ originStation, destinationStation, fareCategory: selectedFareCategory = 'regular', departureTime } = {}) {
  const originIndex = stationIndex(originStation, 'Origin station');
  const destinationIndex = stationIndex(destinationStation, 'Destination station');
  if (originIndex === destinationIndex) throw new TypeError('Origin and destination must be different MRT-3 stations.');
  const category = fareCategory(selectedFareCategory);
  const amount = category.fares[originIndex][destinationIndex];
  if (!Number.isFinite(amount)) throw new TypeError('The selected MRT-3 station pair has no published fare reference.');
  const southbound = destinationIndex > originIndex;
  return {
    availability: 'MRT3_STATION_REFERENCE_READY',
    live: false,
    line: 'MRT-3',
    originStation,
    destinationStation,
    direction: southbound ? 'Toward Taft Avenue' : 'Toward North Avenue',
    stationHops: Math.abs(destinationIndex - originIndex),
    intermediateStations: stationsBetween(originIndex, destinationIndex),
    fare: {
      amount,
      currency: 'PHP',
      category: selectedFareCategory,
      categoryLabel: category.label,
      sourceUrl: category.sourceUrl,
      sourceLabel: category.sourceLabel,
      limitation: 'Official matrix reference only. Confirm the posted fare at the station; the matrix PDF itself does not state an effective date, and Sakay does not verify eligibility or payment amount.',
    },
    service: getMrt3ScheduledHeadwayReference(departureTime),
    limitation: 'Static MRT-3 station reference only. It does not calculate walking access, transfers, another rail line, bus/jeepney legs, a live timetable, a train arrival, or a current service status.',
  };
}
