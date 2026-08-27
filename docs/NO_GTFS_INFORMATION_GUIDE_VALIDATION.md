# No-GTFS Information-Guide Validation

## Implemented fallback behavior

Sakay now exposes `GET /api/capabilities`, which declares **Information Guide** mode and the explicit `NO_GOVERNED_TRANSIT_SCHEDULE` state. Production transit searches no longer attempt the unavailable routing provider in this mode; they open a clear recovery panel explaining that current transit schedules, transit routes, next-train times, and vehicle arrivals are unavailable.

The planner retains a separately labeled **Drive ETA** control and adds a **Walk ETA** control. The road estimate remains traffic-aware driving only when its server-side provider is authorized. The walking estimate uses an independently enabled network route request and cannot fall back to straight-line time. Each unavailable state is recoverable and never converts a road or walking estimate into a transit claim.

## Validation on 2026-08-27

| Check | Result |
|---|---|
| Native test suite | Passed: **57 of 57** tests. |
| Coverage | Passed: **96.33% lines**, **70.79% branches**, and **89.06% functions**. |
| Syntax validation | Passed for all client, server, and report modules. |
| Information-guide report | Passed with `INFORMATION_GUIDE`, `NO_GOVERNED_TRANSIT_SCHEDULE`, and `networkRequestsMade: 0`. |
| Pilot and multi-source readiness | Correctly remained `BLOCKED`; no draft/historical source was promoted. |
| Mobile visual smoke | Passed at 390 × 844. The Walk ETA, Drive ETA, and Transit unavailable controls remained visible and touch-reachable. |
| Live mobile interaction | Passed against the configured local geocoder. It verified real location selections, demo isolation, walking-ETA recovery, driving-ETA recovery, and no-GTFS transit recovery. |
| Server static boundary | Preserved by the HTTP test suite. |
| Whitespace check | Passed: `git diff --check`. |

## Current external gates

The application intentionally returns unavailable states for both estimates until their relevant controlled source configuration exists. Drive ETA requires an authorized Google Routes configuration. Walk ETA requires the independently enabled walking source configuration and must retain its beta/accessibility limitation language. Live transit routing still requires the governed GTFS, OSM, OTP graph, manifest, golden-route, and release-eligibility conditions in `docs/LIVE_TRANSIT_ROUTING_IMPLEMENTATION_PLAN.md`.

> The user-facing fallback is useful only within these limits: a mode-specific estimate is not an assurance about a transit journey, physical accessibility, pedestrian safety, or road closure.
