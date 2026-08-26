# Test Suite and Coverage Review

**Review date:** 27 August 2026
**Sprint 3 baseline:** repository worktree after testability hardening
**Runner:** Node.js 22 native test runner with `--experimental-test-coverage`

## Executed checks

The expanded automated suite passed: **24 tests passed, 0 failed, 0 skipped**. JavaScript syntax checks passed for every runtime module. The new `npm run coverage` command now instruments the HTTP entrypoint, server providers, browser adapter modules, and extracted search-state module; continuous integration runs the same coverage command.

| Check | Result |
|---|---|
| `npm test` | 24/24 passed |
| `npm run check` | Passed |
| `npm run coverage` | 96.04% lines, 73.77% branches, 88.46% functions across the measured modules |

## Measured coverage

| File | Line coverage | Branch coverage | Function coverage | Sprint 3 coverage outcome |
|---|---:|---:|---:|---|
| `server.js` | 100.00% | 76.74% | 100.00% | HTTP factory, static response, API status mapping, and startable entrypoint are integration-tested. |
| `geocoding-client.js` | 100.00% | 75.00% | 83.33% | Search/reverse request serialization, error metadata, abort propagation, and empty payloads are tested. |
| `routing-client.js` | 100.00% | 100.00% | 66.67% | Plan serialization, provider error metadata, abort propagation, and fallback error code are tested. |
| `search-state.js` | 100.00% | 85.71% | 100.00% | Stale autocomplete invalidation and selected-place clearing are tested. |
| `server/geocoding-gateway.js` | 91.67% | 80.56% | 86.67% | Existing provider tests remain in place. |
| `server/routing-provider.js` | 95.10% | 63.89% | 86.67% | Existing provider tests remain in place. |
| **Measured total** | **96.04%** | **73.77%** | **88.46%** | The initially unmeasured server entrypoint and client-adapter paths now execute in automation. |

## What Sprint 3 changed

The HTTP server is now constructed through `createSakayServer` and started through `startServer`, allowing tests to inject deterministic routing and geocoding providers without network access. This covers static response headers, missing static files, request parsing, route forwarding, provider error mapping, unexpected failure sanitization, and the actual server-launch path.

The browser adapters are now importable factories rather than side-effect-only global scripts. The application imports them directly, and tests cover successful results, structured failures, abort propagation, and empty payload handling. Search request state was extracted from the browser IIFE to ensure a later input invalidates stale autocomplete responses and clears a selected place deterministically.

## Residual gaps and next priorities

The 1,637-line `app.js` still has no full DOM/Leaflet execution coverage. The extracted search state covers the highest-risk asynchronous selection invariant, but keyboard list navigation, map drawing, route-card activation, unavailable/no-route rendering, and demo-mode labeling remain browser-only flows. The next quality step is a DOM-capable unit suite plus a minimal end-to-end search journey against an injected test server.

Provider branch coverage is the next server-side target. The highest-value missing cases are upstream non-success and reverse-geocoding behavior in `geocoding-gateway.js`, then coordinate bounds, invalid timestamps, network failures, non-OK OTP responses, and invalid GraphQL payloads in `routing-provider.js`. These tests should be added before enforcing broad branch thresholds.

## Quality gate status

Continuous integration now runs `npm run coverage` followed by syntax checks. Module-level coverage is strong for the new Sprint 3 targets, but no global threshold is enforced yet because `app.js` has no browser execution harness. A global threshold should only be introduced after that harness measures the remaining user-interface surface.
