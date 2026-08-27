/* Transit Operations Calm: fallback mode declares unavailable Sakay transit routing honestly while offering only a user-initiated external transit handoff. */
export function createInformationGuideStatus({ roadEtaProvider, walkingEtaProvider, now = () => new Date().toISOString() } = {}) {
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
