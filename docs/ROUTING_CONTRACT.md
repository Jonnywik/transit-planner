# Sprint 2 Routing Contract

## Purpose

Sakay now treats OpenTripPlanner as an external, version-pinned schedule-routing provider. The browser never calls the provider directly; it calls the same-origin `POST /api/routes` boundary, which validates coordinates, normalizes the provider response, and returns source metadata with every successful itinerary response.

## Required deployment configuration

The service requires all of the following deployment-time values before it can return an itinerary:

| Variable | Example | Purpose |
|---|---|---|
| `OTP_GRAPHQL_URL` | `https://otp.example.org/graphql` | Full GraphQL endpoint for the selected OTP deployment. |
| `OTP_API_VERSION` | `2.9.0` | Explicit deployed OTP version, shown in route provenance. |
| `OTP_DATA_VERSION` | `metro-manila-2026-08-01` | Approved source version or effective date for the active static routing graph. |
| `OTP_DATA_MANIFEST_ID` | `mrt3-2026-08-01-release-a` | Immutable approved source-manifest identity for rider disclosure and incident review. |
| `OTP_SUPPORT_BOUNDARY` | `MRT-3 pilot corridor only` | Rider-visible support boundary tied to the approved graph. |

When any routing or provenance value is absent, the route endpoint returns `503 ROUTING_UNAVAILABLE`; it never falls back to generated itineraries. This is intentional, because the current repository has no validated Metro Manila GTFS/OSM graph.

## Endpoint

`POST /api/routes`

```json
{
  "origin": { "latitude": 14.5995, "longitude": 120.9842 },
  "destination": { "latitude": 14.5490, "longitude": 121.0278 },
  "departureTime": "2026-08-27T08:00:00+08:00",
  "limit": 3
}
```

The response contains `availability`, an itinerary array, and source metadata. `READY` means schedule itineraries were returned. `NO_ROUTE` means the configured OTP instance returned an empty itinerary connection. `ROUTING_UNAVAILABLE` is an explicit non-success response that conveys configuration, provenance, or provider availability failure. Successful source metadata includes the provider, API version, data version, manifest identifier, retrieval time, support boundary, schedule status, and `fareStatus: "UNAVAILABLE"`.

## Provider query and normalization

The adapter uses OTP’s documented `planConnection` GraphQL query with coordinate-based labelled locations, an earliest-departure timestamp, and a bounded `first` value. It maps OTP edges to the Sakay itinerary contract and preserves mode, route label/GTFS ID, schedule times, distance, and decoded leg geometry. Fares, real-time predictions, traffic, and accessibility guarantees remain unavailable until source-controlled data contracts are implemented.

The OTP GraphQL tutorial documents `planConnection` for routing results and OTP’s API reference documents `origin`, `destination`, `dateTime`, and pagination controls. OTP’s current API overview also notes that the REST API was removed in 2025. [1] [2] [3]

## Operational verification before enablement

Before setting the environment variables, the team must validate the draft manifest and golden-route catalog, build a versioned graph from validated Metro Manila GTFS and OpenStreetMap inputs, verify GraphQL queries in the deployment’s GraphiQL interface, approve the 20-case golden-route suite for the first supported corridor, and record the graph version in `OTP_DATA_VERSION`. A successful HTTP response alone is not proof of itinerary correctness. See `docs/PILOT_ROUTING_RUNBOOK.md` for the controlled promotion sequence.

## References

[1]: https://docs.opentripplanner.org/en/latest/apis/GraphQL-Tutorial/ "OpenTripPlanner GraphQL Tutorial"
[2]: https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/queries/planConnection "OpenTripPlanner planConnection Query"
[3]: https://docs.opentripplanner.org/en/latest/apis/Apis/ "OpenTripPlanner API Overview"
