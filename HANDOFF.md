
# Unstuck — Project Handoff

A complete handoff for the **Unstuck** app. If you're picking this up cold, read this
top to bottom once, then keep it open as a map. Last updated: 2026-06-10.

---

## 1. What this is

**Unstuck** is a constraint-based behavioral recommender — an *anti-doomscroll* tool. The
user is stuck/low-energy/scrolling; the app gives them **exactly one** immediate,
real-world, low-effort action to do right now (e.g. *"Walk 12 minutes and photograph 5
things that feel out of place."*).

It is a **decision-compression engine**, deliberately NOT a browsing/discovery feed:

- One suggestion per request — never a list.
- A **limited** reroll (3) to prevent indecision spirals.
- Minimal input: optionally a few constraint chips, otherwise just one big button.
- Success metric = how fast it converts intent-less-ness into a real action, **not**
  time-on-app.

### Core philosophy (do not violate)
- **One action, never a list.** The activity set is data the user never browses.
- **Lowest-effort path is one tap** ("Give me something to do"). Tuning is optional and
  collapsed.
- **Reroll is capped**, not infinite.
- **Calm and uncluttered**, even though the new look is playful.
- **No accounts, no backend, no API keys, offline-first.** Everything is on-device.

---

## 2. Status at handoff

- **Working, runnable, feature-complete for v2.** No known functional bugs.
- **296 activities** (246 general + 50 country-specific; of those, 50 are seasonal).
- Stack: **vanilla HTML/CSS/JS PWA**, no framework, no build step, no dependencies.
- External services (both **keyless**, both optional): Open-Meteo (weather) and Overpass /
  OpenStreetMap (nearby places).
- Service-worker cache version: **`unstuck-v7`** (in `sw.js`).
- There is an older **v1** in the sibling `../unstuck/` folder (basic version, kept as a
  backup). **All current work is in `unstuck-v2/`.**

---

## 3. How to run it

It's a static site — just needs to be served over `localhost` (geolocation/weather require
a secure context, i.e. `localhost` or HTTPS; opening `index.html` via `file://` works but
location features won't).

**Option A — bundled PowerShell server (zero install):**
```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 4179
# then open http://localhost:4179/
```

**Option B — Claude Code preview:** use the launch config named **`unstuck-v2`**
(`.claude/launch.json`, port **4179**).
> ⚠️ Do NOT use the `unstuck` config (port 4178) — that serves the old **v1** folder.
> A third config `focus-app` (port 8137) is an **unrelated** app ("FocusLock").

**Install to phone:** serve on your LAN over HTTPS (or use a tunnel) and "Add to Home
Screen." It installs standalone and works offline.

---

## 4. File map

```
unstuck-v2/
├── index.html      App shell: home view, result view, settings panel. Loads scripts in order.
├── styles.css      ALL styling + theme tokens (:root light + dark @media). No inline styles.
├── util.js         U: tiny random/format helpers (int, pick, sample, dir, shuffle).
├── settings.js     Settings: on-device prefs store (source of truth for toggles/units).
├── units.js        Units: °C/°F + metric/imperial formatting (display-only).
├── context.js      Context: optional geolocation + weather + sun + nearby places, cached.
├── activities.js   ACTIVITIES[]: the 296 constraint-tagged activity templates + dur() helper.
├── engine.js       Engine: the decision pipeline (filter → score → pick one).
├── app.js          UI wiring, view switching, settings panel, Store (feedback), boot.
├── manifest.json   PWA manifest (name, colors, icon).
├── sw.js           Service worker: offline cache. BUMP the version when assets change.
├── icons/icon.svg  App icon (coral compass mark).
├── serve.ps1       Tiny zero-install static server (PowerShell).
├── README.md       Short project notes.
└── HANDOFF.md      This file.
```

**Script load order (matters — globals are plain `const`s on window):**
`util → settings → units → context → activities → engine → app`

---

## 5. The interaction loop

```
constraints (+ inferred ambient context)
   → Engine.generate() picks ONE activity
   → render its text() → show on result view
   → reroll (max 3, excludes already-shown) | give feedback
   → back to home → repeat
```

- Home: big CTA + collapsible "Tune it" (energy / time / budget / solo-social / vibe /
  "I'm stuck doing ___"). Defaults are permissive so the one-tap path always works.
- Result: the single action, a feedback row (👍 / 😐 / ✕), reroll counter, "Done for now".
- Settings (icon-only cog, top-right): location/weather/nearby/outdoor toggles + Units
  segmented controls + Clear data.

---

## 6. Data model

### 6.1 Activity schema (`activities.js`)
Each entry is a constraint-tagged **template**. `text(ctx)` returns the final string and may
randomize specifics for novelty.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | unique kebab/prefixed id |
| `vibe` | array | subset of `calm` `creative` `adventurous` `productive` (**only these 4**) |
| `energy` | array | subset of `low` `medium` `high` |
| `social` | enum | `solo` \| `social` \| `either` |
| `budget` | enum | `free` \| `low` |
| `env` | enum | `indoor` \| `outdoor` \| `either` |
| `reach` | enum | `here` \| `walk` \| `drive` (travel effort) |
| `minMinutes` | number | floor on time-available |
| `daypart` | array | subset of `day` `evening` `night` |
| `needsOpen` | bool? | requires venues open (08:00–21:00) |
| `needsLight` | bool? | requires real daylight |
| `weatherOnly` | array? | only shows in this weather: `wet` `snow` `clear` `fog` `hot` `cold` `thunder` |
| `seasons` | array? | only this season: `spring` `summer` `autumn` `winter` |
| `minTemp` / `maxTemp` | number? | °C gate, **only enforced when a live reading exists** |
| `regions` | array? | country gate: `UK` `CA` `AU` `IN` `DE` (from timezone) |
| `tags` | array | free-text, matched against the "I'm stuck doing ___" descriptor |
| `text` | `(ctx)=>string` | the rendered instruction |

> ⚠️ **`social` is its own field — never put `social` inside `vibe`.** `vibe` is only the
> four values above.

`dur(ctx, lo, hi)` (top of `activities.js`) picks a sensible duration for open-ended
movement activities, respecting the user's available time.

### 6.2 Settings (`settings.js`, localStorage key `unstuck.settings`)
```js
{ useLocation:false, useWeather:true, useNearby:true,
  nudgeOutdoors:false, tempUnit:'C', units:'metric' }
```
`useWeather`/`useNearby` only act when `useLocation` is on (sub-toggles disable in the UI
when location is off). Defaults are world-standard (°C, metric) — US users flip them.

### 6.3 Context state (`context.js`, localStorage key `unstuck.ctxCache`, 30-min TTL)
```js
{ status, coords:{lat,lon}, weather, sun:{sunrise,sunset}, places:[], tz, fetchedAt }
// status: 'idle' | 'off' | 'locating' | 'ready' | 'denied' | 'error'
```
`weather` is the classified object from `Context.classify()`:
`{ code, temp, label, wet, snow, thunder, fog, cold, hot, windy, severe, outdoorHostile, isDay }`.
`places` are `{ name, kinds:[], dist(m), minutes }`, named OSM POIs sorted by distance.

### 6.4 Feedback store (`app.js`, localStorage key `unstuck.v1`)
```js
{ stats: { [activityId]: {shown, liked, disliked, completed, lastTs} },
  log: [ {ts, id, kind, constraints, weather} ... ] }  // log capped at 300
```

---

## 7. The engine (`engine.js`)

`Engine.generate(constraints, stats, excludeIds, now, ambient)` →
`{ activity, text }` (or `null` if nothing fits).

**Pipeline:**
1. **`buildContext(constraints, now, ambient)`** → derives `ctx`:
   `minutes`, `hour`, `daypart` (real sunrise/sunset if known, else clock), `venuesOpen`,
   `daylight`, `weather`, `season` (hemisphere-aware via lat), `region` (from `tz`),
   `reachMax`, `prefs`, `places`, and helpers `dist(m)`, `len(cm)`, `nearby(kinds)`.
2. **`feasible(a, c, ctx)`** — hard filters (ALL must pass): time, energy, social, budget,
   daypart, needsOpen, reach, needsLight, **season**, **min/maxTemp** (only if temp known),
   **weatherOnly** trigger, **region** (strict — needs a known matching country), and a
   severe-weather drop for pure-outdoor activities.
3. **`score(a, c, ctx, stats)`** — soft weighting: vibe match (+3), "stuck" tag match (+2.5),
   weather steering (outdoor −2 if hostile / +0.6 if nice; indoor +1 if hostile), in-season
   (+0.8), in-region (+0.8), outdoor-nudge pref (±), novelty (+1.5 if never shown), feedback
   (liked +, disliked −, over-shown −). Floor 0.05.
4. **Weighted-random pick** among feasible (reroll excludes already-shown; if exhausted,
   relax the exclusion).

**Key helpers:**
- `Engine.season(now, lat)` — meteorological season, flipped for southern hemisphere when
  `lat < 0` (so AU summer = Dec–Feb).
- `Engine.region(tz)` — maps an IANA timezone to `UK|CA|AU|IN|DE` or `null`. Region-gated
  activities require a **known matching** region, so they never appear elsewhere (US or
  no-location → `null` → hidden).
- `Engine.weatherTriggerMet(a, w)` — handles `wet/snow/clear/fog/hot/cold/thunder`.

**Condition-awareness guarantee:** impossible suggestions are structurally blocked. A
snowman needs winter **and** live snow; "cool off in the water" needs summer **and** ≥24 °C;
a sweater walk needs autumn **and** ≤16 °C; storm/fog activities need that actual weather.

---

## 8. Feature notes

- **Context (`context.js`)** — opt-in via Settings. On enable: geolocation →
  Open-Meteo (weather + sunrise/sunset + IANA `tz`) → Overpass (named nearby POIs). All
  cached 30 min; every step degrades gracefully (deny/offline → time-of-day only).
- **Units (`units.js`)** — `Units.temp(°C)`, `Units.distance(m)`, `Units.smallLen(cm)`.
  Display-only; all data stays metric internally. Exposed to activity text via
  `ctx.dist()` / `ctx.len()`. The pill temperature and any distance phrasing respect them.
- **Nearby places** — venue activities call `ctx.nearby(['cafe', ...])` to drop in real
  names + walking times, with a generic fallback when none/disabled.
- **Seasonal (50) & country-specific (50)** — see schema gates above.

---

## 9. Look & feel (`styles.css`)

Playful but calm. Warm cream **light** theme + cozy **dark** variant via
`@media (prefers-color-scheme: dark)`. **One hero colour** = coral (`--primary`, the CTA &
reroll), **one accent** = teal (`--accent`, selected/active states). Soft rounding, warm
shadows, springy press + a `pop-in` on the suggestion. Rounded **system** font stack
(`--font-display`) — **deliberately no web fonts** (external Google Fonts caused
render-blocking/offline hangs; staying zero-network is intentional). All theming is in
`:root` tokens plus the dark `@media` block. `prefers-reduced-motion` is respected.

---

## 10. Gotchas / things that will bite you

- **Service-worker caching.** After editing any asset, **bump `CACHE` in `sw.js`**
  (`unstuck-vN`). To see changes during dev, unregister the SW + clear caches, then hard
  reload. (In the console: `navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister()))`
  then `caches.keys().then(k=>k.forEach(c=>caches.delete(c)))` then reload.)
- **Geolocation needs HTTPS or localhost.** Won't work over a bare LAN-IP `http://` URL.
- **Preview server identity.** Always serve **`unstuck-v2`** (4179). The `unstuck` config
  (4178) is v1; a stale preview serverId can silently fall back to the unrelated FocusLock
  app. The preview server also tends to stop between sessions — restart it and grab the new
  serverId.
- **`vibe` ≠ `social`.** Keep `social` out of `vibe` arrays (only the 4 vibe values).
- **Weather triggers are "current conditions."** `snow`/`thunder`/`fog` fire on live
  weather, so e.g. snow-on-ground-but-not-falling won't trigger snow activities — a
  deliberate "under-suggest rather than suggest the impossible" trade-off.

---

## 11. How to extend

- **Add activities** (easiest, highest value): append objects to `ACTIVITIES[]` in
  `activities.js`. Match the schema; reuse `U.*`, `dur(ctx,…)`, `ctx.nearby()`, `ctx.dist()`.
  Use `seasons`/`weatherOnly`/`minTemp`/`maxTemp`/`regions` to gate condition-specific ones.
  Then **bump `sw.js` cache**.
- **Add a country:** add the timezone→code mapping in `Engine.region()`, then add
  activities with `regions: ['XX']`.
- **Add a weather trigger:** add a flag in `Context.classify()` and a branch in
  `Engine.weatherTriggerMet()`.
- **Re-theme:** edit `:root` tokens (and the dark `@media`) in `styles.css`. Keep it to one
  hero + one accent to stay uncluttered.

---

## 12. Verification status & known caveats

- Engine logic, gating (season/weather/temp/region), unit conversion, and activity-set
  integrity (296 total, 0 duplicate ids, 0 invalid enums, every `text()` renders) were all
  verified by running them in the live page via the preview tools.
- **Visual screenshots could not be captured in the last session** — the preview's
  renderer was frozen (animation frames stalled, so screenshots and rAF/transition-based
  reads timed out; this is an environment issue, not the app). The restyle was instead
  verified via `getComputedStyle` and the live CSSOM (tokens, radii, gradients, the
  default-selected `.is-on` teal fill, etc.). If you need pixel confirmation, open it in a
  normal browser.

---

## 13. Roadmap / open items

- Smarter feedback: detect resistance/engagement patterns; adaptive novelty thresholds
  (data is already logged in `unstuck.v1`).
- Let real place distance relax the `reach` gate (surface a "drive" venue at the "walk"
  setting when it's actually a few minutes away).
- "Recently snowed / snow on ground" heuristic (Open-Meteo recent precipitation) so winter
  snow activities surface more often.
- Keep growing the activity set (per-category and per-country).
- Optional: promote `unstuck-v2` to be the canonical folder / retire v1.

---

## 14. Quick reference

| Thing | Value |
|-------|-------|
| Current folder | `unstuck-v2/` |
| Preview config / port | `unstuck-v2` / 4179 |
| SW cache version | `unstuck-v7` |
| Activity count | 296 (50 seasonal, 50 country-specific) |
| Reroll limit | 3 (`REROLL_LIMIT` in `app.js`) |
| localStorage keys | `unstuck.settings` (prefs), `unstuck.ctxCache` (location/weather/places), `unstuck.v1` (feedback) |
| Weather API | Open-Meteo (no key) |
| Places API | Overpass / OpenStreetMap (no key) |
| Countries supported | UK, CA, AU, IN, DE |
| Hero / accent colours | coral `--primary` / teal `--accent` |
