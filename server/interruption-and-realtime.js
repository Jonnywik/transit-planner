/* Transit Operations Calm: evidence and freshness decide whether conditions affect routing or rider claims. */
import { evaluateSourceProfile } from './multi-source-governance.js';

const INTERRUPTION_CONFIDENCE = new Set(['MAPPED_BASELINE', 'ADVISORY_UNVERIFIED', 'VERIFIED_ACTIVE']);
const INTERRUPTION_SEVERITY = new Set(['INFO', 'MINOR', 'MAJOR', 'CRITICAL']);

function timestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateInterruption(interruption) {
  const errors = [];
  if (!interruption?.id) errors.push('id is required.');
  if (!interruption?.sourceId) errors.push('sourceId is required.');
  if (!INTERRUPTION_CONFIDENCE.has(interruption?.confidence)) errors.push('confidence must be MAPPED_BASELINE, ADVISORY_UNVERIFIED, or VERIFIED_ACTIVE.');
  if (!INTERRUPTION_SEVERITY.has(interruption?.severity)) errors.push('severity must be INFO, MINOR, MAJOR, or CRITICAL.');
  if (!timestamp(interruption?.publishedAt)) errors.push('publishedAt must be an ISO timestamp.');
  if (!timestamp(interruption?.expiresAt)) errors.push('expiresAt must be an ISO timestamp.');
  if (!interruption?.affected?.kind || !interruption?.affected?.ids?.length) errors.push('affected kind and at least one ID are required.');
  return { valid: errors.length === 0, errors };
}

export function evaluateInterruption(interruption, sourceProfile, { now = new Date().toISOString() } = {}) {
  const validation = validateInterruption(interruption);
  if (!validation.valid) return { status: 'INTERRUPTION_INVALID', routingImpact: false, reasons: validation.errors };
  if (timestamp(interruption.expiresAt) <= Date.parse(now)) return { status: 'INTERRUPTION_EXPIRED', routingImpact: false, reasons: ['INTERRUPTION_EXPIRED'] };
  if (interruption.confidence !== 'VERIFIED_ACTIVE') {
    return { status: interruption.confidence, routingImpact: false, reasons: ['INTERRUPTION_ADVISORY_ONLY'] };
  }
  const source = evaluateSourceProfile(sourceProfile, { purpose: 'ROAD_INTERRUPTION', now });
  if (!source.eligible) return { status: 'VERIFIED_SOURCE_UNAVAILABLE', routingImpact: false, reasons: source.reasons };
  return { status: 'VERIFIED_ACTIVE', routingImpact: true, reasons: [] };
}

export function evaluateRailArrival({ staticProfile, realtimeProfile, update, now = new Date().toISOString() } = {}) {
  const staticSource = evaluateSourceProfile(staticProfile, { purpose: 'LIVE_TRANSIT', now });
  const realtimeSource = evaluateSourceProfile(realtimeProfile, { purpose: 'REALTIME_TRANSIT', now });
  if (!realtimeSource.eligible) {
    return staticSource.eligible
      ? { status: 'SCHEDULED_ESTIMATE', live: false, reasons: ['LIVE_TRANSIT_UPDATE_UNAVAILABLE'] }
      : { status: 'SCHEDULE_UNAVAILABLE', live: false, reasons: staticSource.reasons };
  }
  if (realtimeProfile.staticDataVersion !== staticProfile?.dataVersion) return { status: 'LIVE_TRANSIT_UNAVAILABLE', live: false, reasons: ['REALTIME_STATIC_VERSION_MISMATCH'] };
  if (!update?.tripId || !update?.stopId || !timestamp(update.updatedAt)) return { status: 'LIVE_TRANSIT_UNAVAILABLE', live: false, reasons: ['REALTIME_UPDATE_INVALID'] };
  const freshnessSeconds = Number(realtimeProfile.freshnessSeconds);
  if (!Number.isInteger(freshnessSeconds) || freshnessSeconds < 1 || Date.parse(now) - timestamp(update.updatedAt) > freshnessSeconds * 1000) {
    return { status: 'LIVE_TRANSIT_UNAVAILABLE', live: false, reasons: ['REALTIME_UPDATE_STALE'] };
  }
  return { status: 'LIVE_TRANSIT_UPDATE', live: true, reasons: [] };
}
