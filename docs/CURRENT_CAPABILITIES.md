# Sakay Current Capabilities

## Product status

Sakay is currently a **mobile-first information guide and transit-planning foundation** for Metro Manila. It offers real location discovery, map context, and clearly labeled estimate interfaces while it intentionally withholds live transit routes, train-arrival predictions, fares, and confirmed service interruptions until their supporting data has been approved and configured.

> A displayed unavailable state is a deliberate product capability: it prevents historical, incomplete, or unconfigured data from becoming misleading travel advice.

## Rider-facing capabilities

| Capability | Current state | What a rider can do | Important limit |
|---|---|---|---|
| Mobile map-first interface | **Available** | Search, plan from a bottom sheet, select locations, reverse a trip, use current location, and inspect results on a responsive 390 × 844 layout. | The map is informational unless a feature has its own approved data source. |
| Location and address search | **Available with approved server configuration** | Receive responsive location recommendations while typing, including a primary name and Metro Manila address context. | Results come through Sakay’s same-origin gateway; manual typed text is not a selected coordinate until a suggestion is chosen. |
| Location search request safety | **Available** | Use keyboard-accessible suggestions and receive clear pending/no-result/error feedback. | Stale browser requests are canceled; the server keeps rate, cache, boundary, and user-agent controls. |
| Current location | **Available where browser permission is granted** | Use device location to populate an origin search. | Location permission remains controlled by the rider’s browser. |
| Information Guide mode | **Available** | See an explicit notice that transit schedules are unavailable and access separate estimate tools. | This is not a live transit-planning service. |
| Transit route search | **External handoff available; Sakay routing unavailable** | Open selected locations in Google Maps with transit mode requested, or receive a clear explanation when locations are not selected. | Sakay does not import, verify, cache, or display the provider’s itinerary/time; a governed GTFS source, OTP graph, golden-route report, and eligible release state are still required for Sakay routing. |
| MRT-3 scheduled service reference | **Available as scheduled reference** | Check the applicable published weekday/Saturday/Sunday headway period for the selected local time, with clear before-service, in-service, and after-service guidance. | It is not a next-train time, station arrival, vehicle location, delay, or live prediction. |
| MRT-3 station route and fare lookup | **Available as static official reference** | Select two published MRT-3 stations to view direction, intermediate stations, station hops, selected-time service reference, and the regular or concessionary official-matrix amount. | It is not a location-to-station router, transfer planner, current-fare guarantee, fare-eligibility check, or live service/arrival claim. |
| Historical SakayPH GTFS fixture | **Documentation-only** | Supports explicit offline parser, graph, and interface rehearsal records for a private documentation setting. | The pinned 2015 revision and its expired service calendar cannot populate rider UI, route results, fares, arrivals, maps, or release eligibility. |
| User-supplied PUV fare notice | **Available as dated reference** | Inspect the supplied PUJ, UV Express, and public-bus fare notice. | It does not calculate a current fare, does not cover rail fares, and must be checked against the posted matrix and later agency actions. |
| Demo route interactions | **Demo-only** | Explore sample route cards, route selection, map focus, and reverse-trip behavior at `?demo=1`. | Fixtures are conspicuously labeled and must not be used for travel decisions. |
| Traffic-aware driving estimate | **Configuration-gated** | Request a traffic-aware driving time, distance, and traffic-speed detail when the protected Google Routes service is configured. | It is driving-only—not a bus, jeepney, train, or total transit journey estimate. |
| Network walking estimate | **Configuration-gated** | Request a walking network time and distance when its protected provider is enabled. | It is not a guarantee about crossings, sidewalks, safety, step-free access, or accessibility. |
| Driving directions recovery | **External handoff available** | Open rider-selected locations in Google Maps when Sakay’s configured driving ETA is unavailable. | Google Maps determines any external route and time; Sakay does not import, verify, cache, or display the result. |
| Walking directions recovery | **External handoff available** | Open rider-selected locations in Google Maps when Sakay’s configured walking ETA is unavailable. | Google Maps determines any external route and time; Sakay does not import, verify, cache, or display the result. |
| Traffic map layer | **External handoff available** | Open Google Maps’ traffic view in a separate tab/app from Sakay’s control. | Sakay does not render, cache, or interpret Google traffic content on the Leaflet map; traffic visibility does not confirm a road closure. |
| Road/interruption context | **Advisory-only** | View base map context. | OSM or map context does not confirm a closure, incident, open road, or safe passage. |

## Transit, source, and data capabilities

| Capability | Current state | Controls already implemented | Remaining prerequisite |
|---|---|---|---|
| MRT-3 schedule-routing pilot | **Blocked safely** | Draft manifest, immutable policy structure, provenance fields, OTP GraphQL adapter, and 20-case golden-route catalog. | Current direct GTFS Schedule source with use rights, approved OSM input, reproducible OTP graph, and sign-off. |
| Static GTFS validation | **Ready for approved input** | Source manifest checks, checksum/effective-date fields, GTFS inspection path, and documented Canonical Validator procedure. | Rights-cleared current feed and completed validation report. |
| SakayPH bus/jeepney GTFS | **Historical staging-only** | Isolated structure inspection and source classification. | Currentness and rights evidence from the responsible source owner. |
| Mobility Database records | **Discovery/reference-only** | Registry classification and shared-lineage detection with historical feed records. | Direct current operator feed; catalog metadata is not accepted as source authority. |
| OpenStreetMap routing inputs | **Staging-only** | Governed source registry, checksum/coverage requirements, and advisory map semantics. | Approved extract, attribution review, coverage boundary, and graph release evidence. |
| Train arrival prediction | **Unavailable** | Published MRT-3 headways are separated into a non-live schedule reference; the realtime eligibility model remains strict. | Fresh approved operational feed, matching static identifiers, and agreed freshness policy. |
| Verified road interruption | **Provider-ready but unavailable** | A same-origin status endpoint reports unavailable/pending evidence without creating closure events. | Current time-bounded authority feed, direct provider connection, approved source profile, rights evidence, event timestamps, and freshness policy. |
| Multimodal and location-based fares | **Unavailable** | The MRT-3 station-pair matrix lookup is isolated as a static official reference; `fareStatus` remains available for governed sources. | Current route/vehicle-specific fare sources, effective dates, transfer rules, passenger eligibility, versioning, and product policy. |
| Accessibility claims | **Unavailable** | Demo-only isolation for any sample accessibility presentation. | Verified, maintained accessibility inventory and a rider-facing limitation policy. |

## Platform, security, and reliability capabilities

| Capability | Current state | Protection or behavior |
|---|---|---|
| Same-origin service boundary | **Available** | Browser code calls Sakay APIs rather than geocoding, OTP, or route-time providers directly. |
| Public asset isolation | **Available** | The server exposes only `public/` and returns 404 for repository, test, configuration, and hidden paths. |
| Browser hardening | **Available** | Content Security Policy, `X-Frame-Options: DENY`, `nosniff`, and referrer controls are applied. |
| Provider safeguards | **Available** | Geocoding and road-ETA paths use validation, fixed endpoint boundaries, timeout/rate/cache controls, and typed error states. |
| Provenance disclosure | **Available** | Pilot schedule, demo, driving ETA, and walking ETA results render source/scope/retrieval details when present. |
| Safe release gate | **Available** | A missing, blocked, expired, mismatched, or unreadable pilot-release state prevents OTP contact. |
| Automated readiness reports | **Available** | Pilot, multi-source, and information-guide reports run without making unknown feed, ETA, or schedule requests. |
| Scheduled verification | **Available** | A daily GitHub workflow validates governed artifacts and publishes non-public readiness summaries. |
| Quality and security automation | **Available** | Native tests, coverage, syntax checks, mobile visual smoke, CodeQL, and Dependabot protections are established. |

## Current operating posture

The production posture is intentionally conservative. **Real location search** is the active data-backed rider feature. **Driving and walking estimates** have fully implemented, protected paths but remain unavailable until their server-side provider configuration is approved. **Transit journey routing** is structurally implemented but blocked until authoritative static data, graph deployment, test evidence, and release eligibility exist.

This separation allows the user interface and operational controls to mature now, while preventing an older feed, a map overlay, or a numerical heuristic from being mistaken for current Metro Manila transit advice.

## Primary reference documents

| Topic | Document |
|---|---|
| Live schedule-routing path | `docs/LIVE_TRANSIT_ROUTING_IMPLEMENTATION_PLAN.md` |
| GTFS source selection | `docs/GTFS_SOURCE_RECOMMENDATION.md` |
| Controlled OTP setup | `docs/OTP_GTFS_CONFIGURATION_GUIDE.md` |
| No-touch pilot release gate | `docs/NO_TOUCH_PILOT_AUTOMATION.md` |
| Multi-source and road-traffic safeguards | `docs/MULTISOURCE_TRAFFIC_IMPLEMENTATION.md` |
| No-GTFS information-guide behavior | `docs/NO_GTFS_INFORMATION_GUIDE.md` |
| MRT-3 station route and fare lookup | `docs/MRT3_STATION_REFERENCE_ROUTER.md` |
| Historical documentation fixture | `docs/HISTORICAL_GTFS_DOCUMENTATION_FIXTURE.md` |
