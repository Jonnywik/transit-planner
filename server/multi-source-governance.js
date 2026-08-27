/* Transit Operations Calm: classify every source before it can affect a rider-facing route. */
const SOURCE_CLASSES = new Set(['REFERENCE_ONLY', 'STAGING_ONLY', 'APPROVED_STATIC', 'APPROVED_REALTIME', 'EXTERNAL_ROAD_ETA']);
const SOURCE_ROLES = new Set(['STREET_NETWORK', 'SURFACE_TRANSIT_STATIC', 'RAIL_CATALOG', 'RAIL_STATIC', 'RAIL_REALTIME', 'ROAD_ETA', 'ROAD_INTERRUPTION']);
const PRODUCTION_SOURCE_CLASSES = new Set(['APPROVED_STATIC', 'APPROVED_REALTIME']);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseDate(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateSourceRegistry(registry) {
  const errors = [];
  if (registry?.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!['DRAFT', 'APPROVED'].includes(registry?.status)) errors.push('status must be DRAFT or APPROVED.');
  if (!Array.isArray(registry?.profiles) || !registry.profiles.length) errors.push('At least one source profile is required.');
  const ids = new Set();

  for (const profile of registry?.profiles || []) {
    if (!nonEmpty(profile?.id) || ids.has(profile?.id)) errors.push(`Source profile IDs must be unique and non-empty: ${profile?.id || '(missing)'}.`);
    ids.add(profile?.id);
    if (!SOURCE_CLASSES.has(profile?.sourceClass)) errors.push(`Unsupported source class for ${profile?.id || '(missing)'}.`);
    if (!SOURCE_ROLES.has(profile?.role)) errors.push(`Unsupported source role for ${profile?.id || '(missing)'}.`);
    if (!nonEmpty(profile?.lineage) || !nonEmpty(profile?.status)) errors.push(`Source profile ${profile?.id || '(missing)'} requires lineage and status.`);
    if (profile?.canonicalUrl && !profile.canonicalUrl.startsWith('https://')) errors.push(`Source profile ${profile.id} must use an HTTPS canonicalUrl.`);
    if (profile?.sourceClass === 'APPROVED_STATIC' && profile?.status === 'APPROVED') {
      for (const field of ['canonicalUrl', 'rightsEvidence', 'retrievedAt', 'expiresAt', 'sha256', 'dataVersion']) if (!nonEmpty(profile?.[field])) errors.push(`Approved static profile ${profile?.id || '(missing)'} requires ${field}.`);
      if (profile?.retrievedAt && !parseDate(profile.retrievedAt)) errors.push(`Approved profile ${profile.id} has an invalid retrievedAt timestamp.`);
      if (profile?.expiresAt && !parseDate(profile.expiresAt)) errors.push(`Approved profile ${profile.id} has an invalid expiresAt timestamp.`);
      if (profile?.sha256 && !/^[a-f0-9]{64}$/i.test(profile.sha256)) errors.push(`Approved profile ${profile.id} requires a SHA-256 checksum.`);
    }
    if (profile?.sourceClass === 'APPROVED_REALTIME' && profile?.status === 'APPROVED') {
      for (const field of ['canonicalUrl', 'rightsEvidence', 'retrievedAt', 'expiresAt', 'staticDataVersion', 'freshnessSeconds']) if (!nonEmpty(String(profile?.[field] ?? ''))) errors.push(`Approved realtime profile ${profile?.id || '(missing)'} requires ${field}.`);
      if (profile?.retrievedAt && !parseDate(profile.retrievedAt)) errors.push(`Approved profile ${profile.id} has an invalid retrievedAt timestamp.`);
      if (profile?.expiresAt && !parseDate(profile.expiresAt)) errors.push(`Approved profile ${profile.id} has an invalid expiresAt timestamp.`);
      if (!Number.isInteger(Number(profile?.freshnessSeconds)) || Number(profile?.freshnessSeconds) < 1) errors.push(`Approved realtime profile ${profile.id} requires a positive freshnessSeconds value.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function evaluateSourceProfile(profile, { purpose, now = new Date().toISOString() } = {}) {
  const reasons = [];
  if (!profile) reasons.push('SOURCE_PROFILE_MISSING');
  else {
    if (purpose === 'LIVE_TRANSIT' && !PRODUCTION_SOURCE_CLASSES.has(profile.sourceClass)) reasons.push('SOURCE_CLASS_NOT_LIVE_ELIGIBLE');
    if ((purpose === 'REALTIME_TRANSIT' || purpose === 'ROAD_INTERRUPTION') && profile.sourceClass !== 'APPROVED_REALTIME') reasons.push('REALTIME_SOURCE_NOT_APPROVED');
    if (purpose === 'ROAD_ETA' && profile.sourceClass !== 'EXTERNAL_ROAD_ETA') reasons.push('ROAD_ETA_SOURCE_NOT_CONFIGURED');
    if (profile.status !== 'APPROVED' && !(purpose === 'ROAD_ETA' && profile.status === 'CONFIGURED')) reasons.push('SOURCE_STATUS_NOT_APPROVED');
    if (profile.sourceClass === 'APPROVED_STATIC') {
      if (!nonEmpty(profile.rightsEvidence)) reasons.push('SOURCE_RIGHTS_EVIDENCE_MISSING');
      if (!nonEmpty(profile.sha256)) reasons.push('SOURCE_CHECKSUM_MISSING');
      const expiry = parseDate(profile.expiresAt);
      if (!expiry) reasons.push('SOURCE_EXPIRY_MISSING');
      else if (expiry <= Date.parse(now)) reasons.push('SOURCE_EXPIRED');
    }
    if (profile.sourceClass === 'APPROVED_REALTIME') {
      if (!nonEmpty(profile.rightsEvidence)) reasons.push('SOURCE_RIGHTS_EVIDENCE_MISSING');
      const expiry = parseDate(profile.expiresAt);
      if (!expiry) reasons.push('SOURCE_EXPIRY_MISSING');
      else if (expiry <= Date.parse(now)) reasons.push('SOURCE_EXPIRED');
    }
  }
  return { eligible: reasons.length === 0, reasons };
}

export function findSharedLineages(profiles = []) {
  const lineages = new Map();
  for (const profile of profiles) {
    if (!profile?.lineage) continue;
    const existing = lineages.get(profile.lineage) || [];
    existing.push(profile.id);
    lineages.set(profile.lineage, existing);
  }
  return [...lineages.entries()].filter(([, ids]) => ids.length > 1).map(([lineage, ids]) => ({ lineage, ids }));
}

export function buildSourceDisclosure(profile, { retrievedAt = new Date().toISOString() } = {}) {
  return {
    id: profile?.id || 'unknown-source',
    sourceClass: profile?.sourceClass || 'UNAVAILABLE',
    role: profile?.role || 'UNAVAILABLE',
    status: profile?.status || 'UNAVAILABLE',
    retrievedAt,
    liveUse: profile?.sourceClass === 'APPROVED_STATIC' || profile?.sourceClass === 'APPROVED_REALTIME' ? 'governed' : 'not-eligible',
    notes: profile?.notes || 'Source details unavailable.',
  };
}
