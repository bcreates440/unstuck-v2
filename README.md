# Unstuck — v2 (context-aware)

A constraint-based behavioral recommender that converts low-motivation states into
**one** immediate, real-world action — with minimal executive function required to use.

Not a list. Not a feed. Not a planner. It's a decision-compression engine: you give it
a few lightweight constraints (or nothing at all), it outputs a single, specific,
startable-in-minutes action.

**v2 adds real-world context** on top of v1 — kept fully optional and zero-config:

- **Real daylight** — daypart (day / evening / night) and the "needs daylight"
  gate now use actual **sunrise/sunset** for your location, not fixed clock hours.
- **Weather awareness** — current conditions from [Open-Meteo](https://open-meteo.com),
  which needs **no API key**. In hostile weather (rain, snow, cold, heat, storms) the
  engine nudges you indoors; in severe weather it drops pure-outdoor activities entirely;
  in nice weather it nudges you out. Rain/snow/clear-sky also unlock timely bonus
  activities (e.g. *"It's raining — walk in it on purpose for 10 minutes."*).
- **Location radius** — a "How far will you go" control (stay here / short walk /
  short drive / anywhere) filters activities by travel effort.
- **Season awareness** — daypart aside, the engine derives the meteorological season from
  the date (flipped for the southern hemisphere when location is known). 50 seasonal
  activities are gated to the right season, and the truly condition-dependent ones
  (snowman, cool-off-in-water, sweater walk, storm-watch, fog walk…) *also* gate on live
  weather and temperature (`weatherOnly`, `minTemp`/`maxTemp`) so an impossible suggestion
  never surfaces.
- **Real nearby places** — via the [Overpass API](https://overpass-api.de) (OpenStreetMap,
  also **no key**), venue activities name actual cafés, groceries, libraries, parks, and
  water near you with walking times: *"Head to Maud's Café (about 6 min away) — order the
  cheapest thing."* Falls back to generic phrasing when nothing's found or location is off.
- **Settings** — an icon-only cog (top-right) opens toggle switches for: use location,
  weather-aware suggestions, suggest nearby places, nudge me outdoors — plus a **Units**
  group with segmented controls for temperature (°C / °F) and measurements
  (metric / imperial), and clear-data. Location-dependent toggles disable themselves when
  location is off; units default to the world standard (°C, metric).
- **Country flavour** — 50 activities specific to the most likely user countries outside
  the US (UK, Canada, Australia, India, Germany), gated by the country detected from the
  timezone so they only ever appear where they fit (a Spaziergang in Germany, a chai-stall
  break in India, a beach dip in an Australian summer, etc.).
- **Quality-of-life** — remembers your last constraints for a one-tap reopen; caches the
  last weather + places reading (30 min) so a reopened app is instantly context-aware.

Everything degrades gracefully: deny location (or be offline) and it falls back to
time-of-day + your constraints, exactly like v1.

## Run it

Build-free static PWA — no Node, no build step. The only network call is the optional,
key-less weather lookup.

- **Quick look:** preview config `unstuck-v2` in `../.claude/launch.json` (port 4179).
- **Manually:** `powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 4179`,
  then open `http://localhost:4179/`. Tap "Use location & weather" to enable context.
- **On your phone:** serve on your network and "Add to Home Screen". Location + weather
  need HTTPS (or localhost) — geolocation is blocked on plain-HTTP origins by browsers.

## Tests

The engine's pure functions (daypart, season, region, the feasibility filters, and the
scoring weights) have a zero-dependency test suite. It needs only Node — no `npm install`,
no framework:

```
node engine.test.js
```

72 assertions covering hemisphere season-flips, timezone→country mapping, weather
triggers, the hard feasibility gates, and that each named scoring weight (`W.*` in
`engine.js`) contributes exactly the documented amount.

## How it works

```
constraints + ambient context (time · daylight · weather · reach)
   -> ONE action -> limited reroll -> feedback -> repeat
```

- `settings.js` — **NEW.** On-device settings store (the source of truth for which
  optional features are on).
- `context.js` — **NEW.** Optional geolocation + Open-Meteo weather + sunrise/sunset +
  Overpass nearby-places, cached on-device, governed by settings, graceful fallback.
- `activities.js` — constraint-tagged activity **templates** (never shown as a list).
  v2 fields: `reach`, `needsLight`, `weatherOnly`. Venue templates call `ctx.nearby(kinds)`
  to drop in real place names.
- `engine.js` — filter (constraints + reach + daylight + weather) -> score (vibe,
  "stuck" descriptor, weather fit, outdoor-nudge, novelty, feedback) -> weighted pick of one.
  Exposes `ctx.nearby()` for place lookups.
- `app.js` — UI loop, context status line, settings panel, on-device feedback store.

## Look & feel

Playful but calm. A warm, cozy palette — friendly coral as the single hero colour (the
"go do it" CTA) plus one teal accent for selected/active states — on a soft cream
background, with a **cosy dark variant** via `prefers-color-scheme` so night use never
blasts white. Generous rounding, soft warm shadows, a rounded display type stack (no web
fonts — fully offline; rounded on Apple platforms, clean system sans elsewhere), and gentle
tactile motion (springy press, a pop-in on the suggestion). Still one-thing-at-a-time, lots
of whitespace, nothing busy. All theming lives in `styles.css` `:root` tokens (+ the dark
`@media` block).

## Versioning

`../unstuck/` is **v1** (local-only, preserved untouched). This folder is **v2**.

## Roadmap / still open

- Smarter feedback: resistance/engagement pattern detection, adaptive novelty
  thresholds. Events are already logged in `localStorage` under `unstuck.v1` (with the
  weather at time of suggestion).
- Let real place distance relax the `reach` gate (e.g. surface a "drive" venue at the
  "walk" setting when it's actually a 6-min walk away).
- Keep growing the activity rule set — easiest lever, just add entries to `activities.js`
  (currently **296 activities**: 50 seasonal + 50 country-specific; outdoor is the largest
  bucket).
