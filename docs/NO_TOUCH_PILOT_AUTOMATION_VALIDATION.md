# No-Touch Pilot Automation Validation

## Result

The no-touch pilot-release gate is implemented and currently produces the expected safe `BLOCKED` state. No manual action is required to obtain this result: the policy, manifest, and golden-route suite are evaluated automatically, a JSON report is generated, and the route provider refuses to contact OpenTripPlanner unless a secure release-state file says the release is explicitly eligible.

## Verified conditions on 2026-08-27

| Condition | Automated result |
|---|---|
| Draft controlled-source policy | Blocked with `SOURCE_POLICY_NOT_READY`. |
| Draft pilot manifest | Blocked with `MANIFEST_NOT_READY`. |
| Draft golden-route suite | Blocked with `GOLDEN_SUITE_NOT_READY`. |
| Expired approved source fixture | Blocked with `SOURCE_EXPIRED`. |
| Graph-checksum mismatch fixture | Blocked with `GRAPH_CHECKSUM_MISMATCH`. |
| Fully matched approved fixture and passing assurance report | Marked `ELIGIBLE` by the deterministic release evaluator. |
| Missing, blocked, or unreadable readiness-state file | The routing provider returns the existing truthful unavailable response without contacting OTP. |
| Current local non-demo route request | Returned HTTP 503 with `ROUTING_UNAVAILABLE`. |

## Validation evidence

The native suite passed **36 of 36 tests**. Coverage measured **95.67% lines**, **70.68% branches**, and **90.36% functions**. Syntax checks passed, `npm run pilot:readiness` produced the expected blocked report, and `npm run pilot:readiness:required` intentionally failed for the draft policy. The 390 × 844 live mobile interaction test also passed with real geocoding and truthful unavailable-routing recovery.

The new GitHub Actions workflow runs a daily safe assessment and records the readiness JSON in the workflow summary. It deliberately has no source-download, graph-build, provider-call, or deployment-promotion step, so it cannot transform unknown data into live transit advice.

## Remaining external gates

The blocked state will remain correct until an authorized data owner supplies a rights-cleared, current GTFS Schedule source and approved OSM walking data, an authorized deployment identity hosts the graph, the immutable policy/manifest is populated with matching evidence, the graph is built with the pinned OTP release, and the 20-case assurance suite has a fully passing report. These are external authorization and source-governance conditions; automation will verify them but will not fabricate or bypass them.
