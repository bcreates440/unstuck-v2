# Universal AI Project Handoff — Unstuck v2

You are taking over an existing project from another AI assistant. Treat this handoff as
the complete source of truth. Do not assume access to previous conversations. If
information is missing, identify the gaps and ask targeted questions before proceeding.

> There is also a deeper engineering-focused doc, [HANDOFF.md](HANDOFF.md), covering the
> data model, engine pipeline, and gotchas in detail. This file is the higher-altitude
> project handoff; read HANDOFF.md when you need the mechanics. **Note:** HANDOFF.md
> predates the budget-tier / reach / skip-flow changes below — trust THIS file where they
> disagree, and update HANDOFF.md when you next touch the engine internals.

---

## Project Overview

**Project Name:** Unstuck (v2)

**Primary Goal:** Convert a low-motivation / doomscrolling state into **exactly one**
immediate, real-world, low-effort action — as fast as possible, with minimal executive
function required from the user. Success = how quickly it turns "I don't know what to do"
into a real action the user actually does. Explicitly **not** time-on-app.

**Project Type:** Software — a client-side, offline-first Progressive Web App (PWA).

**Current Stage:** Maintenance + an **active feature-expansion** pass. The app is
feature-complete, runnable, deployed, and has no known functional bugs. A large
activity-set expansion (toward 500 new activities) is **in progress**: batch 1 (43
activities) is shipped and **awaiting the owner's tone review** before scaling up.

---

## Background Context

Unstuck is a **decision-compression engine** and a deliberate *anti-doomscroll* tool. When
someone is stuck, low-energy, or scrolling, the app gives them one specific, startable
instruction (e.g. *"Walk 12 minutes and photograph 5 things that feel out of place."*)
rather than a feed, a list, or a planner. It deliberately resists the patterns that make
apps sticky: there is no browsing, no infinite list, and rerolls are capped at 3 to prevent
indecision spirals.

v1 lives in the sibling `../unstuck/` folder (basic, local-only, preserved untouched). All
current work is **v2** in this folder, which adds optional real-world context (location,
weather, real sunrise/sunset, nearby places), seasonal/country-specific activities, and a
restyle.

It was pushed to GitHub and deployed to GitHub Pages, then security-hardened, given a test
suite, extended with an activity-history reflection feature, and — most recently — given
**three-tier budgets, two new "reach" options, a no-escape skip flow, fuller preference
persistence, and the first batch of a planned activity expansion.** Solo effort by the
owner (GitHub `bcreates440`), built with AI assistance.

---

## Target Audience / Users

- Individuals who get stuck in low-motivation, overstimulated, or doomscrolling states and
  want a frictionless nudge into a single concrete action.
- Privacy-conscious users: there are **no accounts, no backend, no API keys**, and nothing
  personal leaves the device except anonymous weather/map lookups the user opts into.
- World-wide, but with first-class flavour for US plus UK, Canada, Australia, India, and
  Germany (country-specific activities gated by timezone).

---

## Objectives

### Primary Objectives
1. Always deliver **one** action, never a list — the lowest-effort path is a single tap.
2. Keep it calm, uncluttered, offline-first, and fully on-device (privacy by architecture).
3. Make suggestions feel *condition-aware* — never suggest the impossible (no snowman in
   July, no "cool off in the water" on a cold day).

### Secondary Objectives
1. Help users reflect on their own follow-through (the activity-history feature).
2. **Grow the activity set toward ~500 new entries** without adding complexity or
   dependencies, keeping the existing category proportions and the established voice.

---

## Decisions Already Made

Treat these as established unless a compelling reason exists to revisit them:

1. **Vanilla HTML/CSS/JS PWA — no framework, no build step, no dependencies, no bundler.**
   Scripts are plain globals loaded in order on `window`.
2. **No accounts, no backend, no database, no API keys.** All state is `localStorage`.
   External calls (weather, places) are keyless and strictly optional.
3. **One suggestion per request; reroll capped at 3.** Core philosophy, not a knob.
4. **Two external services, both keyless and opt-in:** Open-Meteo (weather + sun) and
   Overpass/OpenStreetMap (nearby places).
5. **`social` is its own activity field — never inside `vibe`.** `vibe` is **only** the four
   values: calm / creative / adventurous / productive. A proposed fifth "basically
   exercise" vibe was **explicitly rejected by the owner** — do not add it.
6. **No web fonts** — a rounded *system* font stack only. Staying zero-network is intentional.
7. **One hero colour (coral) + one accent (teal).** Warm cream light theme + cosy dark.
8. **"Done for now" was deliberately removed** so leaving a real suggestion requires a
   tracked feedback tap — the intended self-reflection nudge.
9. **Settings apply live**, plus an explicit "Save settings" button + confirmation toast.
10. **Deployed publicly** to GitHub Pages from `master` (`/` root). The repo is public.
11. **Budget is a three-tier ceiling: `free` < `$` < `$$`** (+ a `flexible` filter that
    accepts all). **No `$$$` tier** — the owner capped it at `$$` to stay on the
    free/low-friction mission. Legacy `low` is an alias for `$`. `$$` is kept deliberately
    modest ("a small outing, ~$10–30").
12. **"How far will you go" now has six options:** stay here / **indoor** / short walk /
    **long walk** / short drive / anywhere. "indoor" = indoor activities with no travel;
    "long walk" = a `walk` activity whose `minMinutes >= 15`.
13. **"Not this time" serves another action instead of returning home**, but it draws from
    the **same capped 3-reroll budget** (owner's explicit choice — not an unlimited loop).
    Each skip is still tracked. Once the cap is spent, it returns home.
14. **Preferences persist fully:** every Tune chip *and* the free-text "I'm stuck doing…"
    note now save on each change and restore on launch. (This reverses the earlier decision
    to not persist the stuck note — owner asked for "remember selections in every respect.")
15. **The 500-activity expansion is phased:** author a batch, owner reviews tone, then
    continue. Keep existing vibe/env/reach proportions roughly intact across batches.

---

## Constraints

### Technical Constraints
- Must remain a build-free static site (servable from any static host / `file://` with
  graceful degradation; geolocation/weather need `localhost` or HTTPS).
- No external runtime dependencies; no inline scripts (CSP enforces `script-src 'self'`).
- `connect-src` is allow-listed to only `api.open-meteo.com` and `overpass-api.de`. Any new
  network endpoint must be added to the CSP in `index.html` or it will be blocked.
- Service-worker caching: **bump `CACHE` in `sw.js`** (`unstuck-vN`) on *every* asset change
  or users keep getting stale files. Currently **`unstuck-v9`**.

### Budget Constraints
- $0. Everything used is free/keyless (GitHub Pages, Open-Meteo, Overpass).

### Time Constraints
- None stated; solo hobby-grade cadence.

### Business Constraints
- None. No monetization, no growth/engagement targets (by design — success is *speed to
  action*, not retention).

### User Preference Constraints
- The owner wants it calm, uncluttered, privacy-preserving, and genuinely useful for
  breaking out of stuck states — not another attention-capture app. Values honest
  assessment over agreeableness, and asks to be told when a request conflicts with an
  established decision **before** it's implemented.

---

## Current State

### Completed Work
- Full v2 app: home (one big CTA + collapsible "Tune it" constraints), result view (one
  action + capped reroll + feedback), settings, and a stats/reflection view.
- **339 activities** (296 original + 43 from expansion batch 1), constraint-tagged, with
  condition gating (season/weather/temp/region). Of these: ~53 country-specific, ~61
  seasonal-gated, ~21 weather-only.
- **Budget tiers (free / $ / $$ + flexible)** end-to-end: `engine.budgetOk` does
  tier-ceiling matching via `BUDGET_TIER`; existing 32 `low` activities migrated to `$`;
  UI chips updated; legacy `low` handled gracefully in engine + saved-constraint restore.
- **New reach options (indoor, long walk)**: `engine.reachOk` + `engine.isLongWalk`
  (`LONG_WALK_MIN = 15`); old `reachMax`/`REACH_ORDER` ceiling logic removed.
- **Skip-to-next flow**: "Not this time" serves a fresh action within the shared 3-cap.
- **Full preference persistence**: chips + stuck note save on change, restore on boot.
- Optional context pipeline (geolocation → Open-Meteo weather + real sun → Overpass nearby
  places, cached 30 min, all degrading gracefully) and display-only units (°C/°F, metric/
  imperial) — unchanged.
- **Pushed to GitHub** (`bcreates440/unstuck-v2`) and **deployed to GitHub Pages**.
- Security hardening (CSP + headers, path-traversal guard in `serve.ps1`, `textContent`-only
  DOM writes) — unchanged.
- **Test suite:** `engine.test.js`, zero-dependency (Node only), **80 assertions, passing**
  (was 72; +budget-tier and +reachOk coverage). Service-worker cache bumped v8 → v9.
- Activity-history / reflection feature: per-button tap tallies, revisitable "did it" list,
  "Save settings" button + confirmation toast — unchanged.

### Partially Completed Work
- **The 500-activity expansion.** Batch 1 = 43 new `e1-*` activities (long walks, `$`/`$$`
  outings, indoor-stay, all four vibes, a few seasonal/regional). **Awaiting owner tone
  review before continuing.** Open question raised to owner: is the `$$` tier (8 entries so
  far — matinee, museum, paint-a-pot, day-swim, etc.) on-mission, or should `$$` stay
  deliberately sparse?
- **Security review is partial by intent** (client-side risks fixed; server-side checklist
  is N/A). No SECURITY.md / threat-model / CI workflow yet.
- Tests cover only the **pure** engine functions; DOM-coupled code (`app.js`, `context.js`)
  is untested.

### Not Yet Started
- **Batches 2…N of the activity expansion** (to reach ~500), proportions held.
- A true **per-day reroll/skip budget that resets at local midnight** — does NOT exist; the
  owner asked to "confirm" it and was told it isn't implemented. Currently the cap resets
  per *request*, not per day. Owner chose "skip respects the 3-cap" over building the daily
  reset, so this remains an *optional* future change.
- Smarter feedback/adaptive novelty (data is logged but not yet used).
- Letting real place distance relax the `reach` gate.
- "Recently snowed / snow on ground" heuristic for winter activities.
- SECURITY.md, deployment/incident checklists, GitHub Actions security scanning workflow.
- Updating HANDOFF.md to reflect the new budget/reach/skip internals.

---

## Files, Systems, and Technologies

### Technology Stack
- **Frontend:** Vanilla HTML5 + CSS3 (custom properties) + plain ES (no modules, no
  transpile). PWA with manifest + service worker.
- **Backend / Database:** None — `localStorage` only (keys: `unstuck.settings`,
  `unstuck.ctxCache`, `unstuck.v1` feedback store, `unstuck.lastConstraints`).
- **Hosting:** GitHub Pages (https://bcreates440.github.io/unstuck-v2/). Local dev via the
  bundled `serve.ps1` PowerShell static server.
- **APIs:** Open-Meteo (weather + sun, no key); Overpass / OpenStreetMap (nearby places, no
  key); Browser Geolocation API.
- **Tools:** Git + GitHub CLI (`gh`, at `C:\Program Files\GitHub CLI\gh.exe`); Node.js LTS
  (at `C:\Program Files\nodejs\node.exe`, used only to run the test suite — **not** a
  runtime dependency).

### Relevant Repositories
- `https://github.com/bcreates440/unstuck-v2` (public, default branch `master`).

### Relevant Files
- `index.html` — app shell: home, result, settings, stats views + toast. Tune chips now
  include `$`/`$$` budgets and `indoor`/`long walk` reach. Loads scripts.
- `styles.css` — all styling + theme tokens (`:root` light + dark `@media`).
- `util.js` — `U`: random/format helpers.
- `settings.js` — `Settings`: on-device prefs store.
- `units.js` — `Units`: °C/°F + metric/imperial formatting (display-only).
- `context.js` — `Context`: optional geolocation + weather + sun + nearby places, cached.
- `activities.js` — `ACTIVITIES[]`: 339 templates + `dur()` helper. New entries are the
  `e1-*` batch at the end. Budget field is now `free` | `$` | `$$`.
- `engine.js` — `Engine`: decision pipeline + named `W.*` weights + `BUDGET_TIER` /
  `LONG_WALK_MIN`, `budgetOk`, `reachOk`, `isLongWalk`.
- `app.js` — UI wiring, view switching, `Store` (feedback/tallies/liked), persistence,
  skip-to-next flow, boot.
- `engine.test.js` — Node-only test suite (80 assertions).
- `sw.js` — service worker (offline cache; **`unstuck-v9`** — bump on asset changes).
- `serve.ps1` — zero-install static dev server (hardened).
- `manifest.json`, `icons/icon.svg`, `.gitignore`.
- `HANDOFF.md` — detailed engineering handoff (now partially stale re: budget/reach/skip).
- `README.md` — project notes + how to run + how to test.

**Script load order matters:** `util → settings → units → context → activities → engine → app`.

---

## Known Problems

1. **No midnight reroll reset exists.** The reroll/skip cap (`session.rerolls`, starts at 3)
   is in-memory and resets on every fresh "Give me something to do" — not at midnight, and
   not a per-day limit. The owner is aware; building a real daily cap is optional future work.
2. **`$$` budget tier vs. the free/low-friction ethos.** `$$` ("a small outing") is the
   riskiest tier for the product's mission. Kept sparse and modest on purpose; flagged to
   the owner for a steer.
3. **`frame-ancestors` cannot be set on GitHub Pages** (needs an HTTP header). Page is
   theoretically iframable (clickjacking). Low risk for a no-account tool.
4. **New UI/UX still not pixel-verified in a real browser.** Verification has leaned on unit
   tests, an engine smoke test (pools non-empty for every new selection), and CSSOM reads.
   The stats view, Save toast, new budget/reach chips, and skip-to-next flow have **not**
   been eyeballed in a browser yet — still the single most valuable next verification step.
5. **No automated CI.** Tests run manually (`node engine.test.js`).
6. **Service-worker staleness footgun:** forgetting to bump `sw.js`'s `CACHE` ships an
   update users never see. Manual, no guard. (Currently correct at v9.)
7. `node`/`gh` are installed but **not always on PATH** in a session — call by full path
   (paths above) or open a fresh terminal.

---

## Previous Analysis and Findings

- **Architecture is the right call for the goal.** Zero-dependency, no-backend design serves
  privacy + offline + low-friction. Don't "modernize" into a framework without a strong reason.
- **Scoring weights are the main tuning surface** (`engine.js` `W.*`); only *ratios* matter
  (pool is renormalized before each weighted-random pick).
- **Condition-awareness is structurally guaranteed** by hard filters in `Engine.feasible()`
  (season + live weather + temp + region + reach + budget all gate).
- **Budget/reach are now first-class filters**: `budgetOk` is a tier ceiling; `reachOk`
  interprets the six "how far" selections (incl. the derived "long walk" from `minMinutes`).
- **The skip-to-next flow shares the reroll budget on purpose** — preserving the
  indecision-spiral guard while still forcing a tracked choice rather than a silent exit.
- **Security model:** most of a generic AppSec checklist is N/A (no server/auth/DB/session).
  Real client-side surfaces were reviewed and fixed; all DOM writes use `textContent`.

---

## Assumptions

1. Users are fine doing real-world physical activities; suggestions skew toward movement and
   off-screen action.
2. Timezone is a good-enough proxy for country (gates region-specific activities).
3. Open-Meteo and Overpass remain free and keyless; if either changes, weather/places
   degrade gracefully to "off" and the core app still works.
4. `localStorage` is available and persistent enough; all writes are wrapped in try/catch.
5. The owner wants to keep this strictly client-side and account-free.
6. The activity expansion should match the existing tone (specific, startable, single,
   bounded) and proportions; `$$` stays modest.

Flag any of these if they appear invalid for a requested change.

---

## Desired Working Style

Be critical when needed, identify flaws in reasoning, challenge assumptions, prioritize
practicality, explain tradeoffs, avoid unnecessary complexity, and preserve previous
decisions unless a strong reason exists to change them. **When a request conflicts with an
established decision (e.g. adding a vibe value, a $$$ tier, an unbounded skip loop), say so
and get a decision before implementing.** The owner values honest assessment over agreeableness.

---

## Immediate Next Steps

Highest-priority candidate tasks (pick with the owner — none is urgent):
1. **Owner reviews expansion batch 1** (`e1-*` activities) for tone/format, and answers the
   `$$`-tier question. On approval, **continue authoring toward ~500** in further batches,
   proportions held, bumping `sw.js` each batch.
2. **Pixel-verify the new UI in a real browser**: budget/reach chips, skip-to-next flow,
   stats view, Save toast (the standing verification gap).
3. Optional: build a true **midnight-resetting daily reroll/skip cap** (if the owner wants it).
4. Optional: security artifacts (SECURITY.md / threat model / CI), update HANDOFF.md.

---

## What I Need From You Right Now

This handoff enables a clean transfer to a fresh session from the **exact current point**.
On takeover: confirm your understanding, list any missing info you need, then await
direction before making changes. Do not restart anything from scratch. The most likely next
instruction is "continue the activity expansion" (after the owner's tone review) — wait for
the explicit go-ahead and the `$$`-tier steer before mass-producing activities.

---

## Required Output Format (for the receiving model)

Provide: (1) your understanding of the project, (2) missing information you need, (3) risks
and concerns, (4) recommended next actions, (5) a detailed execution plan. Do not restart
the project from scratch unless specifically instructed.

---

## Development Handoff

**Current Branch:** `master`

**Current Commit:** `31d21adba139f703b53ff8dedefb86f1cff0e784`
*(Add budget tiers, indoor/long-walk reach, capped skip-to-next, full persistence + batch-1 activities)*

**Remote:** `https://github.com/bcreates440/unstuck-v2` (public; deployed via GitHub Pages)

**Working tree:** clean, fully pushed (local `master` == `origin/master`).

**Last Completed Task:** Budget tiers (`free`/`$`/`$$` + flexible; migrated legacy `low`),
two new reach options (`indoor`, `long walk`), "Not this time" → next action within the
shared 3-cap, full preference persistence (chips + stuck note), and **expansion batch 1**
(+43 activities → 339 total). Tests 72 → 80 passing. Cache v8 → v9.

**Current Task:** None in progress. **Awaiting owner's tone review of batch 1** and the
`$$`-tier steer before continuing the expansion.

**Next Planned Task:** Continue the activity expansion toward ~500 in further batches once
batch 1 is approved — or real-browser pixel verification, or the optional daily-cap /
security artifacts, at the owner's choice.

**Build Status:** N/A (no build step). **Tests passing: 80/80** (`node engine.test.js`).
Engine smoke test confirms every new reach/budget selection yields a non-empty pool
(indoor 34 · long walk 65 · short walk 53 · here 37 · budget free 82 / $ 98 / $$ 104).

**Known Bugs:** None functional. Open caveats: no midnight reroll reset (by design for now);
`frame-ancestors` unsettable on Pages (clickjacking, low risk); new UI not yet pixel-verified
in a real browser.

**Commands Used:**
```powershell
# Run locally (zero install):
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 4179
# then open http://localhost:4179/

# Run the engine test suite (Node at "C:\Program Files\nodejs\node.exe"):
node engine.test.js

# Git / GitHub (gh at "C:\Program Files\GitHub CLI\gh.exe"):
git add <files> ; git commit -m "..." ; git push
```
> There is **no** `npm install` / `npm run dev` / `npm run build` — no Node runtime
> dependency, no package.json. Node is used *only* to run the tests.

**Important Notes:**
- Do not refactor unrelated code.
- Preserve the architecture (vanilla, build-free, no-backend, no-deps) unless a strong
  justification exists; explain any significant architectural change before doing it.
- **Bump `CACHE` in `sw.js` on every asset change** (currently `unstuck-v9`).
- **Add any new network endpoint to the CSP `connect-src` in `index.html`**, or it's blocked.
- Keep DOM writes on `textContent` (no `innerHTML`).
- Keep `social` out of `vibe`; keep `vibe` to the four values (no "exercise" vibe). Keep
  "one action, never a list," the 3-reroll cap, and the `free`/`$`/`$$` budget ceiling (no `$$$`).
- New activities go at the end of `activities.js` in the `e1-*` (or next `eN-*`) batch,
  matching the established voice and keeping category proportions roughly intact.
