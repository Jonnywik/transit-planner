# Production Readiness Test Report

**Assessment date:** 27 August 2026  
**Assessed product state:** Sakay Metro Manila Information Guide  
**Assessment outcome:** **Application-quality ready; live-transit release blocked by external source dependencies.**

## Executive conclusion

Sakay’s currently enabled information-guide experience is release-ready from an application-quality perspective. The map-first mobile interface, selected-location workflow, controlled search boundary, user-initiated external direction handoffs, scheduled MRT-3 reference, dated fare notice, security headers, and automated quality checks are operating as designed.

Sakay is **not ready to be advertised as a live transit routing, live-arrival, verified-road-closure, current-fare, or accessibility-information service**. Those capabilities are correctly blocked because the required authoritative data, rights, and provider configurations are absent. The blocked result is a successful safety outcome, not a failing test.

## Validation results

| Validation area | Command or evidence | Result | Scope verified |
|---|---|---|---|
| Automated tests | `npm test` | **Pass: 68 tests, 0 failures** | Server, provider, client, source-governance, fallback, MRT-3 reference, and security contracts. |
| Line coverage | `npm run coverage` | **96.47%** | Current executable code paths. |
| Branch coverage | `npm run coverage` | **71.29%** | Primary success, failure, and unavailable-state decisions. |
| Function coverage | `npm run coverage` | **89.31%** | Public helpers and provider boundaries. |
| Syntax validation | `npm run check` | **Pass** | Browser modules, server modules, and validation scripts. |
| Pilot manifest | `npm run validate:pilot` | **Pass: pending external approval** | Draft pilot remains safely non-production. |
| Golden-route catalog | `npm run validate:golden` | **Pass: pending external route review** | Structural catalogue validity without claiming route readiness. |
| Multi-source registry | `npm run validate:sources` | **Pass: draft sources remain non-production** | Historical/reference sources cannot activate rider routing. |
| Pilot release gate | `npm run pilot:readiness` | **Safely blocked** | Prevents OTP contact unless source policy, manifest, and assurance evidence are eligible. |
| Multi-source release gate | `npm run multisource:readiness` | **Safely blocked** | Prevents draft or unapproved source activation. |
| Information-guide readiness | `npm run information-guide:readiness` | **Pass: information-guide mode** | No unknown provider or schedule calls are made. |
| Mobile visual smoke | `npm run smoke:mobile` | **Pass: 390 × 844** | Mobile sheet, map shell, responsive rules, and required controls. |
| Live mobile interaction | `npm run smoke:mobile:live` | **Pass** | Geolocation, real address recommendations, demo isolation, schedule reference, external recovery actions, and transit handoff. |
| Static/API hygiene | `git diff --check`; server tests | **Pass** | Whitespace, public-only serving, headers, and PNG MIME response. |

## Mobile guidance verification

The 390 × 844 visual artifacts confirm that the MRT-3 scheduled reference uses a clear source label, an explicit **“Scheduled reference · not live”** status badge, selected-time guidance, a persistent no-arrival limitation, and a 44 px official-source action. The walking fallback similarly presents the unavailable state, the no-straight-line limitation, an external-provider disclosure, a full-width 44 px primary action, and a visually secondary edit action.

| Artifact | Verified component |
|---|---|
| `artifacts/live-mobile/mobile-mrt3-schedule-reference.png` | MRT-3 status, headway, time-window guidance, limitation, and official source action. |
| `artifacts/live-mobile/mobile-walking-fallback.png` | Walking ETA unavailable recovery and external Google Maps direction action. |
| `artifacts/live-mobile/mobile-route-result.png` | End-to-end planner recovery and transit handoff state. |

## Remaining non-operational capabilities

| Capability | Current safe behavior | Blocking external requirement |
|---|---|---|
| Sakay-owned transit routing | Rider-selected external Google Maps transit handoff. | Current rights-cleared GTFS Schedule feed, approved OSM input, reproducible OTP graph, passing golden-route assurance, and eligible release decision. |
| In-app driving ETA | Provider-first request, then external Google Maps driving fallback. | Authorized server-side Google Routes provider configuration. |
| In-app walking ETA | Provider-first request, then external Google Maps walking fallback. | Authorized server-side Google Routes provider configuration. |
| Live train arrival | Published MRT-3 headway/service-window reference only. | Fresh approved operations/realtime feed with station/trip identity, update timestamps, matching static version, and freshness policy. |
| Verified road interruption | Explicit provider-ready unavailable status; external traffic view is available. | Current authority feed, documented rights, event geometry/IDs, timestamps, classification, direct provider connection, and staleness limit. |
| Current trip-specific fare | Dated PUV notice reference; no calculation. | Current authoritative fare matrix for route, vehicle class, passenger type, discount, effective date, and policy approval. |
| Accessibility claims | Demo-only samples remain isolated. | Maintained verified accessibility inventory and rider-facing limitation policy. |

## Recommended next implementation step

The next feasible implementation step is an **authorized in-app estimate-provider activation path**. The code already supports it, so the implementation should focus on a small configuration-readiness UX and proof-of-configuration test rather than another fallback. It must keep all secrets server-side and never expose a key in browser code or tracked configuration.

| Step | Deliverable | Decision rule |
|---|---|---|
| 1 | Add a non-secret provider-readiness response that reports whether driving and walking estimates are configured, without revealing credentials. | It may state `configured` only when the server-side provider has all approved prerequisites. |
| 2 | Surface the status in the planning sheet with a concise explanation of whether Sakay will calculate an in-app estimate or open an external provider. | The UI must not imply a local ETA when the result will open externally. |
| 3 | Add a configuration-enabled integration test using an injected test provider. | The test must assert source, retrieval metadata, driving-only/walking-only scope, and no transit or accessibility claims. |
| 4 | Activate the server-side provider only after the authorized credential is supplied through the approved secrets process. | No secret may be committed, placed in browser code, or passed on a visible command line. |

This is more feasible than live arrivals, closures, fares, or internal transit routing because the provider adapters, server boundaries, client actions, error recovery, and test harness already exist. It still cannot be activated with a fabricated or absent provider credential.
