/* Transit Operations Calm: exposes verified-road-interruption availability without inventing events, source authority, or a closure feed. */
export function createRoadInterruptionProvider({
  sourceStatus = process.env.ROAD_INTERRUPTION_SOURCE_STATUS || 'PENDING_APPROVAL',
  sourceId = process.env.ROAD_INTERRUPTION_SOURCE_ID || 'operator-road-interruptions',
  now = () => new Date().toISOString(),
} = {}) {
  function status() {
    const approved = sourceStatus === 'APPROVED';
    return {
      availability: approved ? 'VERIFIED_INTERRUPTION_PROVIDER_REQUIRED' : 'VERIFIED_INTERRUPTION_UNAVAILABLE',
      code: approved ? 'NO_CONNECTED_VERIFIED_INTERRUPTION_PROVIDER' : 'NO_APPROVED_ROAD_INTERRUPTION_SOURCE',
      source: {
        sourceId,
        status: approved ? 'approved source profile; provider connection required' : 'pending approval',
        retrievedAt: now(),
      },
      message: approved
        ? 'An approved source profile exists, but no verified road-interruption provider is connected. Sakay cannot claim road closures.'
        : 'No current approved authority road-interruption source is connected. Sakay cannot claim road closures.',
      limitation: 'Traffic congestion and map context do not verify a road closure, incident, open road, or safe passage.',
    };
  }

  return { status };
}
