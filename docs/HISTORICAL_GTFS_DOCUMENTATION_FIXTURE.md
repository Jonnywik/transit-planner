# Historical GTFS Documentation Fixture

## Scope

Sakay records the `sakayph/gtfs` repository at revision `b7394ccd0c22e7fcc18cc6b53baa1200e99e8a87` only as a **development-only documentation fixture**. The pinned revision is dated 24 March 2015 and its observed static-service calendars end on 30 June 2020. The repository is consequently unsuitable for current routing, schedule, fare, disruption, arrival, or accessibility claims.

The fixture manifest deliberately contains **metadata only**, not copied GTFS records. It exists to make parser/schema demonstrations reproducible in a private documentation environment while preventing the fixture from becoming a hidden route-data dependency. The existing static MRT-3 station-reference router remains based on current official station and fare-matrix pages, not on this historical feed.

## Permitted and prohibited use

| Use case | Status | Reason |
|---|---|---|
| Explain GTFS file structure in project documentation | Permitted | The source is pinned and identified as historical. |
| Rehearse a parser or a graph build offline | Permitted only with explicit developer opt-in | It can demonstrate integration mechanics but never current service. |
| Show fixture provenance and expired service coverage | Permitted | It prevents inaccurate documentation. |
| Return a route from `/api/routes` | Prohibited | The source has no current service validity or production approval. |
| Populate normal rider UI, map, fares, or arrival labels | Prohibited | It would convert historical data into present-tense travel advice. |
| Fetch the source automatically in release workflows | Prohibited | The fixture is not a controlled data integration. |

## Implementation boundary

The fixture manifest has `productionEligible: false`, `riderVisible: false`, and `requiresExplicitDeveloperOptIn: true`. Source-governance and pilot-release gates must reject it regardless of whether the site is publicly deployed. Private access lowers distribution risk, but it does not turn expired 2013–2020 service calendars into current transit operations.

The upstream repository’s Developer License Agreement controls use of DOTC data and states that the data may be modified or withdrawn. The project records that notice and does not treat the repository URL as an ongoing, authorized, stable data endpoint. [1]

## Relationship to the functional MRT-3 reference router

The in-app **MRT-3 station route & fare** capability is a distinct, static reference tool. It accepts only two named MRT-3 stations, calculates direction/intermediate station order from the official published line order, and looks up their pair in the official regular or concessionary matrix. It does not use the historical fixture and is not a general Metro Manila journey planner. See `docs/MRT3_STATION_REFERENCE_ROUTER.md` for its input rules and limits.

## Reference

[1]: https://github.com/sakayph/gtfs/blob/master/LICENSE.md "SakayPH GTFS Developer License Agreement and Terms of Use"
