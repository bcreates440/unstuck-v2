// engine.test.js — zero-dependency tests for Engine pure functions.
// Run with: node engine.test.js
//
// Uses Node's vm module to load engine.js with minimal browser-global stubs.
// No test framework, no npm install required.

'use strict';
const assert = require('assert/strict');
const fs     = require('fs');
const path   = require('path');
const vm     = require('vm');

/* ---- load engine.js into a sandboxed context with browser-global stubs ---- */
const sandbox = {
  Units: { distance: (m) => `${m}m`, smallLen: (cm) => `${cm}cm` },
  ACTIVITIES: [],
};
vm.createContext(sandbox);
const src = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
// Append explicit exports — const bindings don't auto-land on the vm global.
vm.runInContext(src + '\nthis.Engine=Engine; this.W=W;', sandbox);
const { Engine, W } = sandbox;

/* ---- tiny test runner ---- */
let passed = 0, failed = 0;
function test(name, fn) {
  try   { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.error(`  ✗  ${name}\n     ${e.message}`); failed++; }
}
function group(label) { console.log(`\n${label}`); }
function close(a, b, msg) {
  assert.ok(Math.abs(a - b) < 0.0001, msg || `expected ${a} ≈ ${b}`);
}

/* ---- factory helpers for building test objects ---- */
function act(overrides) {
  return {
    id: 'test', vibe: ['calm'], energy: ['low', 'medium', 'high'],
    social: 'either', budget: 'free', env: 'either', reach: 'here',
    minMinutes: 5, daypart: ['day', 'evening', 'night'],
    needsOpen: false, needsLight: false, weatherOnly: null,
    seasons: null, regions: null, minTemp: null, maxTemp: null,
    tags: ['test'], text: () => 'test activity',
    ...overrides,
  };
}
function con(overrides) {
  return { energy: 'medium', time: 'flexible', budget: 'flexible',
           social: 'either', vibe: 'undefined', reach: 'flexible', stuck: '', ...overrides };
}
function ctx(overrides) {
  return { minutes: Infinity, hour: 12, daypart: 'day', venuesOpen: true, daylight: true,
           weather: null, season: 'summer', region: null, reach: 'flexible',
           prefs: {}, places: [], ...overrides };
}
function weather(overrides) {
  return { code: 0, temp: 20, label: 'clear', wet: false, snow: false, thunder: false,
           fog: false, cold: false, hot: false, windy: false, severe: false,
           outdoorHostile: false, isDay: true, ...overrides };
}

/* ======================================================================== */

group('daypartFromClock');
test('midnight is night',       () => assert.equal(Engine.daypartFromClock(0),  'night'));
test('early morning is night',  () => assert.equal(Engine.daypartFromClock(5),  'night'));
test('6am is day',              () => assert.equal(Engine.daypartFromClock(6),  'day'));
test('afternoon is day',        () => assert.equal(Engine.daypartFromClock(14), 'day'));
test('17:59 is still day',      () => assert.equal(Engine.daypartFromClock(17), 'day'));
test('18:00 is evening',        () => assert.equal(Engine.daypartFromClock(18), 'evening'));
test('21:59 is evening',        () => assert.equal(Engine.daypartFromClock(21), 'evening'));
test('22:00 is night',          () => assert.equal(Engine.daypartFromClock(22), 'night'));

group('daypart (with real sun data)');
test('during daylight hours is day', () => {
  const now = new Date('2025-06-01T14:00:00');
  const sun = { sunrise: new Date('2025-06-01T05:00:00'), sunset: new Date('2025-06-01T21:00:00') };
  assert.equal(Engine.daypart(now, sun), 'day');
});
test('after sunset but within 2.5h is evening', () => {
  const now = new Date('2025-06-01T22:00:00');
  const sun = { sunrise: new Date('2025-06-01T05:00:00'), sunset: new Date('2025-06-01T21:00:00') };
  assert.equal(Engine.daypart(now, sun), 'evening');
});
test('well after sunset is night', () => {
  const now = new Date('2025-06-02T01:00:00');
  const sun = { sunrise: new Date('2025-06-01T05:00:00'), sunset: new Date('2025-06-01T21:00:00') };
  assert.equal(Engine.daypart(now, sun), 'night');
});
test('no sun data falls back to clock', () => {
  assert.equal(Engine.daypart(new Date('2025-06-01T10:00:00'), null), 'day');
});

group('season (northern hemisphere)');
test('January is winter',   () => assert.equal(Engine.season(new Date('2025-01-15'), 40), 'winter'));
test('February is winter',  () => assert.equal(Engine.season(new Date('2025-02-15'), 40), 'winter'));
test('March is spring',     () => assert.equal(Engine.season(new Date('2025-03-15'), 40), 'spring'));
test('June is summer',      () => assert.equal(Engine.season(new Date('2025-06-15'), 40), 'summer'));
test('October is autumn',   () => assert.equal(Engine.season(new Date('2025-10-15'), 40), 'autumn'));
test('December is winter',  () => assert.equal(Engine.season(new Date('2025-12-15'), 40), 'winter'));

group('season (southern hemisphere flip)');
test('January at lat -33 is summer', () => assert.equal(Engine.season(new Date('2025-01-15'), -33), 'summer'));
test('June at lat -33 is winter',    () => assert.equal(Engine.season(new Date('2025-06-15'), -33), 'winter'));
test('lat null — no flip',           () => assert.equal(Engine.season(new Date('2025-01-15'), null), 'winter'));

group('region');
test('Europe/London → UK',        () => assert.equal(Engine.region('Europe/London'), 'UK'));
test('America/Toronto → CA',      () => assert.equal(Engine.region('America/Toronto'), 'CA'));
test('America/Vancouver → CA',    () => assert.equal(Engine.region('America/Vancouver'), 'CA'));
test('Australia/Sydney → AU',     () => assert.equal(Engine.region('Australia/Sydney'), 'AU'));
test('Asia/Kolkata → IN',         () => assert.equal(Engine.region('Asia/Kolkata'), 'IN'));
test('Europe/Berlin → DE',        () => assert.equal(Engine.region('Europe/Berlin'), 'DE'));
test('America/New_York → null',   () => assert.equal(Engine.region('America/New_York'), null));
test('null tz → null',            () => assert.equal(Engine.region(null), null));

group('socialOk');
test('solo vs solo → true',    () => assert.ok(Engine.socialOk(act({ social: 'solo' }),   'solo')));
test('solo vs social → false', () => assert.equal(Engine.socialOk(act({ social: 'solo' }),   'social'), false));
test('either activity → always passes', () => {
  assert.ok(Engine.socialOk(act({ social: 'either' }), 'solo'));
  assert.ok(Engine.socialOk(act({ social: 'either' }), 'social'));
});
test('"either" constraint always passes', () => {
  assert.ok(Engine.socialOk(act({ social: 'solo' }),   'either'));
  assert.ok(Engine.socialOk(act({ social: 'social' }), 'either'));
});

group('budgetOk — free < $ < $$ tiers');
test('flexible constraint accepts anything', () => {
  assert.ok(Engine.budgetOk(act({ budget: 'free' }), 'flexible'));
  assert.ok(Engine.budgetOk(act({ budget: '$$'   }), 'flexible'));
});
test('free constraint rejects a paid activity', () => {
  assert.equal(Engine.budgetOk(act({ budget: '$' }), 'free'), false);
});
test('free constraint accepts free activity', () => {
  assert.ok(Engine.budgetOk(act({ budget: 'free' }), 'free'));
});
test('$ constraint accepts free + $, rejects $$', () => {
  assert.ok(Engine.budgetOk(act({ budget: 'free' }), '$'));
  assert.ok(Engine.budgetOk(act({ budget: '$'   }), '$'));
  assert.equal(Engine.budgetOk(act({ budget: '$$' }), '$'), false);
});
test('$$ constraint accepts every tier', () => {
  assert.ok(Engine.budgetOk(act({ budget: 'free' }), '$$'));
  assert.ok(Engine.budgetOk(act({ budget: '$'   }), '$$'));
  assert.ok(Engine.budgetOk(act({ budget: '$$'  }), '$$'));
});
test('legacy "low" alias behaves like $', () => {
  assert.ok(Engine.budgetOk(act({ budget: 'low' }), '$'));    // low activity ≈ $
  assert.ok(Engine.budgetOk(act({ budget: '$'   }), 'low'));  // low constraint ≈ $
  assert.equal(Engine.budgetOk(act({ budget: '$$' }), 'low'), false);
});

group('reachOk — "how far will you go"');
test('flexible / drive accept everything', () => {
  assert.ok(Engine.reachOk(act({ reach: 'drive' }), 'flexible'));
  assert.ok(Engine.reachOk(act({ reach: 'walk', minMinutes: 20 }), 'drive'));
});
test('here accepts only stay-put activities', () => {
  assert.ok(Engine.reachOk(act({ reach: 'here' }), 'here'));
  assert.equal(Engine.reachOk(act({ reach: 'walk' }), 'here'), false);
});
test('indoor accepts indoor/either stay-put, rejects outdoor & walks', () => {
  assert.ok(Engine.reachOk(act({ reach: 'here', env: 'indoor' }), 'indoor'));
  assert.ok(Engine.reachOk(act({ reach: 'here', env: 'either' }), 'indoor'));
  assert.equal(Engine.reachOk(act({ reach: 'here', env: 'outdoor' }), 'indoor'), false);
  assert.equal(Engine.reachOk(act({ reach: 'walk', env: 'indoor' }), 'indoor'), false);
});
test('walk accepts short walks, rejects long walks & drives', () => {
  assert.ok(Engine.reachOk(act({ reach: 'walk', minMinutes: 10 }), 'walk'));
  assert.equal(Engine.reachOk(act({ reach: 'walk', minMinutes: 20 }), 'walk'), false);
  assert.equal(Engine.reachOk(act({ reach: 'drive' }), 'walk'), false);
});
test('longwalk accepts long walks (+ here fallback), rejects short walks & drives', () => {
  assert.ok(Engine.reachOk(act({ reach: 'walk', minMinutes: 20 }), 'longwalk'));
  assert.ok(Engine.reachOk(act({ reach: 'here' }), 'longwalk'));
  assert.equal(Engine.reachOk(act({ reach: 'walk', minMinutes: 10 }), 'longwalk'), false);
  assert.equal(Engine.reachOk(act({ reach: 'drive' }), 'longwalk'), false);
});
test('isLongWalk: a walk at/above the 15-min floor', () => {
  assert.ok(Engine.isLongWalk(act({ reach: 'walk', minMinutes: 15 })));
  assert.equal(Engine.isLongWalk(act({ reach: 'walk', minMinutes: 14 })), false);
  assert.equal(Engine.isLongWalk(act({ reach: 'here', minMinutes: 30 })), false);
});

group('weatherTriggerMet');
test('no weatherOnly → always true',                 () => assert.ok(Engine.weatherTriggerMet(act(), weather())));
test('weatherOnly with no weather reading → false',  () => assert.equal(Engine.weatherTriggerMet(act({ weatherOnly: ['wet'] }), null), false));
test('wet trigger: wet + not severe → true',         () => assert.ok(Engine.weatherTriggerMet(act({ weatherOnly: ['wet'] }),     weather({ wet: true, severe: false }))));
test('wet trigger: wet + severe → false',            () => assert.equal(Engine.weatherTriggerMet(act({ weatherOnly: ['wet'] }), weather({ wet: true, severe: true })), false));
test('snow trigger: snow → true',                    () => assert.ok(Engine.weatherTriggerMet(act({ weatherOnly: ['snow'] }),    weather({ snow: true }))));
test('clear trigger: code=0 + isDay → true',         () => assert.ok(Engine.weatherTriggerMet(act({ weatherOnly: ['clear'] }),  weather({ code: 0, isDay: true }))));
test('clear trigger: code=0 + night → false',        () => assert.equal(Engine.weatherTriggerMet(act({ weatherOnly: ['clear'] }), weather({ code: 0, isDay: false })), false));
test('thunder trigger → true',                       () => assert.ok(Engine.weatherTriggerMet(act({ weatherOnly: ['thunder'] }), weather({ thunder: true }))));
test('cold trigger: cold + not severe → true',       () => assert.ok(Engine.weatherTriggerMet(act({ weatherOnly: ['cold'] }),   weather({ cold: true, severe: false }))));

group('stuckMatch');
test('exact tag match → true',     () => assert.ok(Engine.stuckMatch(act({ tags: ['scrolling'] }), 'scrolling my phone')));
test('partial word match → true',  () => assert.ok(Engine.stuckMatch(act({ tags: ['bored'] }),     'I am so bored')));
test('no match → false',           () => assert.equal(Engine.stuckMatch(act({ tags: ['anxious'] }), 'procrastinating'), false));
test('empty stuck string → false', () => assert.equal(Engine.stuckMatch(act({ tags: ['scrolling'] }), ''), false));
test('null stuck → false',         () => assert.equal(Engine.stuckMatch(act({ tags: ['scrolling'] }), null), false));

group('feasible — hard filters');
test('rejects when activity needs more time than available', () =>
  assert.equal(Engine.feasible(act({ minMinutes: 30 }), con(), ctx({ minutes: 10 })), false));
test('passes when time is sufficient', () =>
  assert.ok(Engine.feasible(act({ minMinutes: 10 }), con(), ctx({ minutes: 30 }))));
test('rejects energy mismatch', () =>
  assert.equal(Engine.feasible(act({ energy: ['low'] }), con({ energy: 'high' }), ctx()), false));
test('rejects daypart mismatch', () =>
  assert.equal(Engine.feasible(act({ daypart: ['day'] }), con(), ctx({ daypart: 'night' })), false));
test('rejects drive activity when reach is "here"', () =>
  assert.equal(Engine.feasible(act({ reach: 'drive' }), con(), ctx({ reach: 'here' })), false));
test('rejects needsLight when no daylight', () =>
  assert.equal(Engine.feasible(act({ needsLight: true }), con(), ctx({ daylight: false })), false));
test('rejects seasonal activity out of season', () =>
  assert.equal(Engine.feasible(act({ seasons: ['winter'] }), con(), ctx({ season: 'summer' })), false));
test('rejects region-gated activity when region unknown', () =>
  assert.equal(Engine.feasible(act({ regions: ['UK'] }), con(), ctx({ region: null })), false));
test('rejects region-gated activity when region mismatches', () =>
  assert.equal(Engine.feasible(act({ regions: ['UK'] }), con(), ctx({ region: 'CA' })), false));
test('accepts region-gated activity when region matches', () =>
  assert.ok(Engine.feasible(act({ regions: ['UK'] }), con(), ctx({ region: 'UK' }))));
test('rejects below minTemp when reading exists', () =>
  assert.equal(Engine.feasible(act({ minTemp: 20 }), con(), ctx({ weather: weather({ temp: 5 }) })), false));
test('skips temp gate when weather reading absent', () =>
  assert.ok(Engine.feasible(act({ minTemp: 40 }), con(), ctx({ weather: null }))));
test('drops outdoor activity in severe weather', () =>
  assert.equal(Engine.feasible(act({ env: 'outdoor', weatherOnly: null }), con(),
    ctx({ weather: weather({ severe: true, outdoorHostile: true }) })), false));
test('weather-only outdoor activity survives severe weather', () =>
  assert.ok(Engine.feasible(act({ env: 'outdoor', weatherOnly: ['thunder'] }), con(),
    ctx({ weather: weather({ severe: true, outdoorHostile: true, thunder: true }) }))));

group('score — weight verification');
test('vibe match adds exactly W.VIBE_MATCH over no match', () => {
  const matched   = Engine.score(act({ vibe: ['calm'] }), con({ vibe: 'calm' }),     ctx(), {});
  const unmatched = Engine.score(act({ vibe: ['calm'] }), con({ vibe: 'creative' }), ctx(), {});
  close(matched - unmatched, W.VIBE_MATCH);
});
test('stuck match adds exactly W.STUCK_MATCH', () => {
  const hit  = Engine.score(act({ tags: ['scrolling'] }), con({ stuck: 'scrolling' }), ctx(), {});
  const miss = Engine.score(act({ tags: ['scrolling'] }), con({ stuck: '' }),           ctx(), {});
  close(hit - miss, W.STUCK_MATCH);
});
test('novelty bonus: never-shown scores higher than once-shown', () => {
  const never = Engine.score(act(), con(), ctx(), {});
  const once  = Engine.score(act(), con(), ctx(), { test: { shown: 1, liked: 0, disliked: 0 } });
  assert.ok(never > once);
});
test('liked history scores higher than disliked history', () => {
  const liked    = Engine.score(act(), con(), ctx(), { test: { shown: 5, liked: 3, disliked: 0 } });
  const disliked = Engine.score(act(), con(), ctx(), { test: { shown: 5, liked: 0, disliked: 3 } });
  assert.ok(liked > disliked);
});
test('weather-only timely bonus adds exactly W.WEATHER_TIMELY', () => {
  const w       = weather({ wet: true });
  const timely  = Engine.score(act({ weatherOnly: ['wet'] }), con(), ctx({ weather: w }), {});
  const generic = Engine.score(act({ weatherOnly: null }),    con(), ctx({ weather: w }), {});
  close(timely - generic, W.WEATHER_TIMELY);
});
test('nudge-outdoors preference raises outdoor score', () => {
  const nudged = Engine.score(act({ env: 'outdoor' }), con(), ctx({ prefs: { nudgeOutdoors: true } }), {});
  const plain  = Engine.score(act({ env: 'outdoor' }), con(), ctx({ prefs: {} }), {});
  close(nudged - plain, W.NUDGE_OUTDOOR);
});
test('score floor is always at least W.FLOOR', () => {
  const heavily = Engine.score(act(), con(), ctx(),
    { test: { shown: 999, liked: 0, disliked: 999 } });
  assert.ok(heavily >= W.FLOOR);
});

/* ---- summary ---- */
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
