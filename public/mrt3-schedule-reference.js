/* Transit Operations Calm: reports published MRT-3 service headways as a scheduled reference, never a live or station-level arrival prediction. */
const WEEKDAY_PERIODS = [
  { start: '04:30', end: '07:00', headway: '4–7 min', label: 'Morning' },
  { start: '07:01', end: '09:00', headway: '3.5 min', label: 'AM peak' },
  { start: '09:01', end: '17:00', headway: '5–5.5 min', label: 'Off-peak' },
  { start: '17:01', end: '19:00', headway: '3.5 min', label: 'PM peak' },
  { start: '19:01', end: '21:30', headway: '5–8 min', label: 'Night' },
  { start: '21:31', end: '23:40', headway: '15 min', label: 'Extended service' },
];

const SATURDAY_PERIODS = [
  { start: '04:30', end: '17:00', headway: '5.5–6 min', label: 'Daytime' },
  { start: '17:01', end: '19:00', headway: '5–5.5 min', label: 'Evening' },
  { start: '19:01', end: '22:40', headway: '6.5–7 min', label: 'Night' },
];

const SUNDAY_PERIODS = [{ start: '04:30', end: '22:40', headway: '6.5–7 min', label: 'Sunday/holiday service' }];

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function selectedTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('A valid local date and time is required for the MRT-3 service reference.');
  return date;
}

export function getMrt3ScheduledHeadwayReference(value) {
  const date = selectedTime(value);
  const day = date.getDay();
  const serviceDay = day === 0 ? 'Sunday/holiday' : day === 6 ? 'Saturday' : 'Weekday';
  const periods = day === 0 ? SUNDAY_PERIODS : day === 6 ? SATURDAY_PERIODS : WEEKDAY_PERIODS;
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();
  const period = periods.find((candidate) => minuteOfDay >= timeToMinutes(candidate.start) && minuteOfDay <= timeToMinutes(candidate.end));
  const firstPeriod = periods[0];
  const lastPeriod = periods.at(-1);
  const firstMinute = timeToMinutes(firstPeriod.start);
  const lastMinute = timeToMinutes(lastPeriod.end);
  const availability = period
    ? 'SCHEDULED_HEADWAY_REFERENCE'
    : minuteOfDay < firstMinute ? 'BEFORE_PUBLISHED_SERVICE_WINDOW' : 'AFTER_PUBLISHED_SERVICE_WINDOW';
  const serviceWindow = `${firstPeriod.start}–${lastPeriod.end}`;
  const guidance = period
    ? `This selected time falls in the published ${period.label.toLowerCase()} period. Use the stated headway as a system-level schedule reference only.`
    : minuteOfDay < firstMinute
      ? `This selected time is before the published ${serviceDay.toLowerCase()} service window of ${serviceWindow}. Sakay cannot confirm a first train or station arrival.`
      : `This selected time is after the published ${serviceDay.toLowerCase()} service window of ${serviceWindow}. Sakay cannot confirm a final train or station arrival.`;
  return {
    availability,
    live: false,
    line: 'MRT-3',
    serviceDay,
    serviceWindow,
    period: period?.label || null,
    publishedWindow: period ? `${period.start}–${period.end}` : null,
    publishedHeadway: period?.headway || null,
    sourceLabel: 'DOTr MRT-3 published schedule',
    sourceUrl: 'https://dotrmrt3.gov.ph/about-us',
    guidance,
    limitation: 'Scheduled system-level reference only. It is not a station arrival, next-train time, vehicle location, delay, or live prediction.',
  };
}
