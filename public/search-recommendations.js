/* Signal Ribbon — local, deterministic ranking for cached place recommendations.
   It never contacts a provider; the browser remains limited to the same-origin geocoding boundary. */
function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en');
}

function scorePlace(place, query) {
  const normalizedQuery = normalize(query);
  const label = normalize(place?.label);
  const primary = normalize(place?.primaryLabel);
  if (!normalizedQuery || !label) return -1;

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const labelWords = label.split(/[\s,.-]+/).filter(Boolean);
  let score = 0;
  if (primary.startsWith(normalizedQuery)) score += 200;
  else if (label.startsWith(normalizedQuery)) score += 120;
  else if (primary.includes(normalizedQuery)) score += 80;
  else if (label.includes(normalizedQuery)) score += 40;
  else return -1;

  score += queryWords.reduce((total, word) => total + (labelWords.some((labelWord) => labelWord.startsWith(word)) ? 12 : 0), 0);
  return score;
}

export function rankRecommendations(places = [], query, limit = 5) {
  const unique = new Map();
  for (const place of places) {
    if (!place?.placeId || unique.has(place.placeId)) continue;
    const score = scorePlace(place, query);
    if (score >= 0) unique.set(place.placeId, { place, score });
  }
  return [...unique.values()]
    .sort((a, b) => b.score - a.score || String(a.place.label).localeCompare(String(b.place.label), 'en'))
    .slice(0, limit)
    .map(({ place }) => place);
}

export function mergeRecommendationCache(previous = [], incoming = [], limit = 15) {
  const unique = new Map();
  for (const place of [...incoming, ...previous]) {
    if (place?.placeId && !unique.has(place.placeId)) unique.set(place.placeId, place);
  }
  return [...unique.values()].slice(0, limit);
}
