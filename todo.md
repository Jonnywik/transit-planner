# Sprint 2 Implementation Checklist

- [x] Confirm the OpenTripPlanner GraphQL contract, required environment configuration, and deterministic provider response model.
- [x] Add a version-pinned routing provider and normalize its itineraries into the Sakay client contract.
- [x] Expose a validated same-origin route-planning endpoint with source and availability metadata.
- [x] Replace production-path mock routing with truthful ready, unavailable, no-route, and error states.
- [x] Add routing fixture, contract, and gateway tests; document local configuration and operational limitations.
- [x] Run automated checks, commit the completed sprint, and push the verified change set.

## Test and Coverage Review

- [x] Identify the full test and coverage tooling available in the repository.
- [x] Execute the complete automated test suite and collect a coverage baseline.
- [x] Review uncovered source paths and prioritize high-risk coverage gaps.
- [x] Deliver the coverage findings and recommended next tests.

## Sprint 3 Coverage Hardening

- [x] Extract a testable HTTP server factory and cover API/static response behavior end to end.
- [x] Convert browser adapters into importable boundaries and test success, error, and abort behavior.
- [x] Extract and test critical search-state helpers without relying on the full browser IIFE.
- [x] Re-run native coverage, record the new baseline, and document residual UI coverage gaps.
- [x] Commit and push the verified Sprint 3 change set.

## CI and Pull-Request Verification

- [x] Review the current Actions workflow and available repository enforcement settings.
- [x] Upgrade the workflow to verify pull requests, main-branch pushes, and manual runs with coverage and syntax checks.
- [x] Document the status check that should be required by branch protection.
- [x] Validate, commit, and push the CI workflow.

## Security and Dependency Audit

- [x] Inventory exposed runtime, dependency, configuration, and automation surfaces.
- [x] Run dependency and supply-chain vulnerability checks; review workflow action provenance.
- [x] Analyze HTTP, browser, validation, and secret-handling controls for verified risks.
- [x] Validate findings, assign remediation priority, and document residual risk.
- [x] Deliver the audit report and supporting evidence.

## Local Run

- [x] Start the application locally using the repository runtime command.
- [x] Confirm the local HTTP service is healthy and provide the access URL.

## Live Integration and Performance Test

- [x] Verify static delivery and public API success/error contracts against the running server.
- [x] Exercise concurrent local requests and record response-time measurements.
- [x] Deliver the test findings and runtime limitations.

## Mobile-first UI/UX Redesign

- [x] Analyze the supplied mobile-app references and commit a distinct mobile-first design direction.
- [x] Create an original, text-free Sakay logo and prepare it for header and favicon use.
- [x] Rebuild the interface around thumb-reachable mobile route planning, map context, and responsive route cards.
- [x] Validate mobile and desktop layouts, then refine the visual system and interaction states.
- [x] Commit and push the completed redesign.

## Mobile Visual Smoke and Live Interaction Tests

- [x] Add deterministic mobile viewport smoke assertions and screenshot artifacts to CI.
- [x] Exercise the live planning sheet, geolocation control, route form, and unavailable routing state.
- [x] Validate the workflow locally and on GitHub Actions, then document the new quality gate.
- [x] Commit and push the visual-smoke coverage and interaction test results.

## Approved Live Geocoding and Mobile Design Review

- [x] Restart the local service with the approved `GEOCODER_USER_AGENT` configuration.
- [x] Rerun the full mobile location-selection, route-planning, route-card, and reverse-trip interaction flow.
- [x] Review the live mobile red–white–blue design and Sakay logo implementation.
- [x] Deliver the verified live-test and design-review result.

## Approved Sprint 0 — Secure Deployment and Data Readiness

- [x] Isolate public assets and block repository metadata, environment, source, test, and documentation paths from HTTP delivery.
- [x] Add browser delivery hardening and regression tests for safe headers and non-public path denial.
- [x] Add managed dependency and code-security automation with immutable workflow action references.
- [x] Prepare the pilot-corridor data inventory, governance checklist, and pre-enable decision record.
- [x] Validate all Sprint 0 controls, commit the result, and identify approvals required before live routing.

> Sprint 0 implementation controls are complete. The Sprint 0 exit gate remains pending the documented data-rights, source-validity, graph, golden-route, accessibility, and operational approvals in `docs/PILOT_DATA_GOVERNANCE.md`.

## Approved Sprint 1 — Static Journey-Planning Pilot

- [x] Add reproducible pilot graph configuration, input-manifest validation, and a documented local routing service contract.
- [x] Add golden-route fixture coverage for direct, transfer, walking, no-route, and pilot-boundary schedule journeys.
- [x] Surface source, data version, retrieval time, support boundary, and fare availability in route results.
- [x] Add mobile journey departure date/time control, improved no-route recovery, and map/route synchronization.
- [x] Validate the pilot implementation without enabling unapproved live routing, then commit and report pending data approvals.

> Sprint 1 implementation is complete. The static journey-planning pilot remains **not live** until the data-rights, source-validity, reproducible-graph, golden-route, and operational approval gates documented in `docs/PILOT_DATA_GOVERNANCE.md` are completed.

## Real-Time Location Recommendation Upgrade

- [x] Assess current autocomplete latency, provider configuration, and no-result/error paths without weakening provider safeguards.
- [x] Add responsive query-state feedback, address-result prioritization, and accessible real-time recommendation controls.
- [x] Extend client/gateway coverage and 390 × 844 live interaction checks for live recommendations.
- [x] Validate the secure same-origin search flow, commit, and report any external-provider limitations.

## OpenTripPlanner and GTFS Configuration Guide

- [x] Review the repository’s required OTP provenance variables, pilot gates, and validation commands.
- [x] Prepare a step-by-step configuration and GTFS source-validation guide without enabling live routing.
- [x] Deliver the implementation checklist and list of approvals still required for a production route service.

## Approved No-Touch Pilot Routing Automation

- [x] Define a non-authorizing machine-readable pilot-source policy and deterministic readiness report.
- [x] Automate policy validation, source-expiry evaluation, promotion eligibility, and safe blocked-state results.
- [x] Add unattended scheduled verification that records readiness without downloading unknown feeds or enabling routing.
- [x] Test blocked, expired, mismatched, and eligible release states; validate and report the remaining external authorization gates.

> The no-touch automation is complete and safely blocked by the absence of authorized source and deployment evidence. It will continue to deny live routing until those machine-verifiable gates are satisfied.

## GTFS Source Evaluation

- [x] Define the authoritative-source, licensing, freshness, and pilot-scope criteria for GTFS candidates.
- [x] Research official, agency-adjacent, and reference-only Metro Manila GTFS candidates using primary sources.
- [x] Compare candidates against Sakay’s source-governance gate and make a conditional recommendation.
- [x] Document the findings and identify the exact evidence needed before any candidate can enter the automated release policy.

## Governed GTFS Activation Checklist

- [x] Translate the approved-source requirements into a concise owner-facing sequence.
- [x] Describe the automated validation, readiness, graph, and assurance handoffs without enabling live routing.
- [x] Deliver the step-by-step guide and the safe blocked-state fallback.

## Approved Multi-Source Transit and Interruption Foundation

- [ ] Define governed source profiles, lineage rules, and source classes for OSM, SakayPH, Mobility Database, static schedules, and real-time data.
- [ ] Add static staging validation that cannot promote historical SakayPH or catalog-discovered feeds into live routing.
- [ ] Add interruption and real-time eligibility models that keep OSM-derived conditions advisory and never fabricate train arrivals.
- [ ] Add no-touch validation/reporting, safety tests, rider disclosures, and source-governance documentation.
- [ ] Run full validation, commit, and report the exact external source approvals still required.

## Google Traffic and Arrival-Estimate Assessment

- [x] Verify the Google Traffic Layer’s supported role and the correct route-time API boundary for road-travel estimates.
- [x] Define rider-facing states that distinguish traffic visualization, road ETA, scheduled transit time, and verified live transit prediction.
- [x] Prepare a safe traffic and ETA integration plan that preserves server-side credentials, source disclosure, and degraded-state behavior.

## Approved Unified Data and Traffic Implementation

- [x] Add governed source profiles, lineage checks, and staging-only rules for OSM, SakayPH, and Mobility Database data.
- [x] Add interruption and real-time eligibility models that prevent unverified closures and static schedules from becoming live predictions.
- [x] Add protected Google Routes road-ETA contracts, feature gates, and traffic availability states without exposing credentials.
- [x] Add mobile source/availability disclosures and no-touch verification for road traffic, schedules, real-time, and interruption data.
- [x] Run full validation, commit, and report the delivered source controls and external integration gates.

## Live Transit Routing Implementation Plan

- [x] Confirm the source-owner, data-rights, pilot-boundary, and operational-accountability prerequisites for live service.
- [x] Define reproducible ingestion, GTFS/OSM validation, OTP graph build, and secure deployment stages.
- [x] Define golden-route, pilot-release, observability, rollback, and expansion gates for enabling rider-facing live routing.
- [x] Document the phased plan, responsibility model, and current go-live blockers.

## Approved No-GTFS Information-Guide Mode

- [x] Add explicit fallback capability states and disclosures that keep live transit routing, schedules, and arrivals unavailable.
- [x] Add mode-specific road and walking estimate boundaries with no ungrounded duration fallback.
- [x] Add map-guide status reporting and no-touch capability verification for every estimate/data category.
- [x] Validate the 390 × 844 fallback experience, commit, and report external provider gates.

## Current Capability Inventory

- [x] Inventory implemented rider, routing, estimate, source-governance, security, and automation capabilities.
- [x] Classify each capability as available, configuration-gated, advisory-only, demo-only, historical staging-only, or unavailable.
- [x] Publish and deliver a concise current-capabilities document.

## Non-GTFS Capability Preservation

- [x] Inventory every rider-facing function that currently depends on or references static transit data.
- [x] Evaluate controlled non-GTFS alternatives that preserve utility without claiming a verified transit route, schedule, or arrival.
- [x] Define replacement capability states, provenance labels, validation criteria, and safe failure behavior.
- [x] Implement and validate approved non-GTFS replacements without removing existing functionality.

## Requested Arrival, Fare, Traffic, and Interruption Enhancements

- [x] Verify the supplied fare notice’s source authority, effective date, scope, and applicability before using it for rider fare guidance.
- [x] Evaluate whether a current, authoritative Metro Manila train operations or realtime source supports safe arrival estimates; preserve unavailable state if it does not.
- [x] Evaluate a policy-compliant live traffic rendering path and retain the distinction between congestion visualization and verified road closures.
- [x] Identify an authoritative, current road-interruption source and implement it only with verifiable provenance, timestamps, and safe stale/error behavior.
- [x] Implement and validate every approved capability without converting estimates, historical figures, or map context into false live claims.

## Operational Capability Continuation

- [x] Reassess each remaining unavailable or configuration-gated capability for a safe, authorized activation path.
- [x] Improve user-facing recovery and activation guidance for capabilities that remain dependent on external approval, credentials, or live authority data.
- [x] Implement and test all additional functionality that can operate without inventing live transit, fare, road-closure, or accessibility information.
- [x] Complete end-to-end validation and record the remaining external dependencies precisely.

## Estimate Fallback and MRT-3 Service Guidance

- [x] Review provider-first road and walking estimate recovery behavior and identify clearer operating states.
- [x] Expand MRT-3 scheduled-reference guidance for before-service, current-service, and after-service time windows without creating arrival claims.
- [x] Implement and test approved guidance and provider-first fallback improvements.
- [x] Complete end-to-end validation, commit, and report the active in-app versus external fallback states.

## Capability Readiness Review and Mobile Guidance Refinement

- [x] Reassess remaining non-operational capabilities and identify the next feasible implementation step without assuming unavailable external inputs.
- [x] Produce a full production-readiness test summary for all current feature classes and release gates.
- [x] Optimize mobile MRT-3 schedule guidance and external fallback-link components for hierarchy, touch targets, and disclosure clarity.
- [x] Complete responsive validation, commit, and report readiness plus the next external dependency.
