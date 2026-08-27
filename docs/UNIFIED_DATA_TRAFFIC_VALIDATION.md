# Unified Data and Traffic Validation Record

## Delivered controls

The implementation adds a governed multi-source registry and lineage detection for OSM baseline data, historical SakayPH GTFS, Mobility Database discovery metadata, pending official rail sources, potential real-time feeds, road-interruption feeds, and Google road ETA. The SakayPH staging inspector verified the supplied repository structure while producing the fixed `HISTORICAL_STAGING_ONLY` outcome; it cannot promote that data into live routing.

Road interruption and train-status evaluators now require current, approved sources. Mapped or expired conditions cannot change routes. Static rail schedules cannot become live train predictions. A real-time update needs an approved real-time source, matching static-data version, a valid trip/stop update, and a fresh timestamp.

The application has a protected same-origin road-ETA endpoint and browser adapter. It is configured only for Google Routes traffic-aware driving requests, has strict request validation, fixed egress host, a five-second timeout, a 250-millisecond uncached request guard, and a 60-second bounded cache. Without an authorized server-side configuration, it returns `ROAD_ETA_UNAVAILABLE` and does not substitute transit information.

## Validation on 2026-08-27

| Check | Result |
|---|---|
| Native tests | Passed: **50 of 50** tests. |
| Coverage | Passed: **96.63% lines**, **70.94% branches**, and **90.43% functions**. |
| Syntax checks | Passed for every client, server, and automation module. |
| Historical SakayPH staging inspection | Passed with `HISTORICAL_STAGING_ONLY` and `productionEligible: false`. |
| Multi-source registry | Structurally valid; unattended readiness correctly returned `BLOCKED` with zero network requests. |
| Pilot readiness | Correctly remains `BLOCKED`; draft artifacts did not authorize routing. |
| Mobile visual smoke | Passed at 390 × 844. The Road ETA and Show routes controls remained visible and touch-sized in the planning sheet. |
| Static asset boundary | Preserved by HTTP regression tests confirming only `public/` assets are served. |
| Clean diff | `git diff --check` passed. |

## Mobile review finding

The 390 × 844 smoke artifact shows the bottom-sheet hierarchy remains legible: the departure control, fare selector, **Road ETA**, and **Show routes** actions are all above the safe-area edge. The compact traffic capability message is intentionally not visually prominent while the Google map renderer remains unconfigured. The Road ETA action is secondary to the transit search action and does not claim a transit arrival.

## Current automated availability

| Feature | State | Reason |
|---|---|---|
| Live transit routing | Unavailable | No approved current GTFS, OTP graph, or eligible pilot release. |
| SakayPH surface-transit routes | Historical staging-only | Pinned repository is historical and cannot demonstrate current source authority. |
| Mobility Database rail schedules | Discovery-only | Identified records are catalog/reference evidence, not an approved direct operator feed. |
| Verified road interruptions | Unavailable | No approved authority closure/interruption source profile. |
| Live train updates | Unavailable | No approved fresh GTFS-RT/equivalent feed reconciled to active static data. |
| Google traffic-aware road ETA | Unavailable | No authorized server-held Routes API configuration. |
| Google map traffic layer | Unavailable | No authorized Google Maps JavaScript renderer; the current Leaflet map is not used for an unsupported overlay. |

> These unavailable states are the intended outcome. They prevent historical data, static schedules, map context, or unconfigured road services from being displayed as live operational guidance.
