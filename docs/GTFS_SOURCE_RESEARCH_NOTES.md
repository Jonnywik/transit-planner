# GTFS Source Research Notes — 2026-08-27

## Verified findings

| Candidate | Verified finding | Preliminary treatment |
|---|---|---|
| Direct DOTr-MRT3 source | The DOTr-MRT3 website identifies the operator and public service information. The researched official pages did not expose a GTFS Schedule download or licensing endpoint. | **Preferred source owner to contact or monitor.** Do not treat timetable pages as GTFS or infer a feed URL. |
| Mobility Database `mdb-1269` | Published catalog record identifies the provider only as “Philippines,” marks the source `inactive`, records a 2022 extraction, and redirects to `mdb-1106`. | **Catalog pointer only; not a production source.** |
| Mobility Database `mdb-1106` | Published catalog record identifies MRT Corporation and other operators but marks the source `inactive`; its direct-download URL points to `sakayph/gtfs`. | **Reference-only catalog record.** It does not establish currentness or rights. |
| `sakayph/gtfs` through Transitland | Transitland lists the GitHub archive as the current source and a recent successful fetch, but its displayed feed version covers 2013-06-17 through 2020-06-30. | **Historical/schema reference only; not acceptable for the live pilot.** A recent catalog fetch does not make its 2020 schedule current. |

## Source links

[1]: https://www.dotrmrt3.gov.ph/ "DOTr-MRT3 official website"
[2]: https://github.com/MobilityData/mobility-database-catalogs/blob/master/catalogs/sources/gtfs/schedule/ph-unknown-philippines-gtfs-1269.json "Mobility Database mdb-1269 catalog record"
[3]: https://github.com/MobilityData/mobility-database-catalogs/blob/master/catalogs/sources/gtfs/schedule/ph-pambansang-punong-rehiyon-manila-light-rail-transit-authority-gtfs-1106.json "Mobility Database mdb-1106 catalog record"
[4]: https://www.transit.land/feeds/f-wdw-manila "Transitland Metro Manila GTFS feed record"
