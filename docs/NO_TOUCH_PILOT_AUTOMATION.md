# No-Touch Pilot Routing Automation

## What now runs unattended

Sakay now has a deterministic pilot-release gate. It evaluates a versioned source policy, the pilot manifest, the 20-case golden-route catalog, and—when an approved report exists—the golden-route assurance result. Its output is a non-public JSON readiness report with one of two states:

| State | Routing behavior | Meaning |
|---|---|---|
| `BLOCKED` | Sakay continues to return `ROUTING_UNAVAILABLE`. | Source policy, approval, graph, checksum, expiry, or golden-route evidence is incomplete or inconsistent. |
| `ELIGIBLE` | The release is eligible for the configured, controlled routing service. | All machine-verifiable inputs match the approved policy and the latest assurance report fully passed. |

The state is not a rider-facing instruction, a data-rights approval, or an automatic claim that routes are accurate. It is a release gate used before the routing provider contacts OTP.

## Scheduled safe assessment

The `Pilot routing readiness` workflow runs daily at 03:17 UTC and can also be started manually from GitHub Actions. It validates the draft or approved artifact structures, runs `npm run pilot:readiness`, and writes the full JSON result into the workflow summary.

The scheduled job is intentionally safe while the project is in its current draft state. It does **not** download a GTFS file, fetch an OSM extract, contact an OTP endpoint, build a graph, run a golden route, or change deployment configuration. It therefore cannot turn unknown data into live route guidance merely because a scheduled job ran.

## Controlled promotion sequence

Once a transit-data owner has supplied a rights-cleared source and an authorized deployment identity exists, the source policy may list the exact approved HTTPS inputs, checksums, expiry times, rights evidence identifiers, graph release metadata, and support boundary. A separate controlled release process then produces the validated manifest, OTP graph, and golden-route assurance report.

The readiness evaluator checks that the release metadata and approved source checksums match across those artifacts. It blocks expired data, source URL/checksum drift, OTP/data/manifest/graph mismatch, missing assurance evidence, and failed golden routes. The routing provider also reads the generated readiness state before sending an OTP request; a missing, unreadable, blocked, or non-eligible state causes the existing truthful unavailable response.

## Required operating paths

| Command | Automated purpose | Draft-state result today |
|---|---|---|
| `npm run pilot:readiness` | Generate a machine-readable release-gate result. | `BLOCKED`; no network calls. |
| `npm run pilot:readiness:required` | Fail a deployment gate unless the result is eligible. | Fails safely. |
| `npm run assure:golden` | Exercise all approved golden routes through an operator-controlled Sakay API. | Stops before any route request. |
| `PILOT_RELEASE_STATE_PATH=/secure/path/status.json npm start` | Require a current `ELIGIBLE` state before the route provider may contact OTP. | Keeps routing unavailable unless the secure file exists and is eligible. |

## External gates that automation will not bypass

The system cannot issue an agency’s permission, decide that a feed is authoritative, acquire a hosting account, or substitute a historical fixture for source-controlled transit data. These are required upstream conditions. Once the responsible owner provides them in a controlled form, the technical evidence and promotion decisions become automated; until then, the safe blocked state is the intended fully unattended outcome.
