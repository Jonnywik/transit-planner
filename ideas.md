# Sakay Mobile-first Redesign Direction

## Reference cues

The supplied examples and screenshot inform the interaction model rather than a visual copy: an always-present map canvas, a thumb-reachable bottom sheet, compact route information, confident floating location controls, and route cards that reveal timing at a glance. The redesign remains original to Sakay and is adapted for Metro Manila transit.

## Three stylistic approaches

### 1. Bayline Field Guide

**Very Brief Intro:** A warm, editorial transit companion with white card surfaces, deep marine blue framing, and sharp red route accents. It feels like a well-made local guide rather than a generic mapping tool.

**Probability:** 0.047

### 2. Signal Ribbon

**Very Brief Intro:** A clean cartographic system where route lines, status pills, and bottom-sheet handles create a continuous movement language. Strong blue and red take turns as functional navigation signals against quiet white space.

**Probability:** 0.083

### 3. Metro Postcard

**Very Brief Intro:** A tactile, high-contrast travel journal with layered destination snapshots and handwritten-feeling cues. It emphasizes discovery over operational utility.

**Probability:** 0.021

## Chosen approach: Signal Ribbon

### Design Movement

**Contemporary cartographic utility** with a mobile bottom-sheet idiom: restrained, map-led, and operationally clear. It blends the directness of live navigation apps with the compositional confidence of an editorial field guide.

### Core Principles

1. **The map is context, not decoration.** It remains visible behind all planning states and is never reduced to an afterthought.
2. **The next decision earns the strongest contrast.** Location entry, route selection, and a current trip state dominate their moment; supporting controls recede.
3. **One-handed mobility comes first.** Primary actions sit in the lower half of the viewport; tap targets remain generous and familiar.
4. **Transit information is progressive.** A compact route summary scans first, while legs, stops, and metadata expand only when requested.

### Color Philosophy

Use a Filipino color story without flags, seals, stars, or literal national symbols. **Sakay Blue** is the calm system anchor for navigation and map controls; **Route Red** identifies decisive actions, active route paths, and urgency; **Paper White** gives information breathing room; a restrained **Ink Navy** supports text and map geometry. The colors express reliability, motion, and local pride rather than ornament.

### Layout Paradigm

Build a **map canvas plus adaptive bottom dock**. On phones, the dock becomes the planning sheet and expands upward for results. On larger screens, it becomes a floating left command card with a fixed, narrow results rail, leaving the map as the dominant field. Avoid a centered dashboard and avoid a symmetrical card grid.

### Signature Elements

1. **Signal ribbon:** a slim blue-to-red journey line running through origin, destination, and selected route states.
2. **Docked paper sheet:** an off-white, slightly lifted bottom panel with a blue grab handle and a precise red action button.
3. **Route stamps:** compact outlined mode labels and time chips that look like transit annotations, not generic badges.

### Interaction Philosophy

Interactions should feel like moving a map, not operating a form. The planner sheet grows when focus enters a location field, recedes after a route is chosen, and offers immediate reversible actions. Keyboard input is instant; sheet movement is deliberate and brief. Error or unavailable states explain what is happening without turning the map into a dead end.

### Animation

Use 160–240 ms `transform` and `opacity` transitions only. The search sheet rises with a custom ease-out; route cards cascade with 40 ms offsets; active route lines fade and slide into view. Buttons compress to `scale(0.97)` on press. Reduce all nonessential motion when `prefers-reduced-motion` is set.

### Typography System

Use **Manrope** for human, compact interface copy and **DM Mono** for route numbers, time, and stop-code metadata. Route times use the heaviest Manrope weight; section labels use compact uppercase Manrope with generous tracking; metadata uses DM Mono at a small but high-contrast size. Do not use Inter.

### Brand Essence

**Sakay makes Metro Manila transit feel legible, local, and ready for the next move.**

**Personality:** steady, alert, generous.

### Brand Voice

Headlines are concise and directional; CTAs are action-led; microcopy is calm and specific.

> “Where are you heading?”

> “Show the quickest way.”

### Wordmark & Logo

Create an original symbol: two offset, rounded route strokes meeting at a forward-pointing station node, suggesting a turn, a transit connection, and forward motion. The mark is **symbol-only** in the generated asset; the Sakay wordmark is rendered separately with the chosen typography. Avoid flag shapes, stars, seals, and transport pictograms.

### Signature Brand Color

**Sakay Blue — `#123F73`**

## Style Decisions

- Mobile uses the map as a full-bleed stage with a docked planning sheet; desktop adapts the same components rather than becoming a dashboard.
- Red is reserved for the active route, the primary route-planning action, and moments that require a decision.
- All user or upstream-provided strings must remain text-rendered or escaped; visual polish never overrides safe content handling.
- The reference review informs the map-led sheet rhythm and scan-friendly route cards; Sakay does not reproduce another product’s screens or visual identity.
- Mobile visual validation confirms that the full-bleed map, floating controls, and bottom dock remain legible at a 390 × 844 viewport. The generated mark is retained as the logo asset and favicon; the header also includes a geometric Signal Ribbon fallback so brand recognition is not delayed by an external asset request.
- Desktop validation confirms the adaptation preserves a large, legible map field while converting the mobile dock into a compact left command card. The map caption is offset beyond the command card to avoid competing for the same space.
- The live unavailable-route review confirmed that results must fully replace the planning dock. Status messages use an explicit stacked layout with controlled line height so operational feedback remains easy to scan at phone scale.
