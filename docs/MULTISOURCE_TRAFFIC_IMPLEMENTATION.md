# Multi-Source Transit and Road-Traffic Implementation

## Implemented source controls

Sakay now keeps its proposed data sources in one governed registry. OpenStreetMap is registered as a staging-only street-network input; the pinned SakayPH repository revision is registered as historical/reference-only surface-transit data; and Mobility Database is registered as inactive catalog/discovery metadata. The registry records shared historical lineage between SakayPH and the catalog record, so they cannot be mistakenly used as independent confirmation.

An isolated GTFS inspector can verify that a staging feed contains the required core GTFS files and records its `HISTORICAL_STAGING_ONLY` result. The result explicitly cannot grant timetable currency, live-routing rights, or production eligibility. Current LRT/MRT schedules remain unavailable pending an approved direct operator GTFS source.

## Interruption and real-time safety model

The interruption evaluator distinguishes `MAPPED_BASELINE`, `ADVISORY_UNVERIFIED`, and `VERIFIED_ACTIVE` conditions. Only an unexpired event from an approved real-time authority profile may affect routing. A dated OSM attribute, absence of a map restriction, or traffic-layer color remains advisory context rather than proof that a road is open, closed, or safe.

The rail status evaluator returns a **scheduled estimate** only for a current approved static source. A live train update requires an approved operational profile, matching static-data version, valid trip and stop identifiers, and a fresh timestamp. A missing, stale, or mismatched operational feed is displayed as unavailable rather than a predicted train arrival.

## Google traffic and road ETA boundary

The new `POST /api/road-eta` endpoint is separate from transit routing. It accepts selected coordinates and a departure time, then—only when the server has an authorized Google Routes API configuration—requests a traffic-aware `DRIVE` route. It returns only road duration, distance, traffic-speed intervals, route geometry, and source metadata. The browser never receives a Google server credential.

The boundary has a five-second upstream timeout, 250-millisecond uncached request interval, 60-second coordinate/time-bucket cache, 50-entry maximum cache, strict request validation, and a fixed Google Routes API host. Without the authorized configuration it returns `503 ROAD_ETA_UNAVAILABLE`; it does not substitute a generic driving estimate, bus/jeepney timetable, or train-arrival prediction.

The mobile planning sheet now includes a **Road ETA** action and a compact traffic capability disclosure. A successful result is labeled **Traffic-aware road ETA** and **Driving route only**, with source/retrieval information and a prominent notice that it is not a bus, jeepney, or train arrival prediction. The map traffic layer remains unavailable because the deployed map is Leaflet and no authorized Google Maps JavaScript renderer has been configured. Google’s Traffic Layer is a Google Maps JavaScript map layer and is not overlaid through unsupported tiles or scraping. [1]

## No-touch verification

The existing daily readiness workflow now validates the multi-source registry and writes a separate `artifacts/multisource-readiness/status.json` report. The report makes zero network requests. It evaluates profile status, source class, lineage, source evidence, expiry, and intended capability eligibility. The current draft registry correctly returns `BLOCKED`.

| Capability | Current automated outcome | What is still required |
|---|---|---|
| OSM route network | Staging-only | Pinned extract, checksum, coverage record, attribution, and approval. |
| SakayPH bus/jeepney feed | Historical staging-only | Currentness and rights confirmation from the appropriate source owner before any live use. |
| Mobility Database rail discovery | Inactive/reference-only | An approved direct producer feed with current LRT/MRT service dates and rights. |
| Verified interruptions | Unavailable | Time-bounded authority feed, source profile, and freshness policy. |
| Scheduled LRT/MRT estimate | Unavailable | Approved direct current static GTFS and graph validation. |
| Live train arrival update | Unavailable | Approved GTFS-RT/equivalent plus static-ID reconciliation and freshness evidence. |
| Google traffic-aware road ETA | Unavailable | Authorized Google Maps Platform project, server-held Routes API credential, configured source status, and policy/capacity review. |
| Google map traffic visualization | Unavailable | Compliant Google Maps JavaScript map architecture and authorized browser-key restrictions. |

## Source semantics

Google’s Traffic Layer displays traffic conditions where supported and refreshes frequently; it does not itself calculate a route or establish verified road closures. [1] The Google Routes API traffic-aware route capability is restricted to driving or two-wheeler routing and can return traffic-speed intervals alongside route duration. [2] This is why Sakay presents its output solely as a road-mode estimate.

## References

[1]: https://developers.google.com/maps/documentation/javascript/trafficlayer "Google Maps JavaScript API: Traffic Layer"
[2]: https://developers.google.com/maps/documentation/routes/traffic_on_polylines "Google Maps Routes API: Traffic-aware routes and polylines"
