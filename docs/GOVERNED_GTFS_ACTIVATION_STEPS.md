# Step-by-Step: Activate Sakay Routing with Governed GTFS Data

## The practical answer

Sakay is ready to automate the technical process, but it cannot create legal permission or invent an authoritative schedule. The sequence below separates the one-time external authorization from the **no-touch** technical workflow. After the source owner provides the approved data channel and hosting authorization, the repository controls run without you entering routine commands or approving each validation run.

> Until Step 4 has passed automatically, the correct production result is `ROUTING_UNAVAILABLE`. Do not substitute a historical or scraped feed to make the app appear live.

## Step 1 — Name the authorized source owner

Designate **DOTr-MRT3** or its formally appointed data custodian as the source owner for the pilot. The current project should use no other source as a live substitute.

Ask the owner to provide either a stable HTTPS GTFS Schedule ZIP endpoint or delivery to an approved controlled storage location. The agreement must explicitly permit Sakay to use the data for public journey planning and derived routing results.

| Request item | Why it is needed |
|---|---|
| GTFS Schedule URL or controlled delivery channel | Lets automation retrieve only the approved file. |
| Written reuse rights and agency/data-owner identity | Establishes that Sakay may create and show routes from the data. |
| Feed version, service-effective dates, and update cadence | Lets the system detect stale schedules. |
| Change/withdrawal contact | Gives the automated process a defined escalation and source-expiry policy. |
| Confirmation that MRT-3 stops, trips, calendars, and exceptions are included | Prevents an incomplete feed from becoming rider guidance. |

## Step 2 — Register the source once in the controlled policy

An authorized release owner records the direct HTTPS URL, source ID, rights-evidence reference, retrieval/update rules, expiry timestamp, and checksum expectations in the protected release policy. The policy must also specify the approved OTP version, data version, manifest ID, graph checksum, and rider-visible boundary: **“MRT-3 pilot corridor only.”**

Do not place feed files, graph files, credentials, or unredacted source-delivery details in `public/`. The committed `data/pilot/pilot-source-policy.draft.json` remains intentionally non-authorizing until the complete evidence is available.

## Step 3 — Let the automated validation pipeline process each release

For every authorized feed release, the automated process should perform the following work in order:

1. Retrieve only the allowlisted source from the designated channel.
2. Calculate and record its SHA-256 checksum, retrieval time, version/effective dates, and source metadata.
3. Run a pinned Canonical GTFS Schedule Validator release and retain its HTML, JSON, and system-error reports.
4. Block automatically on validator errors; apply the approved warning policy rather than silently suppressing notices.
5. Validate the approved OSM walking-network input in the same release record.
6. Build the graph with the pinned OTP version and retain the graph checksum and exact build configuration.

The GTFS standard recommends validator-backed quality checks, including confirmation that a feed is complete, accurate, and current. [1]

## Step 4 — Bind and test the exact OTP graph release

The controlled OTP host loads the graph built in Step 3. The release process verifies the GraphQL endpoint in a non-public environment, confirms the expected data is loaded, and populates the 20 golden-route cases with approved coordinates, dates, expected availability, and required transit modes.

The golden-route assurance run must identify the same manifest ID and graph checksum as the release policy. A single failed or missing result blocks promotion automatically. `READY` may be used only after every case passes; otherwise the app stays unavailable.

## Step 5 — Allow the release gate to promote only eligible builds

The repository’s no-touch gate evaluates the source policy, manifest, golden-route suite, assurance report, expiry dates, source checksums, OTP version, data version, manifest ID, and graph checksum. It then produces one deterministic state:

| Automated state | What Sakay does |
|---|---|
| `BLOCKED` | Serves `ROUTING_UNAVAILABLE`; it does not contact OTP or invent a fallback route. |
| `ELIGIBLE` | Permits the server-side route provider to query the exact controlled OTP graph. |

The route server reads this state from a secure non-public file through `PILOT_RELEASE_STATE_PATH`. If the file is missing, unreadable, blocked, or inconsistent, the default is unavailable routing.

## Step 6 — Keep it running automatically

The repository’s **Pilot routing readiness** workflow runs daily at 03:17 UTC and writes a readiness summary. It validates known artifacts only; it does not fetch unknown feeds or change live configuration. In the deployment environment, the controlled release workflow should run whenever the authorized source publishes a new approved version and also on its agreed schedule.

An expired source, changed checksum, failed GTFS validation, failed golden route, unavailable OTP endpoint, or release mismatch results in automatic blocking or rollback. This is the intended operating behavior: an outage or stale schedule should not become misleading route advice.

## What you need to do now

The only current action outside the automated system is to obtain an authorized GTFS Schedule source and formal use rights from DOTr-MRT3 or its data custodian, together with authorization for the graph-hosting environment. Once those are supplied to the governed input channel, the automation already in the repository can validate releases and keep unsafe ones blocked.

The historic `sakayph/gtfs` source and its related inactive Mobility Database records must remain reference-only. They are not an acceptable replacement for the owner-controlled source. [2] [3]

## References

[1]: https://gtfs.org/getting-started/validate/ "GTFS: Evaluate Your GTFS Feed’s Quality"
[2]: https://github.com/MobilityData/mobility-database-catalogs/blob/master/catalogs/sources/gtfs/schedule/ph-pambansang-punong-rehiyon-manila-light-rail-transit-authority-gtfs-1106.json "Mobility Database mdb-1106 catalog record"
[3]: https://www.transit.land/feeds/f-wdw-manila "Transitland Metro Manila GTFS feed record"
