# MRT-3 Station Reference Router and Fare Lookup

## Purpose and supported scope

This side-project capability provides a **limited, in-app MRT-3 station-to-station reference**. A rider explicitly chooses two different MRT-3 stations and a fare-matrix category. Sakay returns the published station order, direction, intermediate stations, station-hop count, selected-time service-window reference, and the corresponding official fare-matrix amount.

The capability does not require GTFS because it is not a general transit planner, timetable router, or vehicle-tracking service. It uses only the published 13-station MRT-3 line order and official regular/concessionary station-pair matrices. [1] [2] [3]

## Eligibility rules

| Input | Accepted values | Result if unavailable or invalid |
|---|---|---|
| Origin and destination | Two different stations in the published MRT-3 station list. | No MRT-3 reference route is returned. |
| Direction | Derived solely from the selected station order. | Never inferred from free-text locations. |
| Fare category | `regular`, or `concessionary` for the official student/senior citizen/PWD matrix. | No eligibility verification is performed; the rider must use the category they are entitled to use. |
| Departure time | Optional valid local date/time. | The static service-window reference is shown; it never becomes a next-train prediction. |

## Output and disclosure rules

| Output | Permitted claim | Explicitly prohibited claim |
|---|---|---|
| Direction and station order | “Board toward Taft Avenue” or “Board toward North Avenue” with listed intermediate stations. | A current train, platform, train location, or transfer itinerary. |
| Service status | “Within/before/after the published system service window” using the existing schedule reference. | Station opening confirmation, service disruption, next arrival, or delay. |
| Fare | “Official matrix reference amount” with a direct matrix link. | A current fare guarantee, final payment amount, promotion, or fare for another rail/road mode. |
| Concessionary amount | “Official student/senior/PWD matrix reference.” | Eligibility verification or a general discount for every rider. |

The published matrix PDFs do not expose an effective date in the matrix content. Every fare result therefore shows **“Confirm the posted fare at the station”** and links to the exact official regular or concessionary matrix. The current application must not combine the matrix with unrelated promotional announcements to derive a new amount. [1] [2]

## Unsupported journeys

The station reference does not route between typed locations, identify a nearest station, calculate walk access, select connections, use bus/jeepney services, calculate multi-leg fares, or cover LRT, PNR, or other rail systems. Those needs continue to use the clearly labeled external Google Maps handoff until authoritative routing/fare data is approved.

## References

[1]: https://dotrmrt3.gov.ph/about-us "DOTr MRT-3: station list and published service reference"
[2]: https://dotrmrt3.gov.ph/fare-matrix.pdf "DOTr MRT-3 Regular Fare Matrix"
[3]: https://dotrmrt3.gov.ph/discounted-fare-matrix.pdf "DOTr MRT-3 Student, Senior Citizen, and PWD Fare Matrix"
