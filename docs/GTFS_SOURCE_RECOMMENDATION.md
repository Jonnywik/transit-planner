# Recommended GTFS Sources for the Sakay MRT-3 Pilot

## Recommendation

For live Sakay journey guidance, use **only a direct, rights-cleared GTFS Schedule feed from DOTr-MRT3 or its formally appointed data custodian**. The DOTr-MRT3 site is the official public identity for the service, but the reviewed pages did not publish a GTFS Schedule endpoint or licence. Therefore, it is the correct **source owner** to obtain or monitor for a feed—not a currently usable download URL. [1]

If the owner publishes a canonical GTFS ZIP at a stable HTTPS address with reuse terms, the existing no-touch release process can ingest it without routine user operation. The source policy must first identify the exact URL, permission evidence, expected feed version/update cadence, expiry, checksum, and support boundary. The Canonical GTFS Schedule Validator must then pass before the graph may be built. [2]

## Ranked source classes

| Rank | Source class | Recommendation | Why |
|---:|---|---|---|
| 1 | **Direct DOTr-MRT3 GTFS Schedule export** | **Use when published or formally supplied with rights.** | It is the strongest provenance path for MRT-3 schedules, stops, trips, calendars, and change control. It gives the project a named accountable owner for source corrections and expiry. |
| 2 | **DOTr/LTFRB or appointed mobility-data custodian’s consolidated GTFS export** | **Use conditionally.** | Suitable only if the provider confirms in writing that the current MRT-3 feed is included, current, redistributable for Sakay’s use, and supplied with a stable update/withdrawal policy. |
| 3 | **Contracted GTFS production feed authorized by DOTr-MRT3** | **Use conditionally.** | A vendor-managed feed can be production-grade if its contract identifies the agency as data owner, authorizes trip-planning use, exposes change timing, and provides a route for correction/incident escalation. |

The second and third options are alternatives for acquiring authoritative data, not permission to use any similarly named feed found online. The formal rights and accuracy evidence must be attached to the source policy before the automated graph pipeline accepts a file.

## Sources not recommended for live rider guidance

| Candidate | Evidence found | Decision |
|---|---|---|
| Mobility Database `mdb-1269` | Its published catalog record marks the Philippines source `inactive`, gives the provider simply as “Philippines,” records a 2022 extraction, and redirects to `mdb-1106`. [3] | **Do not use for live routing.** It is a discovery record, not current source authority. |
| Mobility Database `mdb-1106` | Its record is also `inactive`; its direct-download URL is the `sakayph/gtfs` archive and its listed providers span multiple agencies. [4] | **Do not use for live routing.** It cannot establish current MRT-3 schedule validity or reuse rights. |
| `sakayph/gtfs` / Transitland feed | Transitland displays the GitHub archive as its source and shows a recent catalog fetch, but its displayed active feed version covers only 2013-06-17 through 2020-06-30. [5] | **Reference and schema inspection only.** A recent fetch of a historical feed does not make its schedule current. |

> Sakay should not promote a graph built from an aggregated, inactive, historical, or licence-unclear feed—even if it is technically valid GTFS. In this context, a truthful unavailable result is preferable to an unverified travel recommendation.

## Evidence the no-touch pipeline needs

The automated release workflow can proceed only when the selected source class produces the following machine-verifiable evidence. These records are supplied once by the responsible source owner or controlled release system; routine data validation, expiry checks, graph eligibility, and safety rollback then run automatically.

| Evidence | Required rule |
|---|---|
| Direct HTTPS source URL | Must be the owner-approved download or controlled delivery endpoint. |
| Rights evidence | Must identify the permitted trip-planning use, restrictions, owner, and revocation/update contact. |
| Source version and effective dates | Must identify what schedules and service calendars the file represents. |
| Retrieval timestamp and SHA-256 checksum | Must allow the exact graph input to be reproduced and source drift to be detected. |
| Canonical validator report and issue disposition | Must show structural validation and resolution/acceptance of warnings. |
| OTP version, graph checksum, and manifest ID | Must bind the rider-facing deployment to the approved graph release. |
| Passing 20-case golden-route report | Must demonstrate the controlled pilot cases against that exact source and graph. |

## Practical path for the current pilot

The most defensible next state is to leave the policy at `DRAFT`, retain `ROUTING_UNAVAILABLE`, and designate DOTr-MRT3 or a formally appointed data custodian as the sole target for a direct GTFS Schedule feed. Mobility Database can be monitored for discovery, and the historic `sakayph/gtfs` repository may remain a schema/reference fixture, but neither should be admitted to the source allowlist.

Once a qualified direct source is available, insert it into the controlled policy, let the no-touch validator and release-gate automation evaluate it, and promote only a fully passing release. This preserves the user’s no-manual-operation goal without bypassing source-owner authorization.

## References

[1]: https://www.dotrmrt3.gov.ph/ "DOTr-MRT3 official website"
[2]: https://gtfs.org/getting-started/validate/ "GTFS: Evaluate Your GTFS Feed’s Quality"
[3]: https://github.com/MobilityData/mobility-database-catalogs/blob/master/catalogs/sources/gtfs/schedule/ph-unknown-philippines-gtfs-1269.json "Mobility Database mdb-1269 catalog record"
[4]: https://github.com/MobilityData/mobility-database-catalogs/blob/master/catalogs/sources/gtfs/schedule/ph-pambansang-punong-rehiyon-manila-light-rail-transit-authority-gtfs-1106.json "Mobility Database mdb-1106 catalog record"
[5]: https://www.transit.land/feeds/f-wdw-manila "Transitland Metro Manila GTFS feed record"
