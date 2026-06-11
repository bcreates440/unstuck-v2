# Universal AI Project Handoff — Unstuck v2

You are taking over an existing project from another AI assistant. Treat this handoff as
the complete source of truth. Do not assume access to previous conversations. If
information is missing, identify the gaps and ask targeted questions before proceeding.

> There is also a deeper engineering-focused doc, [HANDOFF.md](HANDOFF.md), covering the
> data model, engine pipeline, and gotchas in detail. This file is the higher-altitude
> project handoff; read HANDOFF.md when you need the mechanics.

---

## Project Overview

**Project Name:** Unstuck (v2)

**Primary Goal:** Convert a low-motivation / doomscrolling state into **exactly one**
immediate, real-world, low-effort action — as fast as possible, with minimal executive
function required from the user. Success = how quickly it turns "I don't know what to do"
into a real action the user actually does. Explicitly **not** time-on-app.

**Project Type:** Software — a client-side, offline-first Progressive Web App (PWA).

**Current Stage:** Maintenance / incremental feature work. The app is feature-complete,
runnable, deployed, and has no known functional bugs.

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
restyle. The project is a solo effort by the owner (GitHub `bcreates440`), built and
iterated on with AI assistance.

It was pushed to GitHub and deployed to GitHub Pages during the most recent session, then
security-hardened, given a test suite, and extended with an activity-history reflection
feature.

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
1. Help users reflect on their own follow-through (the new activity-history feature).
2. Keep growing and tuning the activity set without adding complexity or dependencies.

---

## Decisions Already Made

Treat these as established unless a compelling reason exists to revisit them:

1. **Vanilla HTML/CSS/JS PWA — no framework, no build step, no dependencies, no bundler.**
   Scripts are plain globals loaded in order on `window`.
2. **No accounts, no backend, no database, no API keys.** All state is `localStorage`.
   External calls (weather, places) are keyless and strictly optional.
3. **One suggestion per request; reroll capped at 3.** This is core philosophy, not a knob.
4. **Two external services, both keyless and opt-in:** Open-Meteo (weather + sun) and
   Overpass/OpenStreetMap (nearby places).
5. **`social` is its own activity field — never inside `vibe`.** `vibe` is only the four
   values: calm / creative / adventurous / productive.
6. **No web fonts** — a rounded *system* font stack only (external fonts caused
   render-blocking/offline hangs). Staying zero-network is intentional.
7. **One hero colour (coral) + one accent (teal).** Warm cream light theme + cosy dark.
8. **"Done for now" was deliberately removed** so leaving a real suggestion requires a
   tracked feedback tap — this is the intended self-reflection nudge, not an oversight.
9. **Settings apply live**, but there is now also an explicit "Save settings" button +
   confirmation toast for reassurance. Both behaviours are intentional.
10. **Deployed publicly** to GitHub Pages from `master` (`/` root). The repo is public.

---

## Constraints

### Technical Constraints
- Must remain a build-free static site (servable from any static host / `file://` with
  graceful degradation; geolocation/weather need `localhost` or HTTPS).
- No external runtime dependencies; no inline scripts (a Content-Security-Policy enforces
  `script-src 'self'`).
- `connect-src` is allow-listed to only `api.open-meteo.com` and `overpass-api.de`. Any new
  network endpoint must be added to the CSP in `index.html` or it will be blocked.
- Service-worker caching: **bump `CACHE` in `sw.js`** (`unstuck-vN`) on *every* asset change
  or users keep getting stale files. Currently `unstuck-v8`.

### Budget Constraints
- $0. Everything used is free/keyless (GitHub Pages, Open-Meteo, Overpass).

### Time Constraints
- None stated; solo hobby-grade cadence.

### Business Constraints
- None. No monetization, no growth/engagement targets (by design — success is *speed to
  action*, not retention).

### User Preference Constraints
- The owner wants it calm, uncluttered, privacy-preserving, and genuinely useful for
  breaking out of stuck states — not another attention-capture app.

---

## Current State

### Completed Work
- Full v2 app: home (one big CTA + collapsible "Tune it" constraints), result view (one
  action + capped reroll + feedback), settings, and a new stats/reflection view.
- **296 activities** (246 general + 50 country-specific; 50 of the set are seasonal),
  constraint-tagged, with condition gating (season/weather/temp/region).
- Optional context pipeline: geolocation → Open-Meteo weather + real sunrise/sunset →
  Overpass nearby named places, all cached 30 min, all degrading gracefully.
- Units (°C/°F, metric/imperial), display-only.
- **Pushed to GitHub** (`bcreates440/unstuck-v2`) and **deployed to GitHub Pages**.
- **Security hardening pass:** CSP + `X-Content-Type-Options` + `Referrer-Policy` meta tags;
  path-traversal guard, security headers, and typed error responses in `serve.ps1`;
  `toFixed(5)` on coordinates in the Overpass query; `.gitignore` added.
- **Named scoring weights:** all magic numbers in `engine.js` `score()` extracted into a
  documented `W.*` constants block.
- **Test suite:** `engine.test.js`, zero-dependency (Node only), **72 assertions, passing**,
  covering the engine's pure functions and verifying each named weight's contribution.
- **Activity-history / reflection feature:** per-button tap tallies, a revisitable "did it"
  list, removal of "Done for now", and an explicit Save button with a confirmation toast.

### Partially Completed Work
- **Security review is partial by intent.** The most relevant client-side risks were fixed,
  but the prompt's full server-side checklist (auth, sessions, SQLi, rate limiting, etc.)
  is N/A for this architecture. No SECURITY.md / threat-model doc / CI scanning workflow has
  been created yet (these were *suggested* as a follow-up but not done).
- Tests cover only the **pure** engine functions; DOM-coupled code (`app.js`, `context.js`)
  is untested (would need a jsdom-style harness).

### Not Yet Started
- Smarter feedback/adaptive novelty (the data is logged but not yet used).
- Letting real place distance relax the `reach` gate.
- "Recently snowed / snow on ground" heuristic for winter activities.
- Optional: promote v2 to be the canonical folder and retire v1.
- SECURITY.md, deployment/incident checklists, GitHub Actions security scanning workflow.

---

## Files, Systems, and Technologies

### Technology Stack
- **Frontend:** Vanilla HTML5 + CSS3 (custom properties / theme tokens) + plain ES (no
  modules, no transpile). PWA with manifest + service worker.
- **Backend:** None.
- **Database:** None — `localStorage` only (keys: `unstuck.settings`, `unstuck.ctxCache`,
  `unstuck.v1` feedback store, `unstuck.lastConstraints`).
- **Hosting:** GitHub Pages (https://bcreates440.github.io/unstuck-v2/). Local dev via the
  bundled `serve.ps1` PowerShell static server.
- **Frameworks:** None.
- **APIs:** Open-Meteo (weather + sunrise/sunset, no key); Overpass / OpenStreetMap (nearby
  places, no key). Browser Geolocation API.
- **Tools:** Git + GitHub CLI (`gh`, installed at `C:\Program Files\GitHub CLI\gh.exe`);
  Node.js LTS v24.16.0 (installed at `C:\Program Files\nodejs\node.exe`, used only to run
  the test suite — **not** a runtime dependency).

### Relevant Repositories
- `https://github.com/bcreates440/unstuck-v2` (public, default branch `master`).

### Relevant Files
- `index.html` — app shell: home, result, settings, **stats** views + toast. Loads scripts.
- `styles.css` — all styling + theme tokens (`:root` light + dark `@media`).
- `util.js` — `U`: random/format helpers.
- `settings.js` — `Settings`: on-device prefs store.
- `units.js` — `Units`: °C/°F + metric/imperial formatting (display-only).
- `context.js` — `Context`: optional geolocation + weather + sun + nearby places, cached.
- `activities.js` — `ACTIVITIES[]`: 296 templates + `dur()` helper.
- `engine.js` — `Engine`: decision pipeline + the named `W.*` scoring weights.
- `app.js` — UI wiring, view switching, `Store` (feedback/tallies/liked), boot.
- `engine.test.js` — Node-only test suite for the engine's pure functions.
- `sw.js` — service worker (offline cache; bump `CACHE` on asset changes).
- `serve.ps1` — zero-install static dev server (hardened).
- `manifest.json`, `icons/icon.svg`, `.gitignore`.
- `HANDOFF.md` — detailed engineering handoff (data model, engine, gotchas).
- `README.md` — project notes + how to run + how to test.

**Script load order matters:** `util → settings → units → context → activities → engine → app`.

---

## Known Problems

Current issues, blockers, concerns, risks, unresolved questions:

1. **`frame-ancestors` cannot be set on GitHub Pages** (it requires an HTTP header, not a
   meta tag, and Pages doesn't allow custom headers). The page is therefore theoretically
   iframable (clickjacking). Low risk for a no-account tool with no sensitive actions.
2. **Visual screenshots could not be captured in earlier sessions** — the preview renderer
   froze (rAF stalled). Verification has relied on `getComputedStyle`/CSSOM reads, a
   dev-server smoke test, and unit tests. **The new features have not been pixel-verified in
   a real browser yet** — that's the single most valuable next verification step.
3. **No automated CI.** Tests must be run manually (`node engine.test.js`).
4. **Service-worker staleness footgun:** forgetting to bump `sw.js`'s `CACHE` ships an
   update users never see. Manual, no guard.
5. `node`/`gh` are installed but **not on this session's PATH** — a fresh terminal picks
   them up; otherwise call them by full path (paths above).

---

## Previous Analysis and Findings

- **Architecture is the right call for the goal.** The zero-dependency, no-backend design
  directly serves the privacy + offline + low-friction objectives. Don't "modernize" it
  into a framework without a strong reason.
- **The scoring weights are the main tuning surface** and were previously undocumented magic
  numbers — now named in `engine.js` `W.*`. Only the *ratios* between them matter (the pool
  is renormalized before each weighted-random pick).
- **Condition-awareness is structurally guaranteed**, not best-effort: impossible
  suggestions are blocked by hard filters in `Engine.feasible()` (season + live weather +
  temp + region all gate). Weather triggers fire on *current* conditions only (deliberate
  "under-suggest rather than suggest the impossible" trade-off).
- **A code-quality review graded the project B+ overall.** The two flagged weaknesses
  (unnamed magic numbers → was C+, zero tests → was D) have since been addressed.
- **Security model:** most of a generic AppSec checklist is N/A here because there is no
  server, auth, DB, or session. The real client-side surfaces (DOM injection, dev-server
  path traversal, missing headers, third-party response handling) were reviewed and fixed.
  All DOM writes use `textContent` (no `innerHTML`); no secrets exist in the repo.

---

## Assumptions

The project currently assumes:
1. Users are fine doing real-world physical activities; suggestions skew toward movement and
   off-screen action.
2. Timezone is a good-enough proxy for country (used to gate region-specific activities).
3. Open-Meteo and Overpass remain free and keyless. If either changes, weather/places
   degrade gracefully to "off" — the core app still works.
4. `localStorage` is available and persistent enough; all writes are wrapped in try/catch
   and fail silent.
5. The owner wants to keep this strictly client-side and account-free.

Flag any of these if they appear invalid for a requested change.

---

## Desired Working Style

When assisting: be critical when needed, identify flaws in reasoning, challenge assumptions,
prioritize practicality, explain tradeoffs, avoid unnecessary complexity, and preserve
previous decisions unless a strong reason exists to change them. The owner explicitly values
honest assessment over agreeableness (e.g. wanted a frank code grade, not praise).

---

## Immediate Next Steps

Highest-priority candidate tasks (pick with the owner — none is urgent):
1. **Pixel-verify the new stats view, Save toast, and the removed "Done for now" flow in a
   real browser** (the one verification gap).
2. Optionally produce the suggested security artifacts: `SECURITY.md`, a threat-model doc, a
   deployment checklist, and a GitHub Actions workflow (even just running `engine.test.js`).
3. Continue tuning/growing the activity set, or start on adaptive feedback (data is logged).

---

## What I Need From You Right Now

This handoff is being written to enable a clean transfer to a fresh session. On takeover:
confirm your understanding, list any missing info you need, then await direction before
making changes. Do not restart anything from scratch.

---

## Required Output Format (for the receiving model)

Provide: (1) your understanding of the project, (2) missing information you need, (3) risks
and concerns, (4) recommended next actions, (5) a detailed execution plan. Do not restart
the project from scratch unless specifically instructed.

---

## Development Handoff

**Current Branch:** `master`

**Current Commit:** `889cb126ddd1f686f2ea2a59839c9561d053c6a1`
*(Add activity-history reflection + explicit Save; force a tracked exit)*

**Remote:** `https://github.com/bcreates440/unstuck-v2` (public; deployed via GitHub Pages)

**Working tree:** clean, fully pushed.

**Last Completed Task:** Activity-history reflection feature — per-button tap tallies, a
revisitable "did it" list, removal of "Done for now" (with a dead-end-only "Back to start"
escape hatch), and an explicit "Save settings" button + confirmation toast. Service-worker
cache bumped v7 → v8.

**Current Task:** None in progress. Awaiting direction.

**Next Planned Task:** (owner's choice) real-browser pixel verification of the new UI, or the
suggested security artifacts (SECURITY.md / threat model / CI), or activity-set growth.

**Build Status:** N/A (no build step). **Tests passing: 72/72** (`node engine.test.js`).
Dev-server smoke test passed (assets serve 200; path traversal returns 403).

**Known Bugs:** None functional. Open caveats: `frame-ancestors` unsettable on Pages
(clickjacking, low risk); new features not yet pixel-verified in a real browser.

**Commands Used:**
```powershell
# Run locally (zero install):
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 4179
# then open http://localhost:4179/

# Run the engine test suite (Node installed at "C:\Program Files\nodejs\node.exe"):
node engine.test.js

# Git / GitHub (gh at "C:\Program Files\GitHub CLI\gh.exe"):
git add <files> ; git commit -m "..." ; git push
```
> There is **no** `npm install` / `npm run dev` / `npm run build` — this project has no
> Node runtime dependency and no package.json. Node is used *only* to run the tests.

**Important Notes:**
- Do not refactor unrelated code.
- Preserve the existing architecture (vanilla, build-free, no-backend, no-deps) unless a
  strong justification exists; explain any significant architectural change before doing it.
- **Bump `CACHE` in `sw.js` on every asset change**, or deployed updates won't reach users.
- **Add any new network endpoint to the CSP `connect-src` in `index.html`**, or it's blocked.
- Keep DOM writes on `textContent` (no `innerHTML`) to preserve the XSS-safe posture.
- Keep `social` out of `vibe` arrays. Keep "one action, never a list" and the 3-reroll cap.
