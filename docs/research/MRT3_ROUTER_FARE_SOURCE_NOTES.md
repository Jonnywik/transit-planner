# MRT-3 Router and Fare Source Notes

**Reviewed:** 27 August 2026

The official DOTr MRT-3 fare-matrix PDF publishes a regular station-to-station matrix for the MRT-3 line, with amounts ranging from ₱13.00 to ₱28.00 across the listed station pairs. The extracted PDF text does not supply an effective date or a complete fare-medium/discount applicability statement. It can support an explicitly labeled **official matrix reference lookup**, but it cannot on its own justify a claim that the returned amount is the current fare a rider will pay. [1]

The official MRT-3 service notice dated 13 April 2025 states that extended weekday operations would continue indefinitely and lists the last trips as 10:30 PM from North Avenue and 11:09 PM from Taft Avenue. This is useful for explaining that service information can be direction-specific, but it is not a current realtime feed and does not establish a train arrival time. [2]

The LRTA’s official Tickets and Fares page states that a 50% across-the-board fare discount for LRT-2 and MRT-3 became effective 23 March 2026, but directs riders to updated station fare posters for exact trip amounts. A side-project calculator must not derive a current discounted fare from the older regular matrix without a dated, matching official matrix or an explicit approved pricing version. [3]

The official DOTr MRT-3 Citizen’s Charter page publishes direct links to a regular fare matrix, a discounted fare matrix, and a station map. Its MRT-3 overview documents 13 stations and publishes system headway periods plus station entrance/last-train schedules. These official references can support a **limited station-to-station reference tool** but do not provide a general Metro Manila itinerary, vehicle position, disruption signal, or realtime arrival. [4]

The official station-map PDF confirms the published line order: North Avenue, Quezon Avenue, GMA Kamuning, Araneta-Cubao, Santolan-Annapolis, Ortigas, Shaw Boulevard, Boni Avenue, Guadalupe, Buendia, Ayala, Magallanes, and Taft Avenue. This can support an input-constrained MRT-3 station selector without relying on historic GTFS. The official schedule page also publishes station-specific entrance and last-train schedules, so a reference router can report whether a selected station/direction is outside the published entry or final-departure window without predicting a train. [5]

The official regular and concessionary matrix PDFs provide complete directional station-pair reference amounts for the same 13 MRT-3 stations. The regular PDF lists ₱13.00, ₱16.00, ₱20.00, ₱24.00, and ₱28.00 tiers; the concessionary PDF explicitly identifies the matrix as applying to students, senior citizens, and persons with disabilities and lists ₱6.00, ₱8.00, ₱10.00, ₱12.00, and ₱14.00 tiers. Because neither downloaded PDF presents its effective date in the matrix itself, calculator output must retain an **“official matrix reference—confirm at station”** limitation and link directly to the relevant source. [6]

## Side-project-safe conclusion

The feasible non-GTFS path is a limited **MRT-3 station reference router** paired with an **official regular-matrix lookup**, provided that the UI clearly says it is a static reference and requires riders to check the linked operator matrix and station fare display. It must not calculate a live timetable, general Metro Manila itinerary, current promotional/discounted fare, or a fare for a location that is merely near a station.

## References

[1]: https://www.dotrmrt3.gov.ph/fare-matrix.pdf "DOTr MRT-3 Fare Matrix"
[2]: https://dotrmrt3.gov.ph/news/mrt-3-to-maintain-extended-weekday-operations-indefinitely "DOTr MRT-3 extended weekday operations notice"
[3]: https://www.lrta.gov.ph/tickets-and-fares/ "LRTA Tickets and Fares"
[4]: https://dotrmrt3.gov.ph/about-us "DOTr MRT-3 About Us and Train Schedule"; https://dotrmrt3.gov.ph/citizens-charter "DOTr MRT-3 Citizen’s Charter"
[5]: https://dotrmrt3.gov.ph/station-map.pdf "DOTr MRT-3 Station Map"
[6]: https://dotrmrt3.gov.ph/fare-matrix.pdf "DOTr MRT-3 Regular Fare Matrix"; https://dotrmrt3.gov.ph/discounted-fare-matrix.pdf "DOTr MRT-3 Concessionary Fare Matrix"
