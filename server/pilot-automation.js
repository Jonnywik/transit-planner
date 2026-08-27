/* Transit Operations Calm: deterministic release eligibility. A missing approval always blocks routing. */
const APPROVED = 'APPROVED';
const ALLOWED_SOURCE_STATES = new Set(['PENDING_APPROVAL', APPROVED, 'REJECTED']);
const APPROVED_SOURCE_FIELDS = ['id', 'sourceUrl', 'rightsEvidence', 'approvedAt', 'expiresAt', 'sha256'];

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validTimestamp(value) {
  return nonEmpty(value) && Number.isFinite(Date.parse(value));
}

function sha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function blocked(code, message) {
  return { code, message };
}

export function validatePilotSourcePolicy(policy) {
  const errors = [];
  if (policy?.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!nonEmpty(policy?.pilotId)) errors.push('pilotId is required.');
  if (!['DRAFT', APPROVED].includes(policy?.status)) errors.push('status must be DRAFT or APPROVED.');
  if (!Array.isArray(policy?.sources) || policy.sources.length < 1) errors.push('At least one controlled source is required.');

  const sourceIds = new Set();
  for (const source of policy?.sources || []) {
    if (!nonEmpty(source?.id) || sourceIds.has(source.id)) errors.push(`Source IDs must be unique and non-empty: ${source?.id || '(missing)'}.`);
    sourceIds.add(source?.id);
    if (!ALLOWED_SOURCE_STATES.has(source?.status)) errors.push(`Unsupported source status for ${source?.id || '(missing)'}.`);
    if (source?.status === APPROVED) {
      for (const field of APPROVED_SOURCE_FIELDS) if (!nonEmpty(source[field])) errors.push(`Approved source ${source.id} requires ${field}.`);
      if (source.sourceUrl && !source.sourceUrl.startsWith('https://')) errors.push(`Approved source ${source.id} must use an HTTPS sourceUrl.`);
      if (source.approvedAt && !validTimestamp(source.approvedAt)) errors.push(`Approved source ${source.id} has an invalid approvedAt timestamp.`);
      if (source.expiresAt && !validTimestamp(source.expiresAt)) errors.push(`Approved source ${source.id} has an invalid expiresAt timestamp.`);
      if (source.sha256 && !sha256(source.sha256)) errors.push(`Approved source ${source.id} requires a SHA-256 checksum.`);
    }
  }

  const releaseFields = ['otpApiVersion', 'dataVersion', 'manifestId', 'graphChecksum'];
  if (policy?.status === APPROVED) {
    for (const field of releaseFields) if (!nonEmpty(policy?.release?.[field])) errors.push(`Approved policy release requires ${field}.`);
    if (policy?.release?.graphChecksum && !sha256(policy.release.graphChecksum)) errors.push('Approved policy release requires a SHA-256 graphChecksum.');
  }

  const ready = errors.length === 0 && policy?.status === APPROVED && policy.sources.every((source) => source.status === APPROVED);
  return { valid: errors.length === 0, ready, errors };
}

function addValidationBlockers(reasons, result, code, message) {
  if (!result.valid) reasons.push(blocked(code, `${message}: ${result.errors.join(' ')}`));
  else if (!result.ready) reasons.push(blocked(code, message));
}

function compareRelease(reasons, policy, manifest) {
  const expected = policy?.release || {};
  const actual = manifest?.routing || {};
  if (expected.otpApiVersion !== actual.otpApiVersion) reasons.push(blocked('OTP_VERSION_MISMATCH', 'The manifest OTP version does not match the approved release policy.'));
  if (expected.dataVersion !== actual.dataVersion) reasons.push(blocked('DATA_VERSION_MISMATCH', 'The manifest data version does not match the approved release policy.'));
  if (expected.manifestId !== manifest?.release?.manifestId) reasons.push(blocked('MANIFEST_ID_MISMATCH', 'The manifest identifier does not match the approved release policy.'));
  if (expected.graphChecksum !== manifest?.release?.graphChecksum) reasons.push(blocked('GRAPH_CHECKSUM_MISMATCH', 'The graph checksum does not match the approved release policy.'));
}

function compareSources(reasons, policy, manifest, checkedAt) {
  const manifestSources = new Map((manifest?.sources || []).map((source) => [source.id, source]));
  for (const source of policy?.sources || []) {
    const manifestSource = manifestSources.get(source.id);
    if (!manifestSource) {
      reasons.push(blocked('SOURCE_MISSING_FROM_MANIFEST', `Approved source ${source.id} is missing from the release manifest.`));
      continue;
    }
    if (source.status !== APPROVED) continue;
    if (source.sourceUrl !== manifestSource.sourceUrl || source.sha256 !== manifestSource.sha256) reasons.push(blocked('SOURCE_PROVENANCE_MISMATCH', `Source ${source.id} differs from the approved policy.`));
    if (Date.parse(source.expiresAt) <= Date.parse(checkedAt)) reasons.push(blocked('SOURCE_EXPIRED', `Source ${source.id} has reached its approved expiry.`));
  }
}

function assessGoldenAssurance(reasons, policy, report) {
  if (!report) {
    reasons.push(blocked('GOLDEN_ASSURANCE_REPORT_MISSING', 'No approved golden-route assurance report is available.'));
    return;
  }
  if (report.status !== 'PASSED') reasons.push(blocked('GOLDEN_ASSURANCE_FAILED', 'The latest golden-route assurance report is not fully passed.'));
  if (report.manifestId !== policy?.release?.manifestId) reasons.push(blocked('GOLDEN_ASSURANCE_MANIFEST_MISMATCH', 'The golden-route assurance report does not identify the approved manifest.'));
  if (report.graphChecksum !== policy?.release?.graphChecksum) reasons.push(blocked('GOLDEN_ASSURANCE_GRAPH_MISMATCH', 'The golden-route assurance report does not identify the approved graph.'));
}

export function evaluatePilotRelease({ policy, manifest, goldenSuite, assuranceReport, checkedAt = new Date().toISOString(), validateManifest, validateGoldenSuite } = {}) {
  const reasons = [];
  const policyValidation = validatePilotSourcePolicy(policy);
  addValidationBlockers(reasons, policyValidation, 'SOURCE_POLICY_NOT_READY', 'The controlled source policy is not approved for automated release');

  const manifestValidation = validateManifest?.(manifest) || { valid: false, ready: false, errors: ['No manifest validator configured.'] };
  addValidationBlockers(reasons, manifestValidation, 'MANIFEST_NOT_READY', 'The pilot manifest is not approved for live routing');

  const goldenValidation = validateGoldenSuite?.(goldenSuite) || { valid: false, ready: false, errors: ['No golden-route validator configured.'] };
  addValidationBlockers(reasons, goldenValidation, 'GOLDEN_SUITE_NOT_READY', 'The golden-route suite is not approved');

  if (policyValidation.ready && manifestValidation.ready) {
    compareSources(reasons, policy, manifest, checkedAt);
    compareRelease(reasons, policy, manifest);
  }
  if (policyValidation.ready && goldenValidation.ready) assessGoldenAssurance(reasons, policy, assuranceReport);

  return {
    status: reasons.length ? 'BLOCKED' : 'ELIGIBLE',
    eligible: reasons.length === 0,
    checkedAt,
    reasons,
    inputs: {
      pilotId: policy?.pilotId || null,
      policyReady: policyValidation.ready,
      manifestReady: manifestValidation.ready,
      goldenSuiteReady: goldenValidation.ready,
      assuranceStatus: assuranceReport?.status || 'MISSING',
    },
  };
}

export function createFileReleaseGate({ readFile, statePath = process.env.PILOT_RELEASE_STATE_PATH || '' } = {}) {
  return async function releaseGate() {
    if (!statePath) return { eligible: false, reason: 'PILOT_RELEASE_STATE_PATH is not configured.' };
    try {
      const state = JSON.parse(await readFile(statePath, 'utf8'));
      return { eligible: state?.eligible === true && state?.status === 'ELIGIBLE', reason: state?.reasons?.[0]?.message || null };
    } catch {
      return { eligible: false, reason: 'Pilot release readiness state is unavailable.' };
    }
  };
}
