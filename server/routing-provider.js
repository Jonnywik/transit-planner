import { buildPilotSource, PilotReadinessError } from './pilot-readiness.js';

const OTP_PLAN_CONNECTION_QUERY = `
  query SakayPlanConnection($origin: PlanLabeledLocationInput!, $destination: PlanLabeledLocationInput!, $dateTime: PlanDateTimeInput!, $first: Int!) {
    planConnection(origin: $origin, destination: $destination, dateTime: $dateTime, first: $first) {
      edges {
        node {
          start
          end
          legs {
            mode
            distance
            from { name lat lon departure { scheduledTime estimated { time delay } } }
            to { name lat lon arrival { scheduledTime estimated { time delay } } }
            route { gtfsId longName shortName }
            legGeometry { points }
          }
        }
      }
    }
  }
`;

export class RoutingProviderError extends Error {
  constructor(message, { status = 502, code = 'ROUTING_ERROR' } = {}) {
    super(message);
    this.name = 'RoutingProviderError';
    this.status = status;
    this.code = code;
  }
}

function coordinate(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new RoutingProviderError(`${label} must be a valid coordinate.`, { status: 400, code: 'INVALID_REQUEST' });
  return parsed;
}

function location(value, label) {
  const latitude = coordinate(value?.latitude, `${label} latitude`);
  const longitude = coordinate(value?.longitude, `${label} longitude`);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new RoutingProviderError(`${label} is outside valid coordinate bounds.`, { status: 400, code: 'INVALID_REQUEST' });
  }
  return { latitude, longitude };
}

export function validateRouteRequest(request = {}) {
  const origin = location(request.origin, 'Origin');
  const destination = location(request.destination, 'Destination');
  const parsedTime = request.departureTime ? Date.parse(request.departureTime) : Date.now();
  if (!Number.isFinite(parsedTime)) {
    throw new RoutingProviderError('Departure time must be an ISO 8601 timestamp.', { status: 400, code: 'INVALID_REQUEST' });
  }
  const limit = Math.max(1, Math.min(3, Number.parseInt(request.limit, 10) || 3));
  return { origin, destination, departureTime: new Date(parsedTime).toISOString(), limit };
}

export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([latitude / 1e5, longitude / 1e5]);
  }
  return points;
}

function normalizeTime(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLeg(leg) {
  const from = {
    name: leg?.from?.name || 'Origin',
    lat: coordinate(leg?.from?.lat, 'Leg origin latitude'),
    lng: coordinate(leg?.from?.lon, 'Leg origin longitude'),
  };
  const to = {
    name: leg?.to?.name || 'Destination',
    lat: coordinate(leg?.to?.lat, 'Leg destination latitude'),
    lng: coordinate(leg?.to?.lon, 'Leg destination longitude'),
  };
  const departure = normalizeTime(leg?.from?.departure?.estimated?.time || leg?.from?.departure?.scheduledTime);
  const arrival = normalizeTime(leg?.to?.arrival?.estimated?.time || leg?.to?.arrival?.scheduledTime);
  const duration = departure !== null && arrival !== null ? Math.max(0, Math.round((arrival - departure) / 60000)) : null;
  const path = decodePolyline(leg?.legGeometry?.points);

  return {
    mode: leg?.mode || 'WALK',
    from,
    to,
    duration,
    distance: Number.isFinite(Number(leg?.distance)) ? Math.round(Number(leg.distance)) : null,
    route: leg?.route?.shortName || leg?.route?.longName || null,
    routeId: leg?.route?.gtfsId || null,
    intermediateStops: [],
    path: path.length > 1 ? path : [[from.lat, from.lng], [to.lat, to.lng]],
    scheduledDeparture: leg?.from?.departure?.scheduledTime || null,
    scheduledArrival: leg?.to?.arrival?.scheduledTime || null,
  };
}

export function normalizeItineraries(planConnection = {}) {
  return (planConnection.edges || []).map(({ node }, index) => {
    const legs = (node?.legs || []).map(normalizeLeg);
    const start = normalizeTime(node?.start);
    const end = normalizeTime(node?.end);
    const totalDuration = start !== null && end !== null ? Math.max(0, Math.round((end - start) / 60000)) : legs.reduce((sum, leg) => sum + (leg.duration || 0), 0);
    const transitLegs = legs.filter((leg) => leg.mode !== 'WALK');
    return {
      id: `otp-${index}-${node?.start || 'unknown'}`,
      totalDuration,
      transfers: Math.max(0, transitLegs.length - 1),
      fare: null,
      legs,
      source: 'schedule',
    };
  });
}

export function createOtpRoutingProvider({
  fetchImpl = globalThis.fetch,
  endpoint = process.env.OTP_GRAPHQL_URL || '',
  otpVersion = process.env.OTP_API_VERSION || '',
  dataVersion = process.env.OTP_DATA_VERSION || null,
  dataManifestId = process.env.OTP_DATA_MANIFEST_ID || '',
  supportBoundary = process.env.OTP_SUPPORT_BOUNDARY || '',
  now = () => new Date().toISOString(),
} = {}) {
  async function plan(request, acceptLanguage = 'en') {
    const validated = validateRouteRequest(request);
    if (!endpoint || !otpVersion) {
      throw new RoutingProviderError('Routing service is not configured. This prototype cannot provide live journey guidance yet.', { status: 503, code: 'ROUTING_UNAVAILABLE' });
    }

    let source;
    try {
      source = buildPilotSource({ otpVersion, dataVersion, manifestId: dataManifestId, supportBoundary, now });
    } catch (error) {
      if (error instanceof PilotReadinessError) {
        throw new RoutingProviderError(error.message, { status: error.status, code: 'ROUTING_UNAVAILABLE' });
      }
      throw error;
    }

    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': acceptLanguage,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: OTP_PLAN_CONNECTION_QUERY,
          variables: {
            origin: { location: { coordinate: validated.origin } },
            destination: { location: { coordinate: validated.destination } },
            dateTime: { earliestDeparture: validated.departureTime },
            first: validated.limit,
          },
        }),
      });
    } catch {
      throw new RoutingProviderError('Routing service could not be reached. Please try again shortly.', { status: 503, code: 'ROUTING_UNAVAILABLE' });
    }

    if (!response.ok) {
      throw new RoutingProviderError('Routing service returned an unavailable response. Please try again shortly.', { status: 503, code: 'ROUTING_UNAVAILABLE' });
    }

    const payload = await response.json().catch(() => null);
    if (!payload || payload.errors?.length) {
      throw new RoutingProviderError('Routing service could not process this journey request.', { status: 502, code: 'ROUTING_RESPONSE_INVALID' });
    }

    const itineraries = normalizeItineraries(payload.data?.planConnection);
    return {
      availability: itineraries.length ? 'READY' : 'NO_ROUTE',
      itineraries,
      source,
    };
  }

  return { plan };
}

export { OTP_PLAN_CONNECTION_QUERY };
