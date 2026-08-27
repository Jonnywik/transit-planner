# Live Transit Routing Implementation Plan

## Objective

Deliver a **schedule-only live transit-routing pilot** for the MRT-3 North Avenue ↔ Taft Avenue corridor, including verified walking access, through Sakay’s existing same-origin routing contract. The pilot must display the approved source, graph/data version, retrieval time, support boundary, and limitations. It must not make real-time arrival, fare, accessibility, or road-closure claims until each has its own governed source.

The plan begins from the correct current state: source policy, GTFS manifest, golden-route suite, multi-source registry, and release automation are structurally ready but **not approved**. The product must continue to return `ROUTING_UNAVAILABLE` until all go-live gates pass.

## Delivery roadmap

| Phase | Outcome | Main owner | Exit evidence |
|---:|---|---|---|
| 0 | Pilot charter and accountable operating model | Product owner and transit-data owner | Written corridor, rider claim, data-use, incident, and rollback decision. |
| 1 | Authoritative static source is governed | Transit-data owner and data engineer | Current direct GTFS Schedule source, rights evidence, update cadence, checksum, and expiry policy. |
| 2 | Reproducible inputs and validation evidence | Data engineer | Pinned GTFS/OSM files, validator reports, warning dispositions, source manifest, and build record. |
| 3 | Secure OTP graph service | Platform owner | Pinned OTP deployment, HTTPS GraphQL endpoint, graph checksum, health checks, and restricted network access. |
| 4 | End-to-end rider contract is verified | Engineering and QA | Populated 20-case golden-route suite, passing assurance report, mobile/accessibility checks, and truthful failure tests. |
| 5 | Controlled public pilot is enabled | Product and operations owners | `ELIGIBLE` release state, source disclosure accepted, support process live, and monitored rollout. |
| 6 | Routine operations and safe expansion | Operations, data, and product owners | Automated freshness/rebuild cadence, incident drill, performance baseline, and approved expansion decision. |

## Phase 0 — Pilot charter and accountable ownership

The transit-data owner, product owner, platform owner, data engineer, and operations owner should sign one pilot record. It must confirm the exact MRT-3 corridor, walking-access buffer, eligible modes, schedule-only rider language, source use rights, service-hours responsibility, privacy expectations, support contact, and the authority that may disable the route service. The selected operating model should name either the transit-data owner/platform team or an approved managed provider as the OTP service owner.

The initial service boundary should remain narrow: **MRT-3 North Avenue ↔ Taft Avenue, plus verified walking access within an approved buffer.** SakayPH, Mobility Database, and historic Transitland records must remain reference/staging sources during this phase; none can stand in for a current operator-authorized schedule.

## Phase 1 — Govern the GTFS Schedule and walking-network sources

Obtain a GTFS Schedule ZIP directly from DOTr-MRT3 or its formally appointed data custodian. Record the direct source URL or controlled delivery channel, rights evidence, provider contact, effective dates, version, update cadence, withdrawal notice, retrieval time, and SHA-256 checksum. The corresponding OpenStreetMap extract must be pinned to a documented geographic boundary with retrieval time, checksum, attribution review, and intended walking-access scope.

The data engineer runs a pinned Canonical GTFS Schedule Validator and stores the HTML, JSON, and system-error reports outside the static site. All errors block promotion. Warnings require written disposition rather than suppression. The GTFS standard defines the static data required for routes, trips, stops, calendars, and schedules; it must be treated separately from future changing-service feeds. [1]

**Exit gate:** update the immutable pilot manifest with fully evidenced source data and pass both `npm run validate:pilot:ready` and the corresponding multi-source policy checks. A historical GTFS archive is not an acceptable substitute.

## Phase 2 — Build reproducible graph inputs

Store protected copies of the approved GTFS ZIP and OSM extract in a controlled build location, not under `public/`. The build pipeline calculates checksums, links its validator reports, pins the OTP release and router configuration, and produces a graph checksum. It must reject a source mismatch, expired file, failed validation, or missing rights record automatically.

The pipeline should then emit the immutable manifest ID and provenance fields that the Sakay server already requires: `OTP_DATA_VERSION`, `OTP_DATA_MANIFEST_ID`, and `OTP_SUPPORT_BOUNDARY`. The no-touch policy and readiness report must agree with the manifest and graph checksum before a build can proceed.

**Exit gate:** a reproducible graph build can be repeated from documented source inputs and produces the same identified graph release under the stated OTP version.

## Phase 3 — Deploy and secure OpenTripPlanner

Deploy a pinned OpenTripPlanner release on an operator-controlled or otherwise authorized runtime that supports its Java process, graph files, restart policy, health checks, log retention, and secured configuration. The service must expose HTTPS GraphQL only to Sakay’s server-side routing boundary or other explicitly approved callers. The public browser must continue to call only `POST /api/routes`.

The platform owner verifies GraphiQL and `planConnection` against the approved graph, then configures these server-only values in the Sakay deployment: `OTP_GRAPHQL_URL`, `OTP_API_VERSION`, `OTP_DATA_VERSION`, `OTP_DATA_MANIFEST_ID`, `OTP_SUPPORT_BOUNDARY`, and `PILOT_RELEASE_STATE_PATH`. OpenTripPlanner’s GraphQL flow requires a graph with street and transit data loaded before route queries are meaningful. [2]

**Exit gate:** the graph endpoint, data/graph version, and manifest identity match exactly; unavailable, slow, malformed, and unauthorized provider responses return Sakay’s non-leaking unavailable state.

## Phase 4 — Populate and run the 20-case assurance suite

Replace all draft placeholders in the golden-route catalog with data-owner-approved stop IDs or coordinates, service dates/times, requested modes, maximum walk/transfer criteria, and expected outcomes. The suite already covers direct northbound and southbound journeys at multiple times, first/last-service edges, feeder transfers, peak/off-peak transfer timing, walking access at both ends, maximum walking distance, out-of-hours/no-supported-mode results, and boundary recovery.

Run `npm run assure:golden` against the controlled Sakay API, not directly against public OTP. Preserve the complete report with the graph release. A passing HTTP response is insufficient: every route must meet the signed policy on primary legs, transfers, walking, and expected no-route behavior. Repeat mobile, keyboard, screen-reader status, source-disclosure, public-asset-boundary, and outage-recovery tests.

**Exit gate:** all 20 cases are approved and pass on the exact graph release; product accepts the scheduled-data wording; operations passes a forced unavailable/rollback test.

## Phase 5 — Enable a controlled public pilot

The release pipeline generates an `ELIGIBLE` state only when the source policy, manifest, graph checksum, source freshness, version metadata, golden-route report, and approvals agree. That file is stored outside public assets and referenced through `PILOT_RELEASE_STATE_PATH`. Only then may the server’s OTP provider make a network request.

Begin with controlled traffic and observe readiness reports, provider failures, latency, response availability, unexpected no-route rate, and source age. Maintain a prominent support-boundary disclosure and no fares/real-time/accessibility claims. For an event that violates the source or service policy, remove or invalidate the eligible release state; Sakay automatically returns `ROUTING_UNAVAILABLE` instead of attempting fallback routing.

**Exit gate:** the first defined pilot period completes within availability, accuracy, freshness, support, privacy, and incident-response targets accepted by the accountable owners.

## Phase 6 — Operate, rebuild, and expand safely

Automate the agreed source freshness check and graph rebuild schedule. Every source change receives a new manifest, validator evidence, graph checksum, and 20-case assurance run before promotion. The daily readiness workflow remains safe: it evaluates known artifacts and produces a report but does not fetch unknown data or silently enable service.

Only after a stable static pilot should the team plan the next governed capabilities. GTFS-Realtime, verified disruption/road-closure feeds, fare data, and accessibility inventory each require their own data owner, identifier reconciliation, freshness policy, rider wording, failure fallback, and acceptance suite. GTFS Realtime is explicitly for changing vehicle, arrival, and disruption information rather than a replacement for the static schedule graph. [3]

## Responsibility model

| Decision or artifact | Accountable owner | Responsible contributor | Required before live routing |
|---|---|---|---|
| GTFS rights, accuracy, and update notice | Transit-data owner | Data engineer | Yes |
| Pilot boundary and rider wording | Product owner | UX and support | Yes |
| Validator report and source manifest | Data engineer | Platform owner | Yes |
| OTP runtime, secrets, health checks, and rollback | Platform/operations owner | Engineering | Yes |
| Golden-route expected results | Transit-data owner | QA and product | Yes |
| Release eligibility and daily reports | Platform owner | Automation | Yes |
| Realtime/fare/accessibility claims | Relevant data owner | Product and engineering | Deferred until separately approved |

## Immediate repository work after authorization arrives

Once the source owner supplies a governed source and an authorized deployment identity exists, engineering can populate the source-policy and pilot-manifest records, create the protected ingestion/build job, provision OTP, inject server-side configuration, run the golden assurance, and activate the release gate. The existing draft artifacts and readiness automation are deliberately designed to receive those inputs without weakening the safe blocked default.

## Current blockers

Live routing cannot begin today because the project lacks the following external evidence: a current direct MRT-3 GTFS source with public-trip-planning rights; approved OSM input/boundary; data-owner approval of actual stops, routes, calendars, and service dates; a controlled OTP deployment identity; and an approved 20-case golden-route report. These gaps must remain blockers; no historic, catalog, or fixture data may be used to bypass them.

## References

[1]: https://gtfs.org/ "General Transit Feed Specification"
[2]: https://docs.opentripplanner.org/en/latest/apis/GraphQL-Tutorial/ "OpenTripPlanner GraphQL Tutorial"
[3]: https://gtfs.org/documentation/realtime/reference/ "GTFS Realtime Reference"
