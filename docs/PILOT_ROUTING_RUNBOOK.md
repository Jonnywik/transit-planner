# Sprint 1 Pilot Routing Runbook

## Purpose

This runbook defines the controlled steps required to transform the current Sprint 1 artifacts into a schedule-only pilot. It does not authorize live routing by itself. The application must keep returning its explicit unavailable state until the manifest, golden-route suite, and external approvals are all ready.

## Reproducible input contract

The source manifest at `data/pilot/pilot-manifest.draft.json` represents the pilot’s immutable input record. Before a graph build, replace the draft placeholders with approved source URLs, permissions, retrieval timestamps, SHA-256 checksums, feed versions, validator reports, and approval evidence. Do not add source files or graph artifacts to `public/`.

The golden-route suite at `data/pilot/golden-routes.draft.json` contains 20 required review scenarios. Its identifiers intentionally remain provisional until the data owner supplies authoritative stop IDs, coordinates, schedules, and expected outcomes. It is a quality contract, not transit data.

| Command | Meaning | Expected result today |
|---|---|---|
| `npm run validate:pilot` | Validates draft or approved manifest structure | Passes with `PENDING_EXTERNAL_APPROVAL` |
| `npm run validate:golden` | Validates 20-case scenario coverage | Passes with `PENDING_EXTERNAL_ROUTE_REVIEW` |
| `npm run validate:pilot:ready` | Requires all manifest approvals and approved sources | Fails until external approval evidence is supplied |
| `npm run validate:golden:ready` | Requires all golden routes to be approved against the graph | Fails until route review is complete |
| `npm run assure:golden` | Runs only an approved suite through an operator-controlled Sakay API and writes a JSON report | Stops before any request while the suite is draft-only |

## Pre-enable configuration

Live schedule routing is permitted only when all of these values identify the same approved graph release:

| Variable | Required value |
|---|---|
| `OTP_GRAPHQL_URL` | HTTPS GraphQL endpoint for the approved OTP deployment |
| `OTP_API_VERSION` | Pinned deployed OTP version |
| `OTP_DATA_VERSION` | Version or effective date from the approved source manifest |
| `OTP_DATA_MANIFEST_ID` | Immutable manifest identifier |
| `OTP_SUPPORT_BOUNDARY` | Rider-visible service-area wording |

The routing provider rejects any incomplete provenance before it contacts OpenTripPlanner. Successful itinerary responses return these fields under `source`, so the mobile client can disclose the exact schedule dataset and support boundary.

The assurance runner never fetches a transit feed or contacts a public OpenTripPlanner service directly. When the golden suite is marked approved and populated with operator-supplied coordinates and departure times, set `SAKAY_BASE_URL` to the controlled Sakay service. The runner calls only that service’s `/api/routes` contract and stores a reviewable report outside public assets.

## Promotion checklist

Promote a graph only after the data owner has confirmed use rights, the validator report is stored, the graph build is repeatable from checksummed inputs, all 20 golden routes have been reviewed, and operations has tested unavailable/degraded responses. Record the completed approvals in `docs/PILOT_CORRIDOR_DECISION.md` before changing any configuration in a deployed environment.
