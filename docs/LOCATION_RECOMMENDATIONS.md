# Live Location Recommendations

## Experience

Sakay now updates location and address recommendations as a rider types at least three characters. The interface immediately filters recently received results in the browser, then refreshes the recommendation set through the existing same-origin geocoding endpoint. Each result separates the primary place name from its Metro Manila address context, and the input exposes its in-progress state with `aria-busy` while a live request is outstanding.

Riders can use the arrow keys and Enter to select a result. A new input invalidates the prior selection and cancels the browser’s superseded request, preventing stale responses from replacing a later query. The server remains the only component that contacts the geocoding provider.

## Provider controls and limits

The server keeps a shared in-memory response cache, a minimum one-second interval between upstream requests, a strict Metro Manila search boundary, five-result limit, server-held identifying user agent, and same-origin browser access. Those controls protect responsiveness for repeated address queries without exposing a provider credential or endpoint to the public client.

The configured public Nominatim service has a maximum application-wide rate of one request per second, requires an identifying user agent or referer, and requires applications to be able to switch providers with caching enabled. Its policy also says client-side autocomplete using its API is not supported. [1] Sakay’s browser therefore never calls Nominatim directly; it uses the controllable server boundary and only reacts to direct typing by the rider. This is suitable for current controlled development and moderate, user-initiated testing—not an approval for unrestricted production autocomplete traffic.

Before a broad public launch, the operator must perform a provider-specific capacity and policy review. If the expected traffic exceeds the public-service constraints, configure an operator-controlled geocoder or an approved address-recommendation provider behind the existing same-origin boundary. Do not increase client request frequency or bypass the server throttle.

## Verification

The live interaction smoke test validates the 390 × 844 experience using real geocoding: it waits for a rich primary/secondary recommendation, confirms that the input returns to `aria-busy="false"`, selects the address, and continues through the route-search flow. Unit tests cover result normalization, deterministic cached-result ranking, de-duplication, cache behavior, provider identification, and safe provider-unavailable behavior.

## References

[1]: https://operations.osmfoundation.org/policies/nominatim/ "Nominatim Usage Policy"
