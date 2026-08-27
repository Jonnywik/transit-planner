# Requested Arrival, Fare, Traffic, and Interruption Features — Decision Record

## Decision summary

Sakay will add a **MRT-3 scheduled headway reference**, a **dated PUV fare-notice reference**, and an **external Google Maps traffic handoff**. It will not label any of these features as a live train arrival, current calculated fare, verified road closure, or in-app Google traffic layer. This preserves useful information while keeping source limits visible.

| Requested feature | Implemented safe capability | Explicit non-claim |
|---|---|---|
| Live train arrival prediction from first service time and average interval | MRT-3 scheduled service/headway reference, evaluated against the rider’s selected local date/time. | It is not the next-train time, vehicle location, delay, or real-time arrival prediction. |
| Use supplied PUV fare image | A dated reference panel that reproduces the notice’s scope and links to its historical context. | It is not a current, route-specific, or rail-fare calculation. |
| Live traffic layer without road closures | An external Google Maps traffic view handoff, available without a Maps API key. | Sakay does not render, cache, or interpret Google traffic content; congestion is not a verified road closure. |
| Verified road interruption feed | A provider-ready unavailable state and a documented feed contract. | Sakay will not claim verified closures without a current, authoritative MMDA/road-authority feed, source rights, timestamps, and freshness evidence. |

## Train arrivals: why an average is not live

The official DOTr MRT-3 page publishes weekday, Saturday, and Sunday/holiday **headway ranges** across operating periods, including different service patterns from 4:30 AM through late evening. [1] A headway is a planned interval between train services; adding an average interval repeatedly from the start of service assumes that every train departed on time, remained in service, held the planned interval, and reached the requested station without disruption. The published page itself contains different periods and station-specific first/last service timings, so it cannot produce a reliable current arrival prediction by arithmetic alone. [1]

Accordingly, Sakay’s feature will identify the relevant planned period and present its published headway range with a clear “scheduled reference only” label. It will never call the result “live,” “arrival,” “next train,” or “prediction.” A future live-arrival feature requires a current operational feed or an authorized official provider integration that supplies vehicle/station observations, a retrieval timestamp, direction, and freshness policy.

## Fare notice: scope and recency

The supplied image is headed “Land Transportation Franchising and Regulatory Board, Regional Office IV” and shows distinct effective dates: **8 October 2023** for PUJ/FILCAB, **10 May 2023** for UV Express, and **2 November 2018** for PUB. It describes PUV categories, not rail fares. LTFRB’s February 2025 public FOI response reports the same first-four-kilometre P13/P15 PUJ rates and the P1.80/P2.20 succeeding-kilometre rates. [2] However, a Philippine News Agency report dated 17 March 2026 describes later LTFRB-approved fare changes that were expected to take effect after the publication/posted-matrix process. [3]

Because the supplied notice is dated and does not cover train fares, Sakay will preserve it only as an **historical user-supplied reference**, separated from route results and from the existing `Fare unavailable` state. It will not calculate a current fare from this image. A current fare calculator requires the controlling authority’s final effective fare matrix for the rider’s exact route, vehicle class, passenger category, and applicable discount.

## Traffic visibility

Google documents that Maps URLs can launch a map across devices without an API key and supports the `layer=traffic` map parameter. [4] Google separately documents that TrafficLayer displays current traffic conditions where supported and refreshes frequently, but not instantly. [5] Sakay’s current Leaflet map must not render Google Maps traffic content. Google’s policies require Maps JavaScript API results to appear on a Google Map and require compliant attribution when Google Maps Platform content is shown. [6]

The selected implementation is therefore an external link that opens Google Maps’ traffic layer. The external interface owns all traffic content, attribution, coverage, and refresh behavior. Sakay will state only that the link opens Google Maps traffic and that congestion visibility does not prove a road closure.

## Verified road interruptions

The MMDA GIS Hub is an official MMDA portal that describes a public GIS and API-enabled regional-data platform. [7] Its public catalogue did not identify a current named road-closure or incident feed with a documented schema, event timestamp, expiry, operator, geographical scope, and reuse authorization. Search results surfaced official advisories and unverified third-party references, but not a verifiable current machine-readable feed. A generic or scraped source would be unsuitable for verified road-closure claims.

Sakay will retain the existing advisory-only OSM/map context and add a provider-ready status boundary. The boundary remains unavailable until an authority provides a concrete endpoint or signed feed agreement. Its acceptance criteria require authority identity, direct source URL, explicit use rights, event ID, start/update/end timestamps, affected geometry or authoritative road segment identifiers, classification, refresh interval, error behaviour, and a maximum permitted staleness. The rider interface will remain unavailable if any condition is missing or expired.

## References

[1]: https://dotrmrt3.gov.ph/about-us "DOTr MRT-3: Train Schedule"
[2]: https://www.foi.gov.ph/agencies/ltfrb/how-fare-matrix-is-made/ "LTFRB FOI response: How Fare Matrix is made"
[3]: https://www.pna.gov.ph/articles/1271201 "PNA: LTFRB announces PUV fare hikes for land transport"
[4]: https://developers.google.com/maps/documentation/urls/get-started "Google Maps URLs: Get Started"
[5]: https://developers.google.com/maps/documentation/javascript/trafficlayer "Google Maps JavaScript API: Traffic, Transit, and Bicycling Layers"
[6]: https://developers.google.com/maps/documentation/javascript/policies "Google Maps JavaScript API: Policies and attributions"
[7]: https://metro-manila-geographic-information-system-hub-mmda.hub.arcgis.com/ "Metro Manila GIS Hub"
