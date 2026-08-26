/* Transit Operations Calm: deterministic selected-place and stale-request state. */
export function createSearchRequestState() {
  let version = 0;
  let selectedPlace = null;

  return {
    beginInput() {
      version += 1;
      selectedPlace = null;
      return version;
    },
    select(place) {
      version += 1;
      selectedPlace = place || null;
      return selectedPlace;
    },
    isCurrent(candidateVersion) {
      return candidateVersion === version;
    },
    selected() {
      return selectedPlace;
    },
  };
}
