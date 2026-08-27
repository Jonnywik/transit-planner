import { createGeocodingClient } from './geocoding-client.js';
import { createRoutingClient } from './routing-client.js';
import { createSearchRequestState } from './search-state.js';
import { mergeRecommendationCache, rankRecommendations } from './search-recommendations.js';

/* Signal Ribbon — mobile-first map canvas + thumb-reachable planning sheet.
   This interaction layer preserves explicit place state, controlled geocoding,
   and clear route availability while the UI adopts Sakay Blue / Route Red / Paper White. */

(function () {
  'use strict';

  // --- Constants ---
  const METRO_MANILA_CENTER = [14.5995, 120.9842];
  const DEFAULT_ZOOM = 12;
  const DEBOUNCE_MS = 400;
  const DEMO_MODE = new URLSearchParams(window.location.search).get('demo') === '1';
  const geocodingClient = createGeocodingClient();
  const routingClient = createRoutingClient();

  // --- DOM refs ---
  const inputOrigin = document.getElementById('input-origin');
  const inputDestination = document.getElementById('input-destination');
  const originSuggestions = document.getElementById('origin-suggestions');
  const destinationSuggestions = document.getElementById('destination-suggestions');
  const originStatus = document.getElementById('origin-status');
  const destinationStatus = document.getElementById('destination-status');
  const btnReverse = document.getElementById('btn-reverse');
  const btnGps = document.getElementById('btn-gps');
  const btnPwd = document.getElementById('btn-pwd-toggle');
  const btnSearch = document.getElementById('btn-search');
  const routeForm = document.getElementById('route-form');
  const searchPanel = document.getElementById('search-panel');
  const mapEl = document.getElementById('map');
  const resultsPanel = document.getElementById('results-panel');
  const selectPassenger = document.getElementById('select-passenger');
  const departureTimeInput = document.getElementById('departure-time');
  const btnDepartNow = document.getElementById('btn-depart-now');

  // --- State ---
  let originCoords = null;
  let destinationCoords = null;
  let pwdMode = false;
  let passengerType = 'regular';
  let currentRoutes = null;
  let currentRouteSource = null;
  let routeLayers = [];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function showResultsPanel() {
    searchPanel.hidden = true;
    resultsPanel.hidden = false;
    resultsPanel.classList.remove('results-panel--map-focus');
  }

  function closeResultsPanel() {
    resultsPanel.hidden = true;
    searchPanel.hidden = false;
    clearMapLayers();
  }

  function setDepartureTimeNow() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    departureTimeInput.value = now.toISOString().slice(0, 16);
  }

  function departureTimeIso() {
    const selected = new Date(departureTimeInput.value);
    return Number.isFinite(selected.getTime()) ? selected.toISOString() : new Date().toISOString();
  }

  function departureTimeLabel() {
    const selected = new Date(departureTimeInput.value);
    if (!Number.isFinite(selected.getTime())) return 'Departure time unavailable';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(selected);
  }

  function returnToPlanner({ focusDeparture = false } = {}) {
    closeResultsPanel();
    if (focusDeparture) requestAnimationFrame(() => departureTimeInput.focus());
  }

  setDepartureTimeNow();
  btnDepartNow.addEventListener('click', () => {
    setDepartureTimeNow();
    departureTimeInput.focus();
  });

  // =====================
  // MAP INITIALIZATION
  // =====================
  const map = L.map(mapEl, {
    center: METRO_MANILA_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  window.addEventListener('resize', () => map.invalidateSize());
  requestAnimationFrame(() => map.invalidateSize());

  // =====================
  // GEOCODING + AUTOCOMPLETE
  // =====================
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const suggestionStates = new Map();

  async function geocodeSearch(query, signal) {
    if (query.length < 3) return [];
    return geocodingClient.search(query, signal);
  }

  function setInputStatus(statusEl, message) {
    statusEl.textContent = message;
  }

  function clearPlaceSelection(input) {
    if (input === inputOrigin) originCoords = null;
    if (input === inputDestination) destinationCoords = null;
    input.removeAttribute('data-place-id');
    input.removeAttribute('data-place-label');
  }

  function closeSuggestions(state) {
    state.activeIndex = -1;
    state.results = [];
    state.listEl.innerHTML = '';
    state.listEl.classList.remove('active');
    state.input.setAttribute('aria-expanded', 'false');
    state.input.setAttribute('aria-busy', 'false');
    state.input.removeAttribute('aria-activedescendant');
  }

  function selectSuggestion(state, index) {
    const place = state.results[index];
    if (!place) return;
    state.searchState.select(place);
    state.input.value = place.label;
    state.setCoords([place.latitude, place.longitude]);
    state.input.dataset.placeId = place.placeId;
    state.input.dataset.placeLabel = place.label;
    setInputStatus(state.statusEl, `${place.label} selected.`);
    closeSuggestions(state);
  }

  function updateActiveSuggestion(state, nextIndex) {
    const optionCount = state.results.length;
    if (!optionCount) return;
    state.activeIndex = (nextIndex + optionCount) % optionCount;
    [...state.listEl.children].forEach((option, index) => {
      option.setAttribute('aria-selected', String(index === state.activeIndex));
    });
    state.input.setAttribute('aria-activedescendant', `${state.listEl.id}-option-${state.activeIndex}`);
  }

  function renderSuggestions(state, results, { statusMessage } = {}) {
    state.results = results;
    state.activeIndex = -1;
    state.listEl.innerHTML = '';
    if (!results.length) {
      closeSuggestions(state);
      setInputStatus(state.statusEl, 'No matching locations found. Continue typing or try a nearby landmark.');
      return;
    }

    results.forEach((place, index) => {
      const li = document.createElement('li');
      li.id = `${state.listEl.id}-option-${index}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.setAttribute('aria-label', place.label);
      const primary = document.createElement('span');
      primary.className = 'suggestion__primary';
      primary.textContent = place.primaryLabel || place.label;
      li.appendChild(primary);
      if (place.secondaryLabel) {
        const secondary = document.createElement('span');
        secondary.className = 'suggestion__secondary';
        secondary.textContent = place.secondaryLabel;
        li.appendChild(secondary);
      }
      li.addEventListener('mousedown', (event) => event.preventDefault());
      li.addEventListener('click', () => selectSuggestion(state, index));
      state.listEl.appendChild(li);
    });
    state.listEl.classList.add('active');
    state.input.setAttribute('aria-expanded', 'true');
    setInputStatus(state.statusEl, statusMessage || `${results.length} live location suggestions available. Use the arrow keys to review them.`);
  }

  function initialiseSuggestionInput(input, listEl, statusEl, setCoords, placeType) {
    const state = { input, listEl, statusEl, setCoords, results: [], cachedPlaces: [], activeIndex: -1, abortController: null, searchState: createSearchRequestState() };
    suggestionStates.set(listEl, state);
    const search = debounce(async (requestVersion, query, controller) => {
      if (query.length < 3) {
        closeSuggestions(state);
        setInputStatus(statusEl, `Enter at least three characters to search for a ${placeType}.`);
        return;
      }
      try {
        const results = await geocodeSearch(query, controller.signal);
        if (!state.searchState.isCurrent(requestVersion) || controller.signal.aborted) return;
        state.cachedPlaces = mergeRecommendationCache(state.cachedPlaces, results);
        renderSuggestions(state, rankRecommendations(state.cachedPlaces, query), { statusMessage: `${results.length} live location suggestions available. Use the arrow keys to review them.` });
      } catch (error) {
        if (!state.searchState.isCurrent(requestVersion) || error?.name === 'AbortError') return;
        closeSuggestions(state);
        setInputStatus(statusEl, error.message || 'Location service is unavailable. Please try again shortly.');
      } finally {
        if (state.searchState.isCurrent(requestVersion)) input.setAttribute('aria-busy', 'false');
      }
    }, DEBOUNCE_MS);

    input.addEventListener('input', () => {
      const requestVersion = state.searchState.beginInput();
      clearPlaceSelection(input);
      state.abortController?.abort();
      const query = input.value.trim();
      if (query.length < 3) {
        closeSuggestions(state);
        setInputStatus(statusEl, `Enter at least three characters to search for a ${placeType}.`);
        return;
      }

      const cachedMatches = rankRecommendations(state.cachedPlaces, query);
      if (cachedMatches.length) {
        renderSuggestions(state, cachedMatches, { statusMessage: `Showing ${cachedMatches.length} recent matches while checking live addresses.` });
      } else {
        closeSuggestions(state);
        setInputStatus(statusEl, `Looking for live ${placeType} matches…`);
      }
      const controller = new AbortController();
      state.abortController = controller;
      input.setAttribute('aria-busy', 'true');
      search(requestVersion, query, controller);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && state.results.length) {
        event.preventDefault();
        updateActiveSuggestion(state, state.activeIndex + 1);
      } else if (event.key === 'ArrowUp' && state.results.length) {
        event.preventDefault();
        updateActiveSuggestion(state, state.activeIndex - 1);
      } else if (event.key === 'Enter' && state.activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(state, state.activeIndex);
      } else if (event.key === 'Escape') {
        closeSuggestions(state);
        setInputStatus(statusEl, 'Location suggestions dismissed.');
      }
    });
  }

  initialiseSuggestionInput(inputOrigin, originSuggestions, originStatus, (c) => { originCoords = c; }, 'origin');
  initialiseSuggestionInput(inputDestination, destinationSuggestions, destinationStatus, (c) => { destinationCoords = c; }, 'destination');

  // Close suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-group')) {
      suggestionStates.forEach((state) => closeSuggestions(state));
    }
  });

  // =====================
  // REVERSE TRIP
  // =====================
  btnReverse.addEventListener('click', () => {
    const tempText = inputOrigin.value;
    inputOrigin.value = inputDestination.value;
    inputDestination.value = tempText;

    const tempCoords = originCoords;
    originCoords = destinationCoords;
    destinationCoords = tempCoords;

    const originPlaceId = inputOrigin.dataset.placeId;
    const originPlaceLabel = inputOrigin.dataset.placeLabel;
    inputOrigin.dataset.placeId = inputDestination.dataset.placeId || '';
    inputOrigin.dataset.placeLabel = inputDestination.dataset.placeLabel || '';
    inputDestination.dataset.placeId = originPlaceId || '';
    inputDestination.dataset.placeLabel = originPlaceLabel || '';
    if (!inputOrigin.dataset.placeId) inputOrigin.removeAttribute('data-place-id');
    if (!inputOrigin.dataset.placeLabel) inputOrigin.removeAttribute('data-place-label');
    if (!inputDestination.dataset.placeId) inputDestination.removeAttribute('data-place-id');
    if (!inputDestination.dataset.placeLabel) inputDestination.removeAttribute('data-place-label');
    setInputStatus(originStatus, originCoords ? `${inputOrigin.value} selected.` : 'Enter at least three characters to search for an origin.');
    setInputStatus(destinationStatus, destinationCoords ? `${inputDestination.value} selected.` : 'Enter at least three characters to search for a destination.');

    btnReverse.style.transform = 'rotate(180deg)';
    setTimeout(() => { btnReverse.style.transform = ''; }, 300);

    // Auto re-search if both fields populated
    if (originCoords && destinationCoords) {
      performSearch();
    }
  });

  // =====================
  // GPS / GEOLOCATION
  // =====================
  btnGps.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported');
      return;
    }
    btnGps.classList.add('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        originCoords = [latitude, longitude];
        inputOrigin.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        btnGps.classList.remove('loading');
        reverseGeocode(latitude, longitude).then((place) => {
          if (!place) return;
          inputOrigin.value = place.label;
          inputOrigin.dataset.placeId = place.placeId;
          inputOrigin.dataset.placeLabel = place.label;
          setInputStatus(originStatus, `${place.label} selected from your current location.`);
        });
      },
      () => {
        btnGps.classList.remove('loading');
        showToast('Could not get location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  async function reverseGeocode(lat, lng) {
    try {
      return await geocodingClient.reverse(lat, lng);
    } catch {
      return null;
    }
  }

  // =====================
  // PWD MODE TOGGLE
  // =====================
  btnPwd.addEventListener('click', () => {
    pwdMode = !pwdMode;
    btnPwd.setAttribute('aria-pressed', pwdMode.toString());
    document.body.classList.toggle('pwd-mode', pwdMode);
    // PWD auto-link: toggle ON → select PWD passenger, OFF → back to regular
    if (pwdMode) {
      selectPassenger.value = 'pwd';
      passengerType = 'pwd';
    } else {
      selectPassenger.value = 'regular';
      passengerType = 'regular';
    }
    // Re-search with PWD filter if routes exist
    if (currentRoutes && originCoords && destinationCoords) {
      performSearch();
    }
  });

  // Passenger type selector
  selectPassenger.addEventListener('change', () => {
    passengerType = selectPassenger.value;
    // If PWD passenger selected, enable PWD mode; if deselected, disable
    if (passengerType === 'pwd' && !pwdMode) {
      pwdMode = true;
      btnPwd.setAttribute('aria-pressed', 'true');
      document.body.classList.add('pwd-mode');
    } else if (passengerType !== 'pwd' && pwdMode) {
      pwdMode = false;
      btnPwd.setAttribute('aria-pressed', 'false');
      document.body.classList.remove('pwd-mode');
    }
    // Re-render results with new fare if routes exist
    if (currentRoutes) {
      renderResults(currentRoutes);
    }
  });

  // =====================
  // MOCK ROUTING ENGINE
  // =====================
  // Simulates OTP /plan response with realistic Metro Manila data.
  // Structured so real OTP can replace this function without frontend changes.

  const MODE_ICONS = {
    WALK: '🚶',
    BUS: '🚌',
    RAIL: '🚆',
    TRAM: '🚆',
    SUBWAY: '🚇',
    FERRY: '🚢',
    JEEPNEY: '🚐',
    TRICYCLE: '🛺',
  };

  const MODE_COLORS = {
    WALK: '#8b95b0',
    BUS: '#3b82f6',
    RAIL: '#ef4444',
    TRAM: '#ef4444',
    SUBWAY: '#8b5cf6',
    FERRY: '#06b6d4',
    JEEPNEY: '#f59e0b',
    TRICYCLE: '#22c55e',
  };

  // Known stations/stops with accessibility data
  const KNOWN_STOPS = {
    mrt3: [
      { name: 'North Avenue', lat: 14.6527, lng: 121.0327, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Quezon Avenue', lat: 14.6424, lng: 121.0387, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'GMA Kamuning', lat: 14.6355, lng: 121.0437, accessible: true, elevator: false, ramp: true, barriers: 'Stairs to platform' },
      { name: 'Cubao', lat: 14.6192, lng: 121.0509, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Santolan-Annapolis', lat: 14.6073, lng: 121.0564, accessible: false, elevator: false, ramp: false, barriers: 'Stairs only, narrow platform' },
      { name: 'Ortigas', lat: 14.5877, lng: 121.0569, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Shaw Boulevard', lat: 14.5812, lng: 121.0536, accessible: true, elevator: false, ramp: true, barriers: 'Stairs to street level' },
      { name: 'Boni', lat: 14.5736, lng: 121.0484, accessible: false, elevator: false, ramp: false, barriers: 'Stairs only' },
      { name: 'Guadalupe', lat: 14.5672, lng: 121.0455, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Buendia', lat: 14.5543, lng: 121.0345, accessible: true, elevator: false, ramp: true, barriers: 'Steep ramp' },
      { name: 'Ayala', lat: 14.5490, lng: 121.0278, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Magallanes', lat: 14.5418, lng: 121.0195, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Taft Avenue', lat: 14.5375, lng: 121.0014, accessible: true, elevator: true, ramp: true, barriers: null },
    ],
    lrt1: [
      { name: 'Roosevelt', lat: 14.6574, lng: 121.0214, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Balintawak', lat: 14.6566, lng: 121.0041, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Monumento', lat: 14.6542, lng: 120.9842, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: '5th Avenue', lat: 14.6447, lng: 120.9835, accessible: true, elevator: false, ramp: true, barriers: 'Narrow sidewalk approach' },
      { name: 'R. Papa', lat: 14.6363, lng: 120.9826, accessible: false, elevator: false, ramp: false, barriers: 'Stairs only, narrow entrance' },
      { name: 'Abad Santos', lat: 14.6306, lng: 120.9816, accessible: true, elevator: false, ramp: true, barriers: null },
      { name: 'Blumentritt', lat: 14.6227, lng: 120.9826, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Tayuman', lat: 14.6167, lng: 120.9825, accessible: false, elevator: false, ramp: false, barriers: 'Stairs only' },
      { name: 'Bambang', lat: 14.6114, lng: 120.9823, accessible: false, elevator: false, ramp: false, barriers: 'Stairs only' },
      { name: 'Doroteo Jose', lat: 14.6054, lng: 120.9820, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Carriedo', lat: 14.5993, lng: 120.9811, accessible: true, elevator: false, ramp: true, barriers: 'Steep ramp' },
      { name: 'Central Terminal', lat: 14.5928, lng: 120.9815, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'UN Avenue', lat: 14.5825, lng: 120.9847, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Pedro Gil', lat: 14.5763, lng: 120.9882, accessible: true, elevator: false, ramp: true, barriers: null },
      { name: 'Quirino', lat: 14.5702, lng: 120.9916, accessible: false, elevator: false, ramp: false, barriers: 'Stairs only, under renovation' },
      { name: 'Vito Cruz', lat: 14.5635, lng: 120.9949, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Gil Puyat', lat: 14.5543, lng: 120.9970, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Libertad', lat: 14.5480, lng: 120.9990, accessible: true, elevator: false, ramp: true, barriers: null },
      { name: 'EDSA', lat: 14.5389, lng: 121.0006, accessible: true, elevator: true, ramp: true, barriers: null },
      { name: 'Baclaran', lat: 14.5342, lng: 120.9985, accessible: true, elevator: true, ramp: true, barriers: null },
    ],
  };

  // Payment methods per mode
  const PAYMENT_METHODS = {
    RAIL: 'Beep card / Cash',
    BUS: 'Beep card / Cash',
    JEEPNEY: 'Cash only',
    TRICYCLE: 'Cash only',
    FERRY: 'Beep card / Cash',
    WALK: null,
  };

  function generateMockRoutes(origin, destination) {
    const distance = haversine(origin, destination);
    const baseTime = Math.round(distance * 3.5); // ~3.5 min per km for transit

    // Generate 2-3 route options
    let routes = [];

    // Route 1: Fastest (train-based)
    routes.push(generateTrainRoute(origin, destination, distance, baseTime));

    // Route 2: Bus route (fewer transfers possible)
    routes.push(generateBusRoute(origin, destination, distance, baseTime));

    // Route 3: Mixed (jeepney + train) if distance > 5km
    if (distance > 5) {
      routes.push(generateMixedRoute(origin, destination, distance, baseTime));
    }

    // PWD mode: filter routes to only use accessible stops
    if (pwdMode) {
      routes = routes.map((route) => {
        route.legs = route.legs.map((leg) => {
          if (leg.mode === 'WALK') return leg;
          // Filter intermediate stops to accessible ones
          if (leg.intermediateStops) {
            leg.intermediateStops = leg.intermediateStops.filter((stop) => {
              const info = getStopAccessibility(stop.name);
              return !info || info.accessible;
            });
          }
          return leg;
        });
        return route;
      });
    }

    return routes.sort((a, b) => a.totalDuration - b.totalDuration);
  }

  function generateTrainRoute(origin, destination, distance, baseTime) {
    const walkToStation = Math.round(3 + Math.random() * 5);
    const trainTime = Math.round(baseTime * 0.6);
    const walkFromStation = Math.round(2 + Math.random() * 4);
    const totalDuration = walkToStation + trainTime + walkFromStation;

    // Find nearest MRT-3 stations
    const nearestOriginStation = findNearestStop(origin, KNOWN_STOPS.mrt3);
    const nearestDestStation = findNearestStop(destination, KNOWN_STOPS.mrt3);

    const legs = [
      {
        mode: 'WALK',
        from: { name: 'Your Location', lat: origin[0], lng: origin[1] },
        to: { name: nearestOriginStation.name + ' Station', lat: nearestOriginStation.lat, lng: nearestOriginStation.lng },
        duration: walkToStation,
        distance: Math.round(walkToStation * 80),
        route: null,
        intermediateStops: [],
        path: [origin, [nearestOriginStation.lat, nearestOriginStation.lng]],
      },
      {
        mode: 'RAIL',
        from: { name: nearestOriginStation.name, lat: nearestOriginStation.lat, lng: nearestOriginStation.lng },
        to: { name: nearestDestStation.name, lat: nearestDestStation.lat, lng: nearestDestStation.lng },
        duration: trainTime,
        distance: Math.round(distance * 700),
        route: 'MRT-3',
        intermediateStops: getIntermediateStops(nearestOriginStation, nearestDestStation, KNOWN_STOPS.mrt3),
        path: getPathBetweenStops(nearestOriginStation, nearestDestStation, KNOWN_STOPS.mrt3),
      },
      {
        mode: 'WALK',
        from: { name: nearestDestStation.name + ' Station', lat: nearestDestStation.lat, lng: nearestDestStation.lng },
        to: { name: 'Destination', lat: destination[0], lng: destination[1] },
        duration: walkFromStation,
        distance: Math.round(walkFromStation * 80),
        route: null,
        intermediateStops: [],
        path: [[nearestDestStation.lat, nearestDestStation.lng], destination],
      },
    ];

    // Calculate per-leg fares
    const stationCount = Math.abs(
      KNOWN_STOPS.mrt3.findIndex(s => s.name === nearestOriginStation.name) -
      KNOWN_STOPS.mrt3.findIndex(s => s.name === nearestDestStation.name)
    );
    legs[1].fare = calculateFare('RAIL', distance, stationCount);
    legs[1].payment = PAYMENT_METHODS.RAIL;
    const totalFare = legs.reduce((sum, l) => sum + (l.fare || 0), 0);

    return {
      totalDuration,
      transfers: 0,
      fare: totalFare,
      legs,
    };
  }

  function generateBusRoute(origin, destination, distance, baseTime) {
    const walkTo = Math.round(2 + Math.random() * 4);
    const busTime = Math.round(baseTime * 1.3);
    const walkFrom = Math.round(2 + Math.random() * 3);
    const totalDuration = walkTo + busTime + walkFrom;

    const busRoutes = ['Bus 22 (EDSA)', 'Bus 55 (C5)', 'Bus 107 (España)', 'P2P Cubao-Makati', 'UBE Express'];
    const selectedBus = busRoutes[Math.floor(Math.random() * busRoutes.length)];

    // Generate intermediate bus stops
    const numStops = Math.max(2, Math.round(distance / 2));
    const intermediateStops = [];
    for (let i = 1; i < numStops; i++) {
      const frac = i / numStops;
      intermediateStops.push({
        name: `Stop ${i}`,
        lat: origin[0] + (destination[0] - origin[0]) * frac,
        lng: origin[1] + (destination[1] - origin[1]) * frac,
      });
    }

    const legs = [
      {
        mode: 'WALK',
        from: { name: 'Your Location', lat: origin[0], lng: origin[1] },
        to: { name: 'Bus Stop', lat: origin[0] + 0.002, lng: origin[1] + 0.001 },
        duration: walkTo,
        distance: Math.round(walkTo * 80),
        route: null,
        intermediateStops: [],
        path: [origin, [origin[0] + 0.002, origin[1] + 0.001]],
      },
      {
        mode: 'BUS',
        from: { name: 'Bus Stop', lat: origin[0] + 0.002, lng: origin[1] + 0.001 },
        to: { name: 'Bus Stop', lat: destination[0] - 0.001, lng: destination[1] - 0.001 },
        duration: busTime,
        distance: Math.round(distance * 1000),
        route: selectedBus,
        intermediateStops,
        path: [[origin[0] + 0.002, origin[1] + 0.001], ...intermediateStops.map(s => [s.lat, s.lng]), [destination[0] - 0.001, destination[1] - 0.001]],
      },
      {
        mode: 'WALK',
        from: { name: 'Bus Stop', lat: destination[0] - 0.001, lng: destination[1] - 0.001 },
        to: { name: 'Destination', lat: destination[0], lng: destination[1] },
        duration: walkFrom,
        distance: Math.round(walkFrom * 80),
        route: null,
        intermediateStops: [],
        path: [[destination[0] - 0.001, destination[1] - 0.001], destination],
      },
    ];

    legs[1].fare = calculateFare('BUS', distance);
    legs[1].payment = selectedBus.includes('P2P') ? 'Beep card only' : PAYMENT_METHODS.BUS;
    const totalFare = legs.reduce((sum, l) => sum + (l.fare || 0), 0);

    return {
      totalDuration,
      transfers: 0,
      fare: totalFare,
      legs,
    };
  }

  function generateMixedRoute(origin, destination, distance, baseTime) {
    const walkTo = Math.round(3 + Math.random() * 3);
    const jeepneyTime = Math.round(baseTime * 0.4);
    const walkTransfer = Math.round(2 + Math.random() * 3);
    const trainTime = Math.round(baseTime * 0.4);
    const walkFrom = Math.round(2 + Math.random() * 3);
    const totalDuration = walkTo + jeepneyTime + walkTransfer + trainTime + walkFrom;

    const midpoint = [(origin[0] + destination[0]) / 2, (origin[1] + destination[1]) / 2];
    const nearestStation = findNearestStop(midpoint, KNOWN_STOPS.mrt3);
    const nearestDestStation = findNearestStop(destination, KNOWN_STOPS.mrt3);

    const legs = [
      {
        mode: 'WALK',
        from: { name: 'Your Location', lat: origin[0], lng: origin[1] },
        to: { name: 'Jeepney Stop', lat: origin[0] + 0.001, lng: origin[1] + 0.002 },
        duration: walkTo,
        distance: Math.round(walkTo * 80),
        route: null,
        intermediateStops: [],
        path: [origin, [origin[0] + 0.001, origin[1] + 0.002]],
      },
      {
        mode: 'JEEPNEY',
        from: { name: 'Jeepney Stop', lat: origin[0] + 0.001, lng: origin[1] + 0.002 },
        to: { name: nearestStation.name + ' area', lat: nearestStation.lat - 0.002, lng: nearestStation.lng },
        duration: jeepneyTime,
        distance: Math.round(distance * 400),
        route: 'Jeepney (Cubao-Divisoria)',
        intermediateStops: [],
        path: [[origin[0] + 0.001, origin[1] + 0.002], [nearestStation.lat - 0.002, nearestStation.lng]],
      },
      {
        mode: 'WALK',
        from: { name: nearestStation.name + ' area', lat: nearestStation.lat - 0.002, lng: nearestStation.lng },
        to: { name: nearestStation.name + ' Station', lat: nearestStation.lat, lng: nearestStation.lng },
        duration: walkTransfer,
        distance: Math.round(walkTransfer * 80),
        route: null,
        intermediateStops: [],
        path: [[nearestStation.lat - 0.002, nearestStation.lng], [nearestStation.lat, nearestStation.lng]],
      },
      {
        mode: 'RAIL',
        from: { name: nearestStation.name, lat: nearestStation.lat, lng: nearestStation.lng },
        to: { name: nearestDestStation.name, lat: nearestDestStation.lat, lng: nearestDestStation.lng },
        duration: trainTime,
        distance: Math.round(distance * 500),
        route: 'MRT-3',
        intermediateStops: getIntermediateStops(nearestStation, nearestDestStation, KNOWN_STOPS.mrt3),
        path: getPathBetweenStops(nearestStation, nearestDestStation, KNOWN_STOPS.mrt3),
      },
      {
        mode: 'WALK',
        from: { name: nearestDestStation.name + ' Station', lat: nearestDestStation.lat, lng: nearestDestStation.lng },
        to: { name: 'Destination', lat: destination[0], lng: destination[1] },
        duration: walkFrom,
        distance: Math.round(walkFrom * 80),
        route: null,
        intermediateStops: [],
        path: [[nearestDestStation.lat, nearestDestStation.lng], destination],
      },
    ];

    const stationCount = Math.abs(
      KNOWN_STOPS.mrt3.findIndex(s => s.name === nearestStation.name) -
      KNOWN_STOPS.mrt3.findIndex(s => s.name === nearestDestStation.name)
    );
    legs[1].fare = calculateFare('JEEPNEY', distance / 2);
    legs[1].payment = PAYMENT_METHODS.JEEPNEY;
    legs[3].fare = calculateFare('RAIL', distance / 2, stationCount);
    legs[3].payment = PAYMENT_METHODS.RAIL;
    const totalFare = legs.reduce((sum, l) => sum + (l.fare || 0), 0);

    return {
      totalDuration,
      transfers: 1,
      fare: totalFare,
      legs,
    };
  }

  // --- Helpers ---
  function haversine(a, b) {
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function findNearestStop(coords, stops) {
    let nearest = stops[0];
    let minDist = Infinity;
    stops.forEach((s) => {
      const d = haversine(coords, [s.lat, s.lng]);
      if (d < minDist) { minDist = d; nearest = s; }
    });
    return nearest;
  }

  function getIntermediateStops(from, to, line) {
    const fromIdx = line.findIndex((s) => s.name === from.name);
    const toIdx = line.findIndex((s) => s.name === to.name);
    if (fromIdx === -1 || toIdx === -1) return [];
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    return line.slice(start + 1, end).map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }));
  }

  function getPathBetweenStops(from, to, line) {
    const fromIdx = line.findIndex((s) => s.name === from.name);
    const toIdx = line.findIndex((s) => s.name === to.name);
    if (fromIdx === -1 || toIdx === -1) return [[from.lat, from.lng], [to.lat, to.lng]];
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    return line.slice(start, end + 1).map((s) => [s.lat, s.lng]);
  }

  // Station-count based fare for rail (accurate MRT-3/LRT-1 fares)
  // Quezon Ave → Ayala = 9 stations = ₱28 ✓
  function calculateRailFare(stationCount) {
    if (stationCount <= 0) return 13;
    if (stationCount <= 2) return 13;
    if (stationCount <= 4) return 16;
    if (stationCount <= 6) return 20;
    if (stationCount <= 8) return 24;
    if (stationCount <= 10) return 28;
    return 35;
  }

  function calculateFare(mode, distanceKm, stationCount) {
    switch (mode) {
      case 'RAIL': return calculateRailFare(stationCount || Math.round(distanceKm * 1.2));
      case 'BUS': return Math.round(12 + distanceKm * 1.8);
      case 'JEEPNEY': return Math.round(13 + Math.max(0, distanceKm - 4) * 1.5);
      case 'TRICYCLE': return Math.round(20 + distanceKm * 5);
      case 'FERRY': return Math.round(30 + distanceKm * 2);
      default: return 0;
    }
  }

  function getDiscount() {
    return (passengerType === 'student' || passengerType === 'senior' || passengerType === 'pwd') ? 0.20 : 0;
  }

  function applyDiscount(baseFare) {
    const discount = getDiscount();
    if (discount === 0) return { base: baseFare, discount: 0, final: baseFare };
    const discountAmount = Math.round(baseFare * discount * 100) / 100;
    return { base: baseFare, discount: discountAmount, final: +(baseFare - discountAmount).toFixed(2) };
  }

  // Look up accessibility info for a stop name
  function getStopAccessibility(stopName) {
    const allStops = [...KNOWN_STOPS.mrt3, ...KNOWN_STOPS.lrt1];
    return allStops.find((s) => stopName.includes(s.name)) || null;
  }

  // =====================
  // RESULTS RENDERING
  // =====================
  function renderSourceDisclosure(source = null) {
    if (source?.demo) {
      return `<section class="results-provenance" aria-label="Demo data disclosure">
        <h3 class="results-provenance__title">Demo fixtures only</h3>
        <p class="results-provenance__notice">These sample routes are for interface testing and must not be used for travel decisions.</p>
      </section>`;
    }
    if (!source) return '';
    const fareStatus = source.fareStatus === 'AVAILABLE' ? 'Available from approved source' : 'Unavailable for this pilot';
    return `<section class="results-provenance" aria-label="Schedule data details">
      <h3 class="results-provenance__title">Schedule data details</h3>
      <dl class="results-provenance__grid">
        <dt>Dataset</dt><dd>${escapeHtml(source.dataVersion || 'Not supplied')}</dd>
        <dt>Manifest</dt><dd>${escapeHtml(source.manifestId || 'Not supplied')}</dd>
        <dt>Retrieved</dt><dd>${escapeHtml(source.retrievedAt || 'Not supplied')}</dd>
        <dt>Coverage</dt><dd>${escapeHtml(source.supportBoundary || 'Not supplied')}</dd>
        <dt>Fares</dt><dd>${fareStatus}</dd>
      </dl>
      <p class="results-provenance__notice">Schedule-only information. Real-time arrivals and fare amounts are not available in this pilot.</p>
    </section>`;
  }

  function renderAvailabilityState({ title, message, icon = 'ⓘ', source = null, focusDeparture = false }) {
    showResultsPanel();
    currentRoutes = null;
    currentRouteSource = source;
    clearMapLayers();
    resultsPanel.innerHTML = `
      <div class="results-header">
        <div>
          <p class="eyebrow">Trip status</p>
          <h2 class="results-header__title">Need to adjust your trip?</h2>
        </div>
        <button id="btn-close-results" class="results-header__close" title="Edit trip" aria-label="Edit trip">&times;</button>
      </div>
      <div class="results-empty results-empty--status" role="status" aria-live="polite">
        <span class="results-empty__icon" aria-hidden="true">${icon}</span>
        <p>${escapeHtml(title)}</p>
        <p class="results-empty__hint">${escapeHtml(message)}</p>
        <button type="button" id="btn-adjust-trip" class="results-empty__action">${focusDeparture ? 'Adjust departure time' : 'Edit trip'}</button>
      </div>
      ${renderSourceDisclosure(source)}`;
    resultsPanel.querySelector('#btn-close-results').addEventListener('click', () => returnToPlanner({ focusDeparture }));
    resultsPanel.querySelector('#btn-adjust-trip').addEventListener('click', () => returnToPlanner({ focusDeparture }));
  }

  function renderResults(routes, source = currentRouteSource) {
    showResultsPanel();
    currentRouteSource = source;
    resultsPanel.innerHTML = '';

    if (!routes || !routes.length) {
      resultsPanel.innerHTML = `
        <div class="results-header">
          <div>
            <p class="eyebrow">Trip status</p>
            <h2 class="results-header__title">No route match</h2>
          </div>
          <button id="btn-close-results" class="results-header__close" title="Edit trip" aria-label="Edit trip">&times;</button>
        </div>
        <div class="results-empty">
          <span class="results-empty__icon">🔍</span>
          <p>No scheduled route was found between these locations.</p>
          <p class="results-empty__hint">Try another departure time, different locations, or a journey within the supported area.</p>
          <button type="button" id="btn-adjust-trip" class="results-empty__action">Adjust departure time</button>
        </div>
        ${renderSourceDisclosure(source)}`;
      resultsPanel.querySelector('#btn-close-results').addEventListener('click', () => returnToPlanner({ focusDeparture: true }));
      resultsPanel.querySelector('#btn-adjust-trip').addEventListener('click', () => returnToPlanner({ focusDeparture: true }));
      return;
    }

    const header = document.createElement('div');
    header.className = 'results-header';
    const sourceLabel = source?.demo ? 'Demo fixtures — not for travel decisions' : source?.provider ? `${source.provider} ${source.apiVersion || ''} · ${source.status || 'schedule'} data` : 'Schedule data';
    header.innerHTML = `
      <div>
        <h2 class="results-header__title">${routes.length} route${routes.length > 1 ? 's' : ''} found</h2>
        <p class="results-header__source">${escapeHtml(sourceLabel)} · Departing ${escapeHtml(departureTimeLabel())}</p>
      </div>
      <div class="results-header__actions">
        <button id="btn-map-focus" class="results-header__map" type="button" title="Focus selected route on map" aria-pressed="false">Map</button>
        <button id="btn-close-results" class="results-header__close" title="Close results" aria-label="Close results">&times;</button>
      </div>
    `;
    resultsPanel.appendChild(header);

    header.querySelector('#btn-close-results').addEventListener('click', closeResultsPanel);
    header.querySelector('#btn-map-focus').addEventListener('click', (event) => {
      const isFocused = resultsPanel.classList.toggle('results-panel--map-focus');
      event.currentTarget.textContent = isFocused ? 'Routes' : 'Map';
      event.currentTarget.setAttribute('aria-pressed', String(isFocused));
      map.invalidateSize();
    });

    resultsPanel.insertAdjacentHTML('beforeend', renderSourceDisclosure(source));

    routes.forEach((route, index) => {
      const card = document.createElement('div');
      card.className = 'route-card' + (index === 0 ? ' route-card--selected' : '');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', String(index === 0));

      const transferText = route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`;
      const modeIcons = [...new Set(route.legs.filter(l => l.mode !== 'WALK').map(l => MODE_ICONS[l.mode] || '🚌'))].join(' ');
      const fareInfo = Number.isFinite(route.fare) ? applyDiscount(route.fare) : null;

      let fareHtml;
      if (!fareInfo) {
        fareHtml = `<div class="route-card__fare route-card__fare--unavailable">Fare unavailable</div>`;
      } else if (fareInfo.discount > 0) {
        fareHtml = `
          <div class="route-card__fare-detail">
            <span class="route-card__fare-original">₱${fareInfo.base}</span>
            <span class="route-card__fare-discounted">₱${fareInfo.final}</span>
            <span class="route-card__fare-badge">${passengerType} disc.</span>
          </div>`;
      } else {
        fareHtml = `<div class="route-card__fare">₱${fareInfo.base}</div>`;
      }

      card.innerHTML = `
        <div class="route-card__summary">
          <div class="route-card__modes">${modeIcons}</div>
          <div class="route-card__info">
            <span class="route-card__duration">${route.totalDuration} min</span>
            <span class="route-card__transfers">${transferText}</span>
          </div>
          ${fareHtml}
        </div>
        <div class="route-card__legs">
          ${route.legs.map((leg) => renderLeg(leg)).join('')}
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.route-card').forEach((c) => c.classList.remove('route-card--selected'));
        document.querySelectorAll('.route-card').forEach((c) => c.setAttribute('aria-pressed', 'false'));
        card.classList.add('route-card--selected');
        card.setAttribute('aria-pressed', 'true');
        drawRouteOnMap(route);
      });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });

      resultsPanel.appendChild(card);
    });

    // Auto-draw first route
    drawRouteOnMap(routes[0]);

    // Animate panel in
    resultsPanel.style.animation = 'slide-up 300ms ease-out';
  }

  function renderLeg(leg) {
    const icon = MODE_ICONS[leg.mode] || '🚌';
    const color = MODE_COLORS[leg.mode] || '#3b82f6';
    const isWalk = leg.mode === 'WALK';
    const distText = Number.isFinite(leg.distance) ? (leg.distance >= 1000 ? `${(leg.distance / 1000).toFixed(1)} km` : `${leg.distance} m`) : 'Distance unavailable';
    const modeLabel = isWalk ? 'Walk' : (leg.route || leg.mode);

    let stopsInfo = '';
    if (leg.intermediateStops && leg.intermediateStops.length > 0) {
      stopsInfo = `<span class="leg__stops">${leg.intermediateStops.length} stop${leg.intermediateStops.length > 1 ? 's' : ''}</span>`;
    }

    // Fare breakdown per leg
    let fareHtml = '';
    if (Number.isFinite(leg.fare)) {
      const fareInfo = applyDiscount(leg.fare);
      if (fareInfo.discount > 0) {
        fareHtml = `
          <div class="leg__fare-row">
            <span class="leg__fare-base">₱${fareInfo.base}</span>
            <span class="leg__fare-discount">−${(fareInfo.discount * 100 / fareInfo.base).toFixed(0)}%</span>
            <span class="leg__fare-final">₱${fareInfo.final}</span>
          </div>`;
      } else {
        fareHtml = `<div class="leg__fare-row"><span class="leg__fare-final">₱${fareInfo.base}</span></div>`;
      }
    }

    // Payment method
    let paymentHtml = '';
    if (leg.payment) {
      paymentHtml = `<span class="leg__payment">${leg.payment}</span>`;
    }

    // Demo-only accessibility fixtures. Production routes do not claim accessibility coverage yet.
    let accessHtml = '';
    if (DEMO_MODE && !isWalk) {
      const fromAccess = getStopAccessibility(leg.from.name);
      const toAccess = getStopAccessibility(leg.to.name);
      const icons = [];
      if (fromAccess) {
        if (fromAccess.accessible) icons.push(`<span class="leg__access-icon leg__access-icon--ok" title="${leg.from.name}: Wheelchair accessible">♿</span>`);
        if (fromAccess.elevator) icons.push(`<span class="leg__access-icon leg__access-icon--ok" title="${leg.from.name}: Elevator available">🛗</span>`);
        if (fromAccess.barriers) icons.push(`<span class="leg__access-icon leg__access-icon--warning" title="${leg.from.name}: ${fromAccess.barriers}">⚠️</span>`);
      }
      if (toAccess) {
        if (!toAccess.accessible) icons.push(`<span class="leg__access-icon leg__access-icon--warning" title="${leg.to.name}: Not wheelchair accessible">⚠️</span>`);
      }
      if (icons.length) {
        accessHtml = `<div class="leg__accessibility">${icons.join('')}</div>`;
      }
    }

    const realtimeHtml = !isWalk ? '<div class="leg__realtime"><span class="leg__schedule-only">📋 Schedule data</span></div>' : '';

    return `
      <div class="leg ${isWalk ? 'leg--walk' : ''}" style="--leg-color: ${color}">
        <div class="leg__timeline">
          <div class="leg__dot"></div>
          <div class="leg__line"></div>
        </div>
        <div class="leg__content">
          <div class="leg__header">
            <span class="leg__icon">${icon}</span>
            <span class="leg__mode">${escapeHtml(modeLabel)}</span>
            <span class="leg__duration">${leg.duration} min</span>
            <span class="leg__distance">${distText}</span>
          </div>
          <div class="leg__detail">
            <span class="leg__from">${escapeHtml(leg.from.name)}</span>
            <span class="leg__arrow">→</span>
            <span class="leg__to">${escapeHtml(leg.to.name)}</span>
            ${stopsInfo}
            ${paymentHtml}
          </div>
          ${fareHtml}
          ${accessHtml}
          ${realtimeHtml}
        </div>
      </div>
    `;
  }

  // =====================
  // MAP DRAWING
  // =====================
  function clearMapLayers() {
    routeLayers.forEach((layer) => map.removeLayer(layer));
    routeLayers = [];
  }

  function drawRouteOnMap(route) {
    clearMapLayers();
    const allPoints = [];

    route.legs.forEach((leg) => {
      if (!leg.path || leg.path.length < 2) return;

      const color = MODE_COLORS[leg.mode] || '#3b82f6';
      const isWalk = leg.mode === 'WALK';

      const polyline = L.polyline(leg.path, {
        color,
        weight: isWalk ? 3 : 5,
        opacity: isWalk ? 0.6 : 0.9,
        dashArray: isWalk ? '8, 8' : null,
      }).addTo(map);
      routeLayers.push(polyline);

      allPoints.push(...leg.path);
    });

    // Origin marker
    const originMarker = L.circleMarker(
      [route.legs[0].from.lat, route.legs[0].from.lng],
      { radius: 8, fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 1 }
    ).addTo(map).bindPopup('Origin');
    routeLayers.push(originMarker);

    // Destination marker
    const lastLeg = route.legs[route.legs.length - 1];
    const destMarker = L.circleMarker(
      [lastLeg.to.lat, lastLeg.to.lng],
      { radius: 8, fillColor: '#ef4444', color: '#fff', weight: 2, fillOpacity: 1 }
    ).addTo(map).bindPopup('Destination');
    routeLayers.push(destMarker);

    // Transfer markers
    route.legs.forEach((leg, i) => {
      if (i > 0 && leg.mode !== 'WALK' && route.legs[i - 1].mode !== leg.mode) {
        const marker = L.circleMarker(
          [leg.from.lat, leg.from.lng],
          { radius: 6, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1 }
        ).addTo(map);
        const transferPopup = document.createElement('span');
        transferPopup.textContent = `Transfer: ${leg.from.name}`;
        marker.bindPopup(transferPopup);
        routeLayers.push(marker);
      }
    });

    // Fit map bounds
    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }
  }

  // =====================
  // SEARCH
  // =====================
  async function performSearch() {
    const originText = inputOrigin.value.trim();
    const destText = inputDestination.value.trim();

    if (!originText || !destText) {
      showToast('Enter both origin and destination');
      return;
    }

    // Set loading state
    btnSearch.classList.add('searching');
    btnSearch.querySelector('span').textContent = 'Searching...';

    try {
      // Geocode if coords missing
      if (!originCoords) {
        const results = await geocodeSearch(originText);
        if (results.length) {
          originCoords = [results[0].latitude, results[0].longitude];
          inputOrigin.value = results[0].label;
          inputOrigin.dataset.placeId = results[0].placeId;
          inputOrigin.dataset.placeLabel = results[0].label;
          setInputStatus(originStatus, `${results[0].label} selected.`);
        } else {
          showToast('Could not find origin location');
          resetButton();
          return;
        }
      }

      if (!destinationCoords) {
        const results = await geocodeSearch(destText);
        if (results.length) {
          destinationCoords = [results[0].latitude, results[0].longitude];
          inputDestination.value = results[0].label;
          inputDestination.dataset.placeId = results[0].placeId;
          inputDestination.dataset.placeLabel = results[0].label;
          setInputStatus(destinationStatus, `${results[0].label} selected.`);
        } else {
          showToast('Could not find destination');
          resetButton();
          return;
        }
      }

      if (DEMO_MODE) {
        const routes = generateMockRoutes(originCoords, destinationCoords);
        currentRoutes = routes;
        currentRouteSource = { demo: true };
        renderResults(routes, currentRouteSource);
        return;
      }

      const result = await routingClient.plan({
        origin: { latitude: originCoords[0], longitude: originCoords[1] },
        destination: { latitude: destinationCoords[0], longitude: destinationCoords[1] },
        departureTime: departureTimeIso(),
        limit: 3,
      });
      currentRoutes = result.itineraries;
      currentRouteSource = result.source;
      if (result.availability === 'NO_ROUTE') {
        renderAvailabilityState({ title: 'No scheduled route found.', message: 'Try a different departure time or locations within the supported service area.', icon: '⌕', source: result.source, focusDeparture: true });
      } else {
        renderResults(result.itineraries, result.source);
      }
    } catch (error) {
      renderAvailabilityState({ title: 'Routing service unavailable.', message: error.message || 'This prototype cannot provide live journey guidance at the moment.', icon: '!' });
      console.error('Search error:', error);
    } finally {
      resetButton();
    }
  }

  function resetButton() {
    btnSearch.classList.remove('searching');
    btnSearch.querySelector('span').textContent = 'Show routes';
  }

  routeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch();
  });

  // =====================
  // EXPLORER — MOCK GTFS SHAPES
  // =====================
  const EXPLORER_ROUTES = {
    RAIL: [
      {
        name: 'MRT-3',
        color: '#ef4444',
        stops: KNOWN_STOPS.mrt3,
        schedule: 'Daily 5:00 AM – 10:00 PM · Every 5–7 min peak, 10 min off-peak',
      },
      {
        name: 'LRT-1',
        color: '#dc2626',
        stops: KNOWN_STOPS.lrt1,
        schedule: 'Daily 5:00 AM – 10:00 PM · Every 4–6 min peak',
      },
    ],
    BUS: [
      {
        name: 'Bus 22 (EDSA)',
        color: '#3b82f6',
        stops: [
          { name: 'Monumento', lat: 14.6542, lng: 120.9842 },
          { name: 'Balintawak', lat: 14.6520, lng: 120.9940 },
          { name: 'Quezon Ave', lat: 14.6424, lng: 121.0387 },
          { name: 'Cubao', lat: 14.6192, lng: 121.0509 },
          { name: 'Ortigas', lat: 14.5877, lng: 121.0569 },
          { name: 'Guadalupe', lat: 14.5672, lng: 121.0455 },
          { name: 'Ayala', lat: 14.5490, lng: 121.0278 },
          { name: 'Taft / Pasay', lat: 14.5375, lng: 121.0014 },
        ],
        schedule: 'Daily 4:00 AM – 11:00 PM · Every 8–15 min',
      },
      {
        name: 'Bus 55 (C5)',
        color: '#2563eb',
        stops: [
          { name: 'Fairview', lat: 14.7038, lng: 121.0540 },
          { name: 'Novaliches', lat: 14.6940, lng: 121.0450 },
          { name: 'Tandang Sora', lat: 14.6790, lng: 121.0430 },
          { name: 'Katipunan', lat: 14.6320, lng: 121.0730 },
          { name: 'Libis', lat: 14.6210, lng: 121.0710 },
          { name: 'Ortigas / C5', lat: 14.5850, lng: 121.0610 },
          { name: 'BGC', lat: 14.5505, lng: 121.0500 },
          { name: 'Market Market', lat: 14.5493, lng: 121.0556 },
        ],
        schedule: 'Daily 5:00 AM – 10:00 PM · Every 10–20 min',
      },
      {
        name: 'P2P Cubao–Makati',
        color: '#1d4ed8',
        stops: [
          { name: 'Araneta Center Cubao', lat: 14.6220, lng: 121.0530 },
          { name: 'Makati CBD', lat: 14.5547, lng: 121.0244 },
        ],
        schedule: 'Mon–Fri 6:00 AM – 9:00 PM · Every 15 min peak',
      },
      {
        name: 'UBE Express (Airport)',
        color: '#60a5fa',
        stops: [
          { name: 'NAIA Terminal 3', lat: 14.5082, lng: 121.0198 },
          { name: 'NAIA Terminal 1', lat: 14.5096, lng: 121.0120 },
          { name: 'Robinsons Ermita', lat: 14.5766, lng: 120.9850 },
        ],
        schedule: 'Daily 24 hrs · Every 20–30 min',
      },
      {
        name: 'Bus 107 (España)',
        color: '#93c5fd',
        stops: [
          { name: 'Project 8 QC', lat: 14.6700, lng: 121.0200 },
          { name: 'España Manila', lat: 14.6040, lng: 120.9890 },
          { name: 'Quiapo', lat: 14.5992, lng: 120.9840 },
          { name: 'Lawton / Manila City Hall', lat: 14.5900, lng: 120.9790 },
        ],
        schedule: 'Daily 5:30 AM – 9:00 PM · Every 12–20 min',
      },
    ],
    JEEPNEY: [
      {
        name: 'Jeepney — Cubao to Divisoria',
        color: '#f59e0b',
        stops: [
          { name: 'Cubao', lat: 14.6192, lng: 121.0509 },
          { name: 'Aurora Blvd', lat: 14.6100, lng: 121.0290 },
          { name: 'Recto', lat: 14.6040, lng: 120.9830 },
          { name: 'Divisoria', lat: 14.5990, lng: 120.9720 },
        ],
        schedule: 'Daily 5:00 AM – 10:00 PM',
      },
      {
        name: 'Jeepney — Quiapo to Baclaran',
        color: '#d97706',
        stops: [
          { name: 'Quiapo', lat: 14.5992, lng: 120.9840 },
          { name: 'Taft Ave / UN', lat: 14.5825, lng: 120.9847 },
          { name: 'Vito Cruz', lat: 14.5635, lng: 120.9949 },
          { name: 'Baclaran', lat: 14.5342, lng: 120.9985 },
        ],
        schedule: 'Daily 5:00 AM – 11:00 PM',
      },
      {
        name: 'Jeepney — Makati to BGC',
        color: '#fbbf24',
        stops: [
          { name: 'Ayala Makati', lat: 14.5508, lng: 121.0246 },
          { name: 'JP Rizal', lat: 14.5540, lng: 121.0370 },
          { name: 'BGC', lat: 14.5505, lng: 121.0500 },
        ],
        schedule: 'Daily 6:00 AM – 10:00 PM',
      },
    ],
    TRICYCLE: [
      {
        name: 'Tricycle zone — Marikina',
        color: '#22c55e',
        stops: [
          { name: 'Marikina City Hall', lat: 14.6303, lng: 121.0985 },
          { name: 'SSS Village', lat: 14.6350, lng: 121.1020 },
          { name: 'Concepcion', lat: 14.6400, lng: 121.1060 },
        ],
        schedule: 'Daily 5:00 AM – 11:00 PM · On demand',
      },
    ],
    FERRY: [
      {
        name: 'Pasig River Ferry',
        color: '#06b6d4',
        stops: [
          { name: 'Escolta (Lawton)', lat: 14.5961, lng: 120.9785 },
          { name: 'PUP / Sta. Mesa', lat: 14.5985, lng: 121.0050 },
          { name: 'Lambingan', lat: 14.5920, lng: 121.0140 },
          { name: 'Valenzuela (Hulo)', lat: 14.5790, lng: 121.0320 },
          { name: 'Guadalupe', lat: 14.5672, lng: 121.0455 },
          { name: 'Pinagbuhatan', lat: 14.5660, lng: 121.0720 },
        ],
        schedule: 'Mon–Sat 7:00 AM – 6:00 PM · Every 15–30 min',
      },
    ],
  };

  const MODE_LABELS = {
    RAIL: '🚆 Train',
    BUS: '🚌 Bus',
    JEEPNEY: '🚐 Jeepney',
    TRICYCLE: '🛺 Tricycle',
    FERRY: '🚢 Ferry',
  };

  // Layer groups per mode
  const explorerLayerGroups = {};
  Object.keys(EXPLORER_ROUTES).forEach((mode) => {
    explorerLayerGroups[mode] = L.layerGroup();
  });

  const explorerPanel = document.getElementById('explorer-panel');
  const btnExplore = document.getElementById('btn-explore');
  const btnCloseExplorer = document.getElementById('btn-close-explorer');
  const explorerRouteDetail = document.getElementById('explorer-route-detail');
  const mapLegend = document.getElementById('map-legend');
  const mapLegendItems = document.getElementById('map-legend-items');

  let explorerOpen = false;

  function toggleExplorer(show) {
    explorerOpen = typeof show === 'boolean' ? show : !explorerOpen;
    explorerPanel.hidden = !explorerOpen;
    btnExplore.classList.toggle('active', explorerOpen);
    if (explorerOpen) {
      applyExplorerFilters();
    } else {
      clearExplorerLayers();
      mapLegend.hidden = true;
      explorerRouteDetail.hidden = true;
    }
    // Leaflet needs resize nudge when panel overlays
    setTimeout(() => map.invalidateSize(), 350);
  }

  if (!DEMO_MODE) {
    btnExplore.disabled = true;
    btnExplore.title = 'Verified route explorer data is not available yet';
    btnExplore.setAttribute('aria-label', 'Route explorer is unavailable until verified data is connected');
  }

  btnExplore.addEventListener('click', () => {
    if (DEMO_MODE) toggleExplorer();
  });
  btnCloseExplorer.addEventListener('click', () => toggleExplorer(false));

  function clearExplorerLayers() {
    Object.values(explorerLayerGroups).forEach((group) => {
      group.clearLayers();
      map.removeLayer(group);
    });
  }

  function applyExplorerFilters() {
    clearExplorerLayers();
    const activeModes = [];

    explorerPanel.querySelectorAll('input[data-mode]').forEach((checkbox) => {
      const mode = checkbox.dataset.mode;
      if (checkbox.checked) {
        activeModes.push(mode);
        buildExplorerLayer(mode);
        explorerLayerGroups[mode].addTo(map);
      }
    });

    updateLegend(activeModes);
  }

  function buildExplorerLayer(mode) {
    const group = explorerLayerGroups[mode];
    group.clearLayers();

    const routes = EXPLORER_ROUTES[mode] || [];
    routes.forEach((route) => {
      if (!route.stops || route.stops.length < 2) return;

      const coords = route.stops.map((s) => [s.lat, s.lng]);
      const polyline = L.polyline(coords, {
        color: route.color,
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1.5,
      });

      polyline.on('click', () => showRouteDetail(route, mode));
      polyline.bindTooltip(route.name, {
        sticky: true,
        className: 'explorer-tooltip',
        direction: 'top',
        offset: [0, -8],
      });

      group.addLayer(polyline);

      // Stop markers
      route.stops.forEach((stop, i) => {
        const isTerminal = i === 0 || i === route.stops.length - 1;
        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: isTerminal ? 5 : 3,
          fillColor: route.color,
          color: '#fff',
          weight: isTerminal ? 2 : 1,
          fillOpacity: 1,
        });
        marker.bindTooltip(stop.name, { direction: 'top', offset: [0, -6] });
        marker.on('click', () => showRouteDetail(route, mode));
        group.addLayer(marker);
      });
    });
  }

  function showRouteDetail(route, mode) {
    explorerRouteDetail.hidden = false;
    explorerRouteDetail.innerHTML = `
      <div class="explorer-route-detail__header">
        <span class="explorer-route-detail__name">${route.name}</span>
        <span class="explorer-route-detail__mode">${MODE_LABELS[mode] || mode}</span>
      </div>
      <ul class="explorer-route-detail__stops">
        ${route.stops.map((s) => `<li class="explorer-route-detail__stop">${s.name}</li>`).join('')}
      </ul>
      <div class="explorer-route-detail__schedule">📅 ${route.schedule}</div>
      <button class="explorer-route-detail__close" id="btn-close-route-detail">Close</button>
    `;
    explorerRouteDetail.querySelector('#btn-close-route-detail').addEventListener('click', () => {
      explorerRouteDetail.hidden = true;
    });
  }

  // Listen to checkbox changes
  explorerPanel.querySelectorAll('input[data-mode]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (explorerOpen) applyExplorerFilters();
    });
  });

  // Legend
  function updateLegend(activeModes) {
    if (!activeModes.length) {
      mapLegend.hidden = true;
      return;
    }
    mapLegend.hidden = false;
    mapLegendItems.innerHTML = '';
    activeModes.forEach((mode) => {
      const routes = EXPLORER_ROUTES[mode] || [];
      const color = routes.length ? routes[0].color : MODE_COLORS[mode];
      const item = document.createElement('div');
      item.className = 'map-legend__item';
      item.innerHTML = `<span class="map-legend__color" style="background:${color}"></span>${MODE_LABELS[mode] || mode}`;
      mapLegendItems.appendChild(item);
    });
  }

  // =====================
  // REAL-TIME VEHICLE TRACKING (Mock GTFS-RT)
  // =====================
  const VEHICLE_REFRESH_MS = 20000; // 20s refresh
  let vehicleLayerGroup = L.layerGroup().addTo(map);
  let vehicleRefreshTimer = null;

  // Mock vehicle fleet — positions along known routes
  function generateMockVehicles() {
    const vehicles = [];
    const now = new Date();
    const hour = now.getHours();

    // MRT-3 trains (4-6 active)
    const mrt3Stops = KNOWN_STOPS.mrt3;
    const mrt3Count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mrt3Count; i++) {
      const stopIdx = Math.floor(Math.random() * (mrt3Stops.length - 1));
      const nextIdx = stopIdx + 1;
      const frac = Math.random();
      const delayMin = Math.random() < 0.3 ? Math.round(Math.random() * 12) : 0;
      vehicles.push({
        id: `MRT3-${i + 1}`,
        route: 'MRT-3',
        mode: 'RAIL',
        lat: mrt3Stops[stopIdx].lat + (mrt3Stops[nextIdx].lat - mrt3Stops[stopIdx].lat) * frac,
        lng: mrt3Stops[stopIdx].lng + (mrt3Stops[nextIdx].lng - mrt3Stops[stopIdx].lng) * frac,
        heading: stopIdx < mrt3Stops.length / 2 ? 'Southbound' : 'Northbound',
        nextStop: mrt3Stops[nextIdx].name,
        stopsAway: Math.ceil(Math.random() * 4),
        delayMin,
        hasRealtime: true,
      });
    }

    // LRT-1 trains (3-5 active)
    const lrt1Stops = KNOWN_STOPS.lrt1;
    const lrt1Count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < lrt1Count; i++) {
      const stopIdx = Math.floor(Math.random() * (lrt1Stops.length - 1));
      const nextIdx = stopIdx + 1;
      const frac = Math.random();
      const delayMin = Math.random() < 0.25 ? Math.round(Math.random() * 8) : 0;
      vehicles.push({
        id: `LRT1-${i + 1}`,
        route: 'LRT-1',
        mode: 'RAIL',
        lat: lrt1Stops[stopIdx].lat + (lrt1Stops[nextIdx].lat - lrt1Stops[stopIdx].lat) * frac,
        lng: lrt1Stops[stopIdx].lng + (lrt1Stops[nextIdx].lng - lrt1Stops[stopIdx].lng) * frac,
        heading: stopIdx < lrt1Stops.length / 2 ? 'Southbound' : 'Northbound',
        nextStop: lrt1Stops[nextIdx].name,
        stopsAway: Math.ceil(Math.random() * 5),
        delayMin,
        hasRealtime: true,
      });
    }

    // Buses (5-8 active, some with realtime, some without)
    const busRoutes = [
      { name: 'Bus 22 (EDSA)', corridor: 'EDSA' },
      { name: 'Bus 55 (C5)', corridor: 'C5' },
      { name: 'P2P Cubao-Makati', corridor: 'EDSA' },
      { name: 'Bus 107 (España)', corridor: null },
      { name: 'UBE Express', corridor: null },
    ];
    const busCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < busCount; i++) {
      const busRoute = busRoutes[i % busRoutes.length];
      const baseLat = 14.52 + Math.random() * 0.15;
      const baseLng = 120.97 + Math.random() * 0.1;
      const hasRealtime = Math.random() > 0.3;
      const delayMin = hasRealtime ? (Math.random() < 0.4 ? Math.round(Math.random() * 15) : 0) : 0;
      vehicles.push({
        id: `BUS-${i + 1}`,
        route: busRoute.name,
        mode: 'BUS',
        lat: baseLat,
        lng: baseLng,
        heading: Math.random() > 0.5 ? 'Northbound' : 'Southbound',
        nextStop: null,
        stopsAway: null,
        delayMin,
        hasRealtime,
        corridor: busRoute.corridor,
      });
    }

    return vehicles;
  }

  // Vehicle status from delay
  function getVehicleStatus(delayMin) {
    if (delayMin <= 2) return { label: 'On time', color: '#22c55e', badge: '🟢' };
    if (delayMin <= 7) return { label: `${delayMin} min late`, color: '#f59e0b', badge: '🟡' };
    return { label: `${delayMin} min late`, color: '#ef4444', badge: '🔴' };
  }

  // Draw vehicles on map
  function renderVehicleMarkers(vehicles) {
    vehicleLayerGroup.clearLayers();

    vehicles.forEach((v) => {
      const status = v.hasRealtime ? getVehicleStatus(v.delayMin) : null;
      const modeEmoji = MODE_ICONS[v.mode] || '🚌';

      // Create a div icon for animated vehicle
      const iconHtml = `<div class="vehicle-marker vehicle-marker--${v.mode.toLowerCase()}" title="${v.route}">${modeEmoji}</div>`;
      const divIcon = L.divIcon({
        html: iconHtml,
        className: 'vehicle-icon-wrapper',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([v.lat, v.lng], { icon: divIcon });

      // Popup content
      let popupContent = `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:140px;">
        <strong>${v.route}</strong><br>
        <span style="color:#8b95b0">${v.heading}</span><br>`;

      if (v.hasRealtime) {
        const statusInfo = getVehicleStatus(v.delayMin);
        popupContent += `<span style="color:${statusInfo.color};font-weight:600">${statusInfo.badge} ${statusInfo.label}</span><br>`;
        if (v.nextStop) {
          popupContent += `Next: ${v.nextStop}`;
          if (v.stopsAway) popupContent += ` (${v.stopsAway} stop${v.stopsAway > 1 ? 's' : ''} away)`;
          popupContent += '<br>';
        }
      } else {
        popupContent += '<span style="color:#8b95b0">📋 Schedule only</span><br>';
      }
      popupContent += '</div>';

      marker.bindPopup(popupContent);
      vehicleLayerGroup.addLayer(marker);
    });
  }

  // Start real-time refresh cycle
  function startVehicleTracking() {
    const vehicles = generateMockVehicles();
    renderVehicleMarkers(vehicles);

    // Clear previous timer
    if (vehicleRefreshTimer) clearInterval(vehicleRefreshTimer);

    vehicleRefreshTimer = setInterval(() => {
      const updated = generateMockVehicles();
      renderVehicleMarkers(updated);
    }, VEHICLE_REFRESH_MS);
  }

  // Mock vehicle tracking is demo-only and never represents live operations.
  if (DEMO_MODE) startVehicleTracking();

  // =====================
  // TRAFFIC-AWARE ETAs
  // =====================
  // Rush hour multipliers for known corridors
  const TRAFFIC_CORRIDORS = {
    EDSA: { name: 'EDSA', peakMultiplier: 1.8, offPeakMultiplier: 1.0 },
    C5: { name: 'C5', peakMultiplier: 1.6, offPeakMultiplier: 1.0 },
    Commonwealth: { name: 'Commonwealth Ave', peakMultiplier: 1.5, offPeakMultiplier: 1.0 },
    España: { name: 'España Blvd', peakMultiplier: 1.4, offPeakMultiplier: 1.0 },
    Aurora: { name: 'Aurora Blvd', peakMultiplier: 1.3, offPeakMultiplier: 1.0 },
  };

  function isPeakHour() {
    const hour = new Date().getHours();
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  }

  function getTrafficMultiplier(corridor) {
    if (!corridor) return { multiplier: 1.0, level: 'unknown' };
    const data = TRAFFIC_CORRIDORS[corridor];
    if (!data) return { multiplier: 1.0, level: 'unknown' };
    const multiplier = isPeakHour() ? data.peakMultiplier : data.offPeakMultiplier;
    let level;
    if (multiplier <= 1.1) level = 'light';
    else if (multiplier <= 1.5) level = 'moderate';
    else level = 'heavy';
    return { multiplier, level };
  }

  function getTrafficBadge(level) {
    switch (level) {
      case 'light': return '<span class="traffic-badge traffic-badge--light" title="Light traffic">🟢 Light</span>';
      case 'moderate': return '<span class="traffic-badge traffic-badge--moderate" title="Moderate traffic">🟡 Moderate</span>';
      case 'heavy': return '<span class="traffic-badge traffic-badge--heavy" title="Heavy traffic">🔴 Heavy</span>';
      default: return '';
    }
  }

  // Detect corridor from route name
  function detectCorridor(routeName) {
    if (!routeName) return null;
    const upper = routeName.toUpperCase();
    if (upper.includes('EDSA') || upper.includes('P2P')) return 'EDSA';
    if (upper.includes('C5')) return 'C5';
    if (upper.includes('COMMONWEALTH')) return 'Commonwealth';
    if (upper.includes('ESPAÑA') || upper.includes('ESPANA')) return 'España';
    if (upper.includes('AURORA')) return 'Aurora';
    return null;
  }

  // Generate predicted arrival info for a leg
  function getPredictedArrival(leg) {
    if (leg.mode === 'WALK') return null;

    // Check if this route has real-time data
    const hasRealtime = leg.mode === 'RAIL'; // trains always have RT; buses sometimes
    const isBusWithRT = leg.mode === 'BUS' && Math.random() > 0.3;

    if (hasRealtime || isBusWithRT) {
      const stopsAway = Math.ceil(Math.random() * 5) + 1;
      const etaMin = Math.round(stopsAway * 2 + Math.random() * 3);
      const delayMin = Math.random() < 0.35 ? Math.round(Math.random() * 10) : 0;
      const status = getVehicleStatus(delayMin);
      return {
        hasRealtime: true,
        stopsAway,
        etaMin,
        delayMin,
        status,
        text: `${leg.route || leg.mode} is ${stopsAway} stop${stopsAway > 1 ? 's' : ''} away (~${etaMin} min)`,
      };
    }

    return { hasRealtime: false, text: null };
  }

  // =====================
  // TOAST NOTIFICATIONS
  // =====================
  function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 12px 24px;
      border-radius: var(--border-radius-xl);
      font-size: var(--font-sm);
      font-weight: 500;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      opacity: 0;
      transition: all 300ms ease-out;
      max-width: 90vw;
      text-align: center;
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

})();
