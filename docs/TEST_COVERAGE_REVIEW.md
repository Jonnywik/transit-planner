# Test Suite and Coverage Review

**Review date:** 27 August 2026  
**Reviewed revision:** `cc39a53` before this documentation update  
**Runner:** Node.js 22 native test runner with `--experimental-test-coverage`

## Executed checks

The complete automated suite passed: **10 tests passed, 0 failed, 0 skipped**. The JavaScript syntax command also passed for all six runtime JavaScript files. The coverage report below is limited to the two server provider modules directly loaded by the test suite; it should not be interpreted as whole-repository coverage.

| Check | Result |
|---|---|
| `node --test` | 10/10 passed |
| `npm run check` | Passed |
| Native provider coverage | 93.83% lines, 69.44% branches, 86.67% functions |

## Measured provider coverage

| File | Line coverage | Branch coverage | Function coverage | Current uncovered behavior |
|---|---:|---:|---:|---|
| `server/geocoding-gateway.js` | 91.67% | 80.56% | 86.67% | Upstream non-success response and the reverse-geocoding request path. |
| `server/routing-provider.js` | 95.10% | 63.89% | 86.67% | Out-of-range coordinates, invalid departure time, network failure, non-success OTP response, and GraphQL/invalid JSON payloads. |
| **Measured total** | **93.83%** | **69.44%** | **86.67%** | Provider happy paths are strong; failure-path branch coverage needs priority work. |

## Unmeasured runtime surface

The repository has 2,102 runtime JavaScript lines. Only the two provider modules are imported by the current tests. The 1,630-line browser application, two browser client adapters, and the 101-line HTTP server entrypoint are syntax-checked but have **no automated execution coverage**. There is also no browser test harness or end-to-end test configuration.

| Runtime area | Lines | Current test execution coverage | Risk assessment |
|---|---:|---|---|
| `app.js` | 1,630 | None | High: search state, keyboard interaction, production/demo behavior, result rendering, and map behavior depend on the browser. |
| `server.js` | 101 | None | High: request parsing, HTTP status mapping, and static-server security headers should have integration tests. |
| `geocoding-client.js` | 24 | None | Medium: API error mapping and abort handling are unverified. |
| `routing-client.js` | 23 | None | Medium: request serialization and non-success response mapping are unverified. |
| Provider modules | 324 | Measured | Moderate: complete failure-path coverage before enforcing thresholds. |

## Prioritized next tests

The first priority is HTTP integration coverage for `server.js`: test valid routes, malformed JSON, oversized bodies, method handling, non-success provider errors, and static response headers through a startable/injectable server factory. The second priority is provider resilience testing: exercise upstream network failures, non-OK responses, invalid/GraphQL error payloads, coordinate bounds, invalid timestamps, reverse geocoding, and throttle wait behavior.

The next priority is browser coverage. Extract client state and rendering-independent utilities from the application IIFE, then add a DOM-capable unit test setup for autocomplete keyboard control, select–edit–search coordinate invalidation, route-card keyboard activation, unavailable/no-route display states, and explicit demo-mode labeling. Add a small browser end-to-end suite for the primary search journey after a test routing gateway is available.

## Recommended quality gates

Add a `coverage` script and run it in continuous integration. Start with module-scoped thresholds that are realistic for the existing architecture: 90% lines, 80% branches, and 85% functions for `server/geocoding-gateway.js` and `server/routing-provider.js`. Do not apply those thresholds to the full repository until the browser client and `server.js` have an execution-test harness; a global threshold today would conceal rather than solve the unmeasured client surface.
