/* Transit Operations Calm: fallback mode declares unavailable Sakay transit routing honestly while offering only a user-initiated external transit handoff. */
export function createInformationGuideStatus({ roadEtaProvider, walkingEtaProvider, roadInterruptionProvider, now = () => new Date().toISOString() } = {}) {
  function capabilities() {
    return {
      mode: 'INFORMATION_GUIDE',
      generatedAt: now(),
      transitRouting: {
        availability: 'EXTERNAL_HANDOFF_ONLY',
        code: 'NO_GOVERNED_TRANSIT_SCHEDULE',
        message: 'Current governed transit schedules are not connected. Sakay cannot calculate or display a transit itinerary, next-train time, or vehicle arrival.',
        handoff: {
          availability: 'AVAILABLE',
          provider: 'Google Maps',
          scope: 'opens the rider-selected origin and destination in Google Maps transit directions; route availability and time are determined by Google Maps',
          message: 'Google Maps may offer transit directions for the selected locations. Sakay does not import, verify, or cache the itinerary.',
        },
      },
      externalDirections: {
        availability: 'AVAILABLE',
        provider: 'Google Maps',
        scope: 'opens rider-selected origin and destination in an external Google Maps driving or walking directions view when a configured Sakay estimate is unavailable',
        message: 'Google Maps determines any external route and time. Sakay does not import, verify, or cache the provider result.',
      },
      roadEta: roadEtaProvider?.trafficStatus?.() || { availability: 'ROAD_ETA_UNAVAILABLE' },
      walkingEta: walkingEtaProvider?.walkingStatus?.() || { availability: 'WALKING_ETA_UNAVAILABLE' },
      roadInterruptions: roadInterruptionProvider?.status?.() || {
        availability: 'VERIFIED_INTERRUPTION_UNAVAILABLE',
        code: 'NO_APPROVED_ROAD_INTERRUPTION_SOURCE',
        message: 'No current approved authority road-interruption source is connected. Sakay cannot claim road closures.',
      },
      mapContext: {
        availability: 'ADVISORY_ONLY',
        message: 'Map context does not confirm closures, interruptions, accessibility, or transit operations.',
      },
    };
  }

  return { capabilities };
}
