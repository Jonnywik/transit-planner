# Live Location Recommendation Validation

## Delivered behavior

The mobile origin and destination fields now update recommendation candidates while a rider types. They immediately rank matching places from a small client-side cache, then request a refreshed result set through Sakay’s existing same-origin geocoding endpoint. Results display a primary location name and contextual Metro Manila address, remain keyboard-selectable, and announce their request state through `aria-busy` and the existing live status region.

Each new keystroke invalidates any selected place and cancels the browser request that it supersedes. The application still accepts a place only after the user explicitly selects it; a typed display value is not treated as a verified coordinate.

## Validation on 2026-08-27

| Check | Result |
|---|---|
| Native test suite | Passed: 31 of 31 tests. |
| Coverage | Passed: 95.65% lines, 75.54% branches, and 88.41% functions. |
| Syntax and artifact checks | Passed: syntax, draft pilot manifest, and draft golden-route validation. |
| Live 390 × 844 interaction | Passed: real geocoding returned rich primary/secondary recommendations, `aria-busy` cleared after the live response, and the selected-place/routing flow continued successfully. |
| CI-safe 390 × 844 visual smoke | Passed. |
| Static-serving boundary | Preserved by the existing HTTP server regression tests. |

## Provider guardrails

The server remains the sole provider caller and retains its response cache, one-second shared upstream interval, Metro Manila boundary, five-result limit, and identifying user agent. The public Nominatim usage policy sets a one-request-per-second application-wide ceiling, requires identification, and requires applications to be able to switch services with caching enabled. It also does not support client-side autocomplete. [1]

Sakay therefore does not expose the upstream provider to browsers and does not increase its server throttle. The current implementation is suitable for direct, moderate user-initiated testing. Prior to a broad public launch, the operator must complete a capacity/policy assessment and, if demand exceeds those limits, configure an approved controlled geocoding provider behind the same-origin API boundary.

## References

[1]: https://operations.osmfoundation.org/policies/nominatim/ "Nominatim Usage Policy"
