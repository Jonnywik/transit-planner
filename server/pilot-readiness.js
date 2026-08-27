export class PilotReadinessError extends Error {
  constructor(message, { status = 503, code = 'PILOT_DATA_UNVERIFIED' } = {}) {
    super(message);
    this.name = 'PilotReadinessError';
    this.status = status;
    this.code = code;
  }
}

function requiredString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildPilotSource({ otpVersion, dataVersion, manifestId, supportBoundary, retrievedAt, now = () => new Date().toISOString() } = {}) {
  const missing = [
    ['OTP_API_VERSION', otpVersion],
    ['OTP_DATA_VERSION', dataVersion],
    ['OTP_DATA_MANIFEST_ID', manifestId],
    ['OTP_SUPPORT_BOUNDARY', supportBoundary],
  ].filter(([, value]) => !requiredString(value)).map(([key]) => key);

  if (missing.length) {
    throw new PilotReadinessError(`Pilot schedule data is not approved for rider use. Missing provenance: ${missing.join(', ')}.`);
  }

  return {
    provider: 'OpenTripPlanner',
    apiVersion: otpVersion.trim(),
    dataVersion: dataVersion.trim(),
    manifestId: manifestId.trim(),
    supportBoundary: supportBoundary.trim(),
    retrievedAt: retrievedAt || now(),
    status: 'schedule',
    fareStatus: 'UNAVAILABLE',
  };
}
