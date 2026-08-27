# No-GTFS Information-Guide Mode

## Purpose

When Sakay does not have a current, rights-cleared GTFS Schedule source, it now operates in **Information Guide** mode. This preserves map discovery and separately labeled route-time tools without pretending to offer a transit schedule, transit itinerary, next-train time, vehicle arrival, fare, verified road closure, or accessibility guarantee.

`GET /api/capabilities` provides the machine-readable state used by the rider interface. In the current mode it returns `NO_GOVERNED_TRANSIT_SCHEDULE`; selecting the transit action explains the limit rather than calling an unapproved transit provider.

## Available estimate types

| Capability | User-facing label | Required source | Fallback state | What the result does not claim |
|---|---|---|---|---|
| Driving | Traffic-aware driving estimate | Authorized Google Routes API configuration | `ROAD_ETA_UNAVAILABLE` | Bus/jeepney/train time, total transit journey, confirmed closure |
| Walking | Network walking estimate | Independently enabled Google Routes walking request | `WALKING_ETA_UNAVAILABLE` | Sidewalk condition, crossing safety, step-free access, or accessibility |
| Transit | Transit schedules unavailable | Approved current GTFS Schedule, OTP graph, and eligible release state | `NO_GOVERNED_TRANSIT_SCHEDULE` | Any transit duration or next-vehicle prediction |
| Map context | Map context | Attributed OSM tiles and separately governed overlays | `ADVISORY_ONLY` | Closure, interruption, safety, accessibility, or operating-status confirmation |

Both estimate providers are same-origin server boundaries with source/retrieval disclosure. They reject invalid coordinates and never fall back to a straight-line duration. The driving service adds traffic-aware routing; the walking service uses a network walking route. Google documents walking as a Routes API travel mode but marks walking routes as beta; this is why Sakay’s wording avoids accessibility or pedestrian-safety claims. [1]

## No-touch capability reporting

`npm run information-guide:readiness` writes a non-public report to `artifacts/information-guide/status.json`. The daily pilot-readiness workflow includes this report along with pilot and multi-source readiness. It makes no ETA, schedule, or provider request; its `networkRequestsMade` value is always zero.

## Mobile visual verification

The 390 × 844 mobile smoke artifact was reviewed after the fallback controls were added. The **Walk ETA**, **Drive ETA**, and **Transit unavailable** actions remain visible at the bottom of the planning sheet, while the map-level notice reads “Transit schedules unavailable · estimates only.” This preserves the map-first layout and keeps the unavailable transit state more prominent than the optional estimate tools.

## Re-enabling live transit routing

Information Guide mode does not weaken the project’s controlled live-routing plan. To replace the unavailable-transit state, the system still needs a current direct GTFS source with use rights, a validated and checksummed OSM input, a reproducible graph under a pinned OTP version, a controlled GraphQL endpoint, complete provenance configuration, a passing 20-case golden-route report, and an `ELIGIBLE` pilot-release state. See `docs/LIVE_TRANSIT_ROUTING_IMPLEMENTATION_PLAN.md`.

## Reference

[1]: https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteTravelMode "Google Routes API RouteTravelMode"
