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
