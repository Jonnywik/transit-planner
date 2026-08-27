# Multi-Source Transit Research Notes — 2026-08-27

## Preliminary verified source roles

| Requested source | Verified role | Planning constraint |
|---|---|---|
| OpenStreetMap | A collaborative map database whose road and access attributes can inform the walking/street network. | It is not, by itself, a reliable authoritative real-time road-closure feed; interruption confidence and freshness must be exposed. |
| SakayPH GTFS | The repository describes a Metro Manila GTFS feed containing jeepney, bus, and train data. | Source currentness and public trip-planning reuse rights require a formal evidence review before use beyond clearly historical/staging analysis. |
| Mobility Database | An open catalog of transit feeds and associated data-quality information. | It is a catalog, not necessarily the authoritative producer; the identified Philippine source lineage is inactive/historical and cannot be promoted automatically. |
| GTFS-Realtime / OTP | OTP documentation describes GTFS-RT alerts as disruption messages attached to GTFS entities. | Train predictions and live service interruptions require a source-owner-approved GTFS-RT or equivalent data feed reconciled to the static GTFS IDs. |

The requested integration plan must retain schedule-only labels for static data and must never describe a static timetable as real-time arrival prediction.
