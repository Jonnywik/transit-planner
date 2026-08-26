# Sakay — Metro Manila Transit Planner

Sakay is a **prototype** for planning Metro Manila transit journeys. The present route, fare, vehicle, accessibility, and traffic data remain demo fixtures until authoritative provider integrations are completed. Do not use the interface for live travel decisions.

## Sprint 1 capabilities

Sprint 1 introduces a same-origin geocoding gateway, response cache, upstream request throttle, identifying provider header, client/provider boundary, selected-place integrity safeguards, keyboard-accessible location suggestions, and Node-native quality checks.

## Run locally

Use Node.js 20 or newer. Configure a real, operator-owned application identifier before starting the local gateway. The gateway refuses upstream requests without this value. Then run:

```bash
export GEOCODER_USER_AGENT="Sakay-Transit-Planner/0.1 (contact: you@example.com)"
npm test
npm run check
npm run dev
```

Open `http://localhost:3000` after the server starts. The browser talks only to the local `/api/geocode/*` endpoints; the server manages provider requests and caches results.

## Provider configuration

The default gateway is configured for a Nominatim-compatible endpoint. Any production operator must review the active provider's terms, configure an identifying `GEOCODER_USER_AGENT`, use a cache, keep traffic within provider limits, retain attribution, and be able to switch providers without a client update. The public Nominatim service does **not** allow client-side autocomplete; this project therefore uses the same-origin gateway rather than fetching Nominatim directly from the browser.

## Quality commands

| Command | Purpose |
|---|---|
| `npm test` | Runs gateway contract and cache tests with Node's built-in test runner. |
| `npm run check` | Performs syntax checks for server and client JavaScript. |
| `npm run dev` | Starts the local static server and same-origin geocoding gateway. |

## Current limitations

Routing, fares, vehicle positions, traffic, route explorer data, and accessibility data are still local demo fixtures. Sprint 2 replaces the production route path with a version-pinned OpenTripPlanner integration and validated static transit data.
