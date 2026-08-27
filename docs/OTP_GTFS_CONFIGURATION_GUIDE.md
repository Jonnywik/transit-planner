# OpenTripPlanner Graph URL and GTFS Validation Guide

## Scope and safety boundary

This guide explains how to prepare an OpenTripPlanner (OTP) schedule-routing deployment for Sakay’s proposed MRT-3 pilot. It does **not** authorize live routing. The current application must continue to return `503 ROUTING_UNAVAILABLE` until the source, graph, golden-route, and operating approvals below are complete.

Keep the GTFS ZIP, OSM extract, graph files, validation reports, and any secrets outside `public/` and outside the public web server’s static root. The browser must call only Sakay’s `POST /api/routes`; it must never call an OTP endpoint directly.

## Choose the OTP endpoint ownership model

| Option | When it fits | What Sakay receives | Key control |
|---|---|---|---|
| **Transit-data owner or platform team operates OTP** | The responsible operator can build, patch, monitor, and restrict the graph deployment. | An HTTPS GraphQL URL for the approved graph release. | Obtain a named owner, deployed OTP version, graph release identifier, and incident/rollback contact. |
| **Existing approved managed OTP deployment** | A trusted provider already exposes an OTP GraphQL service for the governed MRT-3 data. | An HTTPS GraphQL URL and written data/service terms. | Confirm the endpoint is tied to the exact approved graph and cannot silently switch data versions. |

The Sakay configuration process is identical for either option. Do not use an arbitrary public OTP server, an unverified historical feed, or a URL returned by a search engine.

## 1. Acquire and freeze an authoritative GTFS Schedule source

Request the GTFS Schedule ZIP directly from the transit-data owner or an officially published source. Before downloading or processing it, record the source URL, rights or licence evidence, provider contact, permitted use, effective dates, and expected feed version. A feed that parses correctly is not necessarily current, licensed, or suitable for rider-facing journeys.

Store the received file in a protected input directory. The following commands are illustrative; replace bracketed values with the approved local paths and do not commit the ZIP to this repository.

```bash
export GTFS_ZIP="/srv/sakay-data/inbound/approved-mrt3-gtfs.zip"
export VALIDATION_DIR="/srv/sakay-data/validation/mrt3-2026-09-01"

sha256sum "$GTFS_ZIP"
unzip -l "$GTFS_ZIP"
```

Record the resulting SHA-256 checksum, retrieval timestamp, and feed version or effective date in the immutable source record. The corresponding OSM extract must receive the same treatment: documented geographic boundary, retrieval timestamp, licence/attribution review, and checksum.

## 2. Validate the static schedule

Use the Canonical GTFS Schedule Validator maintained by MobilityData. The validator checks the feed against the GTFS Schedule reference and best practices and produces shareable HTML and JSON reports. The current validator documentation lists Java 17 or later as its command-line prerequisite. [1] [2]

Download a **specific released validator version** from the official release page, retain the download checksum/version with the validation record, and run it against the protected ZIP:

```bash
export GTFS_VALIDATOR_JAR="/opt/gtfs-validator/gtfs-validator-vX.Y.Z-cli.jar"
java -jar "$GTFS_VALIDATOR_JAR" -i "$GTFS_ZIP" -o "$VALIDATION_DIR"
```

Review and preserve `report.html`, `report.json`, and `system_errors.json`. Block promotion on all errors. For warnings, record a written disposition from the transit-data owner or data engineer; do not merely suppress them. In particular, verify route and stop names, coordinates, service calendars, exceptions, trip stop times, and feed currency against rider-facing official material. The GTFS guidance emphasizes that a quality feed must be complete, accurate, and up to date. [1]

## 3. Complete the immutable pilot input record

The repository’s `data/pilot/pilot-manifest.draft.json` is a deliberate draft scaffold. Replace its placeholders only after the source evidence is approved. The immutable record should capture, at minimum, the source ID and URL, use-rights evidence, retrieval time, SHA-256 checksum, feed version/effective date, validator report location or identifier, issue disposition, data-owner approver, OSM source details, pinned OTP version, graph-build command/configuration, graph checksum, and manifest identifier.

Set the manifest’s product, data, engineering, and operations approval states only when each owner supplies evidence. Then use the repository’s structural gates:

```bash
npm run validate:pilot
npm run validate:pilot:ready
npm run validate:golden
npm run validate:golden:ready
```

The two `:ready` commands must fail until the metadata and approvals are actually complete. Treat that failure as a deployment block, not as a prompt to lower validation rules.

## 4. Build and verify the approved OTP graph

Build the graph with the pinned OTP release from the checksummed GTFS and OSM inputs in the controlled deployment environment. Preserve the exact build command, router configuration, OTP version, graph checksum, and source-manifest identifier with the release. OTP’s GraphQL tutorial states that the instance must have street and transit data loaded before queries are tested. [3]

Before configuring Sakay, open the OTP GraphiQL interface in the controlled environment and verify that the graph contains the expected approved routes. The OTP documentation uses `/graphiql` for this purpose. Run a read-only route inventory query and a `planConnection` query using approved pilot coordinates and a governed service date/time. The `planConnection` query accepts coordinate or stop-location inputs, an earliest departure or latest arrival time, modes, and a bounded `first` result count. [3] [4]

> Do not use a successful GraphQL response as proof of routing accuracy. The approved 20-case golden-route suite must still be populated with the source-owner’s real stop IDs, coordinates, dates, times, and expectations, then reviewed against this exact graph release.

## 5. Configure Sakay with the graph URL and provenance

Set the following values in the deployment platform’s server-side secret/environment configuration. Do **not** place them in browser JavaScript or commit a populated `.env` file. All five values must refer to the same approved graph release.

| Variable | Set it to | Example form |
|---|---|---|
| `OTP_GRAPHQL_URL` | Full HTTPS GraphQL endpoint of the approved OTP deployment. | `https://otp.example.org/graphql` |
| `OTP_API_VERSION` | Exact OTP version deployed with the graph. | `2.x.y` |
| `OTP_DATA_VERSION` | Approved GTFS `feed_version` or controlled effective-date label. | `mrt3-2026-09-01` |
| `OTP_DATA_MANIFEST_ID` | Immutable approved source/graph manifest ID. | `mrt3-2026-09-01-release-a` |
| `OTP_SUPPORT_BOUNDARY` | Short rider-visible pilot coverage statement. | `MRT-3 pilot corridor only` |

For a temporary local verification only, inject them at process start rather than editing a tracked environment file:

```bash
env \
  OTP_GRAPHQL_URL="https://<approved-otp-host>/graphql" \
  OTP_API_VERSION="<pinned-otp-version>" \
  OTP_DATA_VERSION="<approved-data-version>" \
  OTP_DATA_MANIFEST_ID="<approved-manifest-id>" \
  OTP_SUPPORT_BOUNDARY="MRT-3 pilot corridor only" \
  GEOCODER_USER_AGENT="Sakay Transit Planner (contact: support@sakay.ph)" \
  npm start
```

Sakay refuses to contact OTP when any provenance value is absent. Once configured, its successful route responses disclose the provider, API version, data version, manifest ID, retrieval time, support boundary, schedule status, and `fareStatus: "UNAVAILABLE"`. Fares, real-time predictions, traffic, and accessibility guarantees remain unavailable unless separately governed data contracts are added.

## 6. Exercise Sakay’s route contract and assurance runner

Use approved coordinates and an approved service date/time—not the placeholder values below—to test the endpoint. A response of `READY` means the configured graph returned normalized schedule itineraries; `NO_ROUTE` is a valid empty result; `ROUTING_UNAVAILABLE` means configuration, provenance, or provider health is not ready.

```bash
curl --request POST "http://127.0.0.1:4177/api/routes" \
  --header "Content-Type: application/json" \
  --data '{
    "origin": {"latitude": <approved-origin-latitude>, "longitude": <approved-origin-longitude>},
    "destination": {"latitude": <approved-destination-latitude>, "longitude": <approved-destination-longitude>},
    "departureTime": "<approved-service-time-with-offset>",
    "limit": 3
  }'
```

After all 20 golden cases have an `APPROVED` status and governed request/expectation fields, run the assurance suite through the Sakay API boundary:

```bash
SAKAY_BASE_URL="https://<controlled-sakay-service>" npm run assure:golden
```

The runner deliberately stops before making requests when the suite is draft-only. Preserve its JSON report with the graph release and obtain the required data-owner review before promotion.

## 7. Promotion and rollback decision

Enable live routing only after data rights, source validity, graph reproducibility, 20-case golden-route accuracy, rider disclosure, and operations readiness are all approved and recorded in `docs/PILOT_CORRIDOR_DECISION.md`. The existing `docs/PILOT_ROUTING_RUNBOOK.md` is the project’s controlled promotion checklist.

If the source expires, validation fails, a graph/manifest mismatch is found, or OTP becomes unhealthy, remove the OTP/provenance configuration or roll back to the prior approved release. Sakay will return its truthful unavailable state rather than generate a fallback journey.

## References

[1]: https://gtfs.org/getting-started/validate/ "GTFS: Evaluate Your GTFS Feed’s Quality"
[2]: https://github.com/MobilityData/gtfs-validator "MobilityData Canonical GTFS Schedule Validator"
[3]: https://docs.opentripplanner.org/en/latest/apis/GraphQL-Tutorial/ "OpenTripPlanner GraphQL Tutorial"
[4]: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/queries/planConnection "OpenTripPlanner planConnection Query"
