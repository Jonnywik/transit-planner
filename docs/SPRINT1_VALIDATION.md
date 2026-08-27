# Sprint 1 Validation Record

## Implemented scope

Sprint 1 introduces a controlled, schedule-only pilot foundation for the proposed MRT-3 North Avenue ↔ Taft Avenue corridor. It adds a versioned draft source manifest, a 20-case draft golden-route catalog, structural validators, and a guarded assurance runner. No authoritative schedule feed, graph, stop identifier, fare table, or OpenTripPlanner endpoint has been added to the repository.

The rider interface now allows a local departure date and time, displays schedule-source provenance when a governed service is configured, labels demo fixtures explicitly, provides a deliberate map-focus view for the selected route, and gives riders an edit/adjust path after empty or unavailable results. The production provider also returns `ROUTING_UNAVAILABLE` before contacting OpenTripPlanner if mandatory provenance is incomplete. Fares remain explicitly unavailable.

## Local validation on 2026-08-27

| Check | Result | Evidence |
|---|---|---|
| Native tests | Passed | 29 of 29 tests passed. |
| Coverage | Passed | 95.28% lines, 75.48% branches, and 86.89% functions across configured source coverage. |
| JavaScript syntax | Passed | `npm run check` included all new validator and assurance scripts. |
| Pilot manifest | Passed as draft | `npm run validate:pilot` reported `PENDING_EXTERNAL_APPROVAL`. |
| Golden-route suite | Passed as draft | `npm run validate:golden` reported `PENDING_EXTERNAL_ROUTE_REVIEW`. |
| CI-safe mobile smoke | Passed | 390 × 844 screenshot captured successfully. |
| Live mobile interaction | Passed | Real geocoding, date/time selection, demo disclosure, route selection, map focus, reverse trip, and unavailable-route recovery passed against `http://127.0.0.1:4177`. |
| Visual review | Passed | The 390 × 844 planning sheet remained legible, with the date/time control and primary action visible above the bottom edge. |
| Static-boundary regression | Passed | Existing HTTP server tests continue to confirm public-only asset serving and denial of repository paths. |

## Explicit blockers to live routing

The draft artifacts are not a live transit service. Before enabling any non-demo itinerary, the responsible owners must approve the corridor, provide an authoritative GTFS Schedule source and use rights, validate and checksum the GTFS and walking-network inputs, pin and build a reproducible graph, populate the golden cases with real approved requests and expected outcomes, execute and review the full assurance report, configure the five required OTP/provenance variables, and complete operational monitoring and rollback review.

> Until those conditions are met, `ROUTING_UNAVAILABLE` is the correct production result. Demo routes remain isolated to `?demo=1` and are not travel advice.
