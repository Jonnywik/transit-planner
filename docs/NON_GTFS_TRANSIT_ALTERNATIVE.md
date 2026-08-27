# Non-GTFS Transit Alternative

## Selected alternative: external Google Maps transit handoff

Sakay retains its transit-search function without requiring Sakay to receive, store, or build a graph from GTFS. After a rider selects an origin and destination, the transit action now constructs a universal Google Maps Directions URL with `api=1`, both selected coordinate pairs, and `travelmode=transit`. It opens Google Maps in a separate tab or installed app, where the provider decides whether transit directions are available and what times or options it presents. Google documents Maps URLs as a cross-platform way to launch transit directions without an API key. [1]

Sakay **does not receive, parse, cache, display, draw, rank, or verify** the external itinerary. This preserves a useful transit discovery action while avoiding the extraction of Google route content into Sakay’s Leaflet map. Google’s Routes API policy requires results shown on a map to appear on a Google Map and requires visible attribution for content displayed outside one; a URL handoff avoids mixing provider route output into the current non-Google map. [2]

## Capability boundaries

| Sakay action | Current behavior | What it does not claim |
|---|---|---|
| Transit action with selected places | Opens the selected locations in Google Maps with transit mode requested. | That a route exists, that Google coverage is complete, or that the external time is a Sakay-verified result. |
| Transit action without selected places | Explains that locations must be selected first. | A route from raw typed text or inferred coordinates. |
| Sakay route API | Remains blocked until a governed GTFS/OTP release exists. | A GTFS-backed itinerary, fare, stop time, transfer, or next-vehicle time. |
| Drive ETA | Remains separately configured and driving-only. | A bus, jeepney, train, or total transit journey estimate. |
| Walk ETA | Remains separately configured and network-walking-only. | Pedestrian safety, sidewalk condition, or accessibility. |

## Why the other reviewed option is not selected

Transitland’s routing API is not an immediate alternative for the Metro Manila service. Its current beta documentation describes routing coverage as current United States operators, with worldwide routing planned for the future; it also notes that the service is powered by GTFS archives and does not use GTFS-Realtime updates. [3] It therefore cannot satisfy the requested non-GTFS, current Metro Manila transit alternative today.

## Ongoing limitations

The external handoff does not transfer Sakay’s selected departure date/time because the documented universal Maps Directions URL parameters include origin, destination, and travel mode but not a supported transit date/time parameter. Sakay consequently does not state that the external route corresponds to the requested local departure time.

The handoff is an external-provider experience, not a replacement for a governed live transit service. Sakay’s own route results remain unavailable until it can satisfy the full source-rights, static-data, graph, golden-route, and release-eligibility gates. This preserves the option to add an approved GTFS/OTP service later without deleting the handoff.

## References

[1]: https://developers.google.com/maps/documentation/urls/get-started "Google Maps URLs: Get Started"
[2]: https://developers.google.com/maps/documentation/routes/policies "Google Routes API: Policies and Attributions"
[3]: https://www.transit.land/documentation/routing-platform/transitland-routing-api/ "Transitland v2 Routing API Documentation"
