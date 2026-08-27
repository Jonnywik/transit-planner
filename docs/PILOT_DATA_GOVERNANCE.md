# Pilot-Corridor Data Governance

## Purpose

This document is the required evidence record before Sakay enables any live journey result. It records inputs, rights, versioning, ownership, quality checks, and rider-facing disclosures for the proposed pilot. A feed being technically readable is not sufficient for deployment approval.

## Proposed pilot scope

| Decision field | Proposed value | Status |
|---|---|---|
| Corridor | MRT-3 North Avenue ↔ Taft Avenue, including walking access legs within a documented buffer | **Pending product and data-owner approval** |
| Initial mode | Schedule-only rail, plus walking access where verified | **Pending authoritative schedule source** |
| Supported-area message | “MRT-3 pilot corridor only” | Draft; must be shown before a live pilot launches |
| Routing engine | Version-pinned OpenTripPlanner GraphQL deployment | Adapter exists; deployment and graph are not approved |
| Rider claim | Schedule information only; no prediction, traffic, fare, or accessibility guarantee unless a governed source is attached | Required policy |

The corridor is proposed because the current prototype already models MRT-3 for demonstration purposes. That fixture is **not** data evidence and must not be used to build or validate a production graph.

## Input inventory

| Input | Candidate or required source | Permitted status | Required evidence before use | Owner |
|---|---|---|---|---|
| Rail schedule, routes, stops, trips, and calendars | Direct official agency/transport-authority GTFS Schedule export | Required | Written authorization or published terms, source URL, retrieval time, provider contact, feed license, checksum, and validation report | Transit-data owner |
| Historical Metro Manila GTFS | `sakayph/gtfs` repository | Reference only; **not approved for live use** | Explicit current-data and licensing verification, then a new approval decision | Transit-data owner |
| Pedestrian network | OpenStreetMap extract for documented boundary | Candidate | Dataset date, geographic extract boundary, attribution/ODbL review, and build checksum | Data engineer |
| Routing graph | Reproducible build from approved static inputs | Required | OTP version, build configuration, graph checksum, source-manifest checksum, and golden-route result | Platform owner |
| Fare data | Direct authoritative fare schedule or published official fare policy | Deferred | Versioned fare source, effective date, validation suite, and rider disclosure | Product plus data owner |
| Accessibility attributes | Direct authority/agency verification | Deferred | Source, verified-on date, confidence, known-barrier model, and review cadence | Accessibility reviewer |
| Real-time feed | Official GTFS-Realtime or approved equivalent | Deferred | Entity-ID reconciliation, freshness rule, service agreement, and degraded-state tests | Transit-data owner |

GTFS Schedule defines static routes, stops, and schedules; GTFS Realtime covers changing vehicle, arrival, and disruption information. The system must therefore launch the static pilot independently of future real-time functionality. [1]

The historical `sakayph/gtfs` repository describes itself as a Metro Manila jeepney, bus, and train feed released for a concluded app challenge and shows a small, old commit history. It is useful for schema inspection only until the data owner verifies currency, rights, and accuracy. [2]

## Required source manifest

Each graph build must commit or store an immutable manifest outside public web delivery. The manifest must include the following fields.

Sprint 1 provides a structurally validated, deliberately draft manifest at `data/pilot/pilot-manifest.draft.json` and a 20-case draft assurance catalog at `data/pilot/golden-routes.draft.json`. These files contain no feed rows, stop IDs, route geometry, or authorized schedule data. Their `DRAFT`/`PENDING_APPROVAL` status prevents them from authorizing live rider guidance.

| Field | Example | Why it is mandatory |
|---|---|---|
| `source_id` | `mrt3_schedule_2026_09_01` | Stable identity for support and incident investigation. |
| `source_url` | Approved provider endpoint | Provenance and repeatable retrieval. |
| `license_or_permission` | Link or internal approval ID | Confirms the right to use and publish derived results. |
| `retrieved_at` | ISO 8601 timestamp | Establishes recency. |
| `sha256` | Source file checksum | Detects source drift and reproduces a graph. |
| `feed_info_version` | Provider version or effective date | Makes rider-facing version disclosure possible. |
| `validator_result` | Stored report ID | Demonstrates structural validation. |
| `approver` | Named data owner | Establishes accountability. |

## Graph and route acceptance process

The data engineer validates all static files, records warnings, and builds the graph using the pinned OTP release. The transit-data owner then reviews a golden-route suite that contains at least 20 cases across the pilot boundary: direct journeys, both directions, first/last service, expected transfer edge cases, no-route cases, and walking-access boundaries. The product owner approves rider-visible wording, while the operations owner verifies graph version, deployment, monitoring, and rollback.

No deployment may replace `ROUTING_UNAVAILABLE` with live routes until all entries below have evidence.

| Approval | Required evidence | Status |
|---|---|---|
| Data rights | Official publication terms or written provider approval | Pending |
| Data validity | Validator report and recorded issue disposition | Pending |
| Graph reproducibility | Pinned OTP release, build command, source manifest, and checksums | Pending |
| Golden-route accuracy | At least 20 signed review results; primary-leg/transfer accuracy meets the approved target | Pending |
| Rider disclosure | Source, data version, retrieval time, support boundary, and limitations visible or linked in UI | Pending |
| Operational readiness | Monitoring, rollback procedure, owner rota, and outage/schedule-only test | Pending |

## Change and expiry policy

An input is stale when it passes the source owner’s declared expiry or update cadence, or when an operations alert detects an unavailable source, a validation failure, or a graph/source version mismatch. A stale graph must retain only the disclosure level approved by the data owner; it must not claim real-time validity. Every graph change creates a new manifest and re-runs the golden-route suite before promotion.

## References

[1]: https://gtfs.org/ "General Transit Feed Specification"
[2]: https://github.com/sakayph/gtfs "sakayph/gtfs — Philippine GTFS Data"
