# No-GTFS Information-Guide Mode

## Purpose

When Sakay does not have a current, rights-cleared GTFS Schedule source, it now operates in **Information Guide** mode. This preserves map discovery and separately labeled route-time tools without pretending to offer a transit schedule, transit itinerary, next-train time, vehicle arrival, fare, verified road closure, or accessibility guarantee.

`GET /api/capabilities` provides the machine-readable state used by the rider interface. In the current mode it returns `NO_GOVERNED_TRANSIT_SCHEDULE` with an `EXTERNAL_HANDOFF_ONLY` transit capability. Selecting the transit action retains a useful next step: when both rider-selected coordinates are available, Sakay opens a Google Maps Directions URL with transit mode requested. Sakay does not call a transit API, import a returned itinerary, or identify the provider’s time as a Sakay result.

## Available estimate types

| Capability | User-facing label | Required source | Fallback state | What the result does not claim |
|---|---|---|---|---|
| Driving | Traffic-aware driving estimate | Authorized Google Routes API configuration | `ROAD_ETA_UNAVAILABLE` | Bus/jeepney/train time, total transit journey, confirmed closure |
| Walking | Network walking estimate | Independently enabled Google Routes walking request | `WALKING_ETA_UNAVAILABLE` | Sidewalk condition, crossing safety, step-free access, or accessibility |
| Driving recovery | Open driving directions in Google Maps | Rider-selected coordinates and the Google Maps universal Directions URL | `EXTERNAL_HANDOFF_ONLY` | That Sakay calculated, verified, cached, or displays the provider’s driving route or time |
| Walking recovery | Open walking directions in Google Maps | Rider-selected coordinates and the Google Maps universal Directions URL | `EXTERNAL_HANDOFF_ONLY` | That Sakay calculated, verified, cached, or displays the provider’s walking route or time |
| Transit | Open transit options | Rider-selected coordinates and the Google Maps universal Directions URL | `EXTERNAL_HANDOFF_ONLY` | That Google Maps has a route, that its route/time is verified by Sakay, or any next-vehicle prediction |
| MRT-3 timing | MRT-3 schedule reference | Published DOTr MRT-3 operating-period headway table | `SCHEDULED_HEADWAY_REFERENCE` | A next-train time, station arrival, vehicle location, delay, or live prediction |
| PUV fare notice | User-supplied PUV fare notice | Dated image supplied to Sakay | `REFERENCE_ONLY` | A current calculated fare, route-specific fare, or rail fare |
| Traffic visibility | Live traffic in Google Maps | External Google Maps universal URL | `EXTERNAL_HANDOFF_ONLY` | A traffic layer inside Sakay, a road closure, or a verified interruption |
| Road interruptions | Verified interruption status | Pending authority-source/provider status boundary | `VERIFIED_INTERRUPTION_UNAVAILABLE` | That an OSM map feature, traffic condition, or missing feed confirms a closure |
| Map context | Map context | Attributed OSM tiles and separately governed overlays | `ADVISORY_ONLY` | Closure, interruption, safety, accessibility, or operating-status confirmation |

Both estimate providers are same-origin server boundaries with source/retrieval disclosure. They reject invalid coordinates and never fall back to a straight-line duration. The driving service adds traffic-aware routing; the walking service uses a network walking route. Google documents walking as a Routes API travel mode but marks walking routes as beta; this is why Sakay’s wording avoids accessibility or pedestrian-safety claims. [1]

## No-touch capability reporting

`npm run information-guide:readiness` writes a non-public report to `artifacts/information-guide/status.json`. The daily pilot-readiness workflow includes this report along with pilot and multi-source readiness. It makes no ETA, schedule, or provider request; its `networkRequestsMade` value is always zero.

## External transit handoff

Google Maps URLs are universal cross-platform launch links and need no API key. The handoff URL uses `api=1`, URL-encoded selected origin/destination coordinates, and `travelmode=transit`; it deliberately does **not** include a requested Sakay departure time or an assertion that a route is available. [2] The link opens in a separate tab or compatible Google Maps app, and no external route geometry, steps, fare, schedule, or traffic content appears within Sakay’s Leaflet map.

This is not a replacement for an authorized provider-backed integration. If Sakay later uses a Google Routes `TRANSIT` response, Google’s policy requires the associated content to be shown on a Google Map or, when outside a Google Map, accompanied by compliant attribution; any such integration also requires an authorized server-side API key and a reviewed rendering architecture. [3]

## Scheduled headway and fare references

The MRT-3 reference selects one published operational period for the rider’s selected local date/time and reports only the stated system-wide headway range. It cannot compute a reliable next arrival by adding intervals from the start of the operating day, because planned headways vary by period and do not establish that a specific train ran or reached a specific station. The reference links to the official DOTr MRT-3 published schedule. [4]

The PUV fare image supplied to Sakay is displayed as a dated reference, not a fare calculator. Its own headings have different stated effective dates and its vehicle categories do not include rail. The product continues to display route fares as unavailable until an approved, current source for the exact route and vehicle class exists. [5]

## Traffic and interruption boundaries

The **Live traffic in Google Maps** control opens the provider-owned traffic-layer view externally. Google documents Maps URLs as a no-key cross-platform launch mechanism, including the `layer=traffic` parameter; this avoids displaying Google traffic content inside the Leaflet map. [6] Traffic is congestion information, not closure verification.

`GET /api/road-interruptions/status` now exposes a provider-ready unavailable state. It records the absence of a current approved authority source and makes no event, geometry, closure, safety, or routing-impact claim. A real feed remains blocked until it meets the source-governance acceptance criteria documented in `docs/REQUESTED_ARRIVAL_FARE_TRAFFIC_INTERRUPTION_DECISION.md`.

## Mobile visual verification

The 390 × 844 mobile smoke artifact was reviewed after the handoff control was added. The **Walk ETA**, **Drive ETA**, and **Open transit options** actions remain visible at the bottom of the planning sheet after a user selects both locations. The map-level notice distinguishes an unavailable Sakay schedule from an external transit option. This preserves the map-first layout and keeps the distinction visible.

## Re-enabling live transit routing

Information Guide mode does not weaken the project’s controlled live-routing plan. To replace the unavailable-transit state, the system still needs a current direct GTFS source with use rights, a validated and checksummed OSM input, a reproducible graph under a pinned OTP version, a controlled GraphQL endpoint, complete provenance configuration, a passing 20-case golden-route report, and an `ELIGIBLE` pilot-release state. See `docs/LIVE_TRANSIT_ROUTING_IMPLEMENTATION_PLAN.md`.

## Reference

[1]: https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteTravelMode "Google Routes API RouteTravelMode"
[2]: https://developers.google.com/maps/documentation/urls/get-started "Google Maps URLs: Get Started"
[3]: https://developers.google.com/maps/documentation/routes/policies "Google Routes API: Policies and Attributions"
[4]: https://dotrmrt3.gov.ph/about-us "DOTr MRT-3: Train Schedule"
[5]: https://www.foi.gov.ph/agencies/ltfrb/how-fare-matrix-is-made/ "LTFRB FOI response: How Fare Matrix is made"
[6]: https://developers.google.com/maps/documentation/urls/get-started "Google Maps URLs: Get Started"
