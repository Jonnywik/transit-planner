/* Transit Operations Calm: fallback mode declares unavailable transit honestly and never derives transit estimates from map or road data. */
export function createInformationGuideStatus({ roadEtaProvider, walkingEtaProvider, now = () => new Date().toISOString() } = {}) {
  function capabilities() {
    return {
      mode: 'INFORMATION_GUIDE',
      generatedAt: now(),
      transitRouting: {
        availability: 'UNAVAILABLE',
        code: 'NO_GOVERNED_TRANSIT_SCHEDULE',
        message: 'Current governed transit schedules are not connected. Sakay cannot show transit routes, next-train times, or vehicle arrivals.',
      },
      roadEta: roadEtaProvider?.trafficStatus?.() || { availability: 'ROAD_ETA_UNAVAILABLE' },
      walkingEta: walkingEtaProvider?.walkingStatus?.() || { availability: 'WALKING_ETA_UNAVAILABLE' },
      mapContext: {
        availability: 'ADVISORY_ONLY',
        message: 'Map context does not confirm closures, interruptions, accessibility, or transit operations.',
      },
    };
  }

  return { capabilities };
}
