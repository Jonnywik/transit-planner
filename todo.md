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
