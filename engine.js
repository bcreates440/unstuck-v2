// The decision-compression engine (v2).
//
// Input: lightweight constraints + AMBIENT CONTEXT (time of day, real daylight,
// weather, travel radius) + feedback stats.
// Output: exactly ONE rendered activity. Never a list.
//
//   1. Build context (time bucket -> minutes; sun/clock -> daypart + daylight;
//      ambient weather; how far the user will travel).
//   2. Hard-filter activities that don't fit constraints, reach, daylight, or weather.
//   3. Score the survivors (vibe, "stuck" descriptor, weather fit, novelty, feedback).
//   4. Weighted-random pick of a single activity, then render its template.

const TIME_MINUTES = { '10': 10, '30': 30, '120': 120, 'flexible': Infinity };
const OPEN_FROM = 8;
const OPEN_TO = 21;
// Budget tiers: free (0) < $ (1) < $$ (2). 'flexible' accepts anything.
// 'low' is the legacy value for old saved data / activities -> treated as '$'.
const BUDGET_TIER = { free: 0, '$': 1, '$$': 2, low: 1 };
// A 'walk' activity counts as a "long walk" at/above this realistic-minute floor.
const LONG_WALK_MIN = 15;

// Scoring weights — only the ratios between values matter; the pool is
// renormalized before each weighted-random pick so absolute magnitude is
// irrelevant. Adjust these to tune suggestion steering without touching logic.
const W = {
  VIBE_MATCH:          3,     // explicit vibe selected and matched
  VIBE_OPEN:           0.5,   // "surprise me" — no preference expressed, small generic bonus
  STUCK_MATCH:         2.5,   // "stuck doing ___" tag hit — nearly as strong as a vibe match
  WEATHER_TIMELY:      2,     // weather-only special surfaced in its exact trigger conditions
  WEATHER_OUTDOOR_NICE: 0.6,  // mild outdoor bonus when conditions are fine
  WEATHER_OUTDOOR_BAD: -2,    // strong outdoor penalty when weather is hostile
  WEATHER_INDOOR_COZY: 1,     // indoor bonus when going outside is hostile ("cozy-in" nudge)
  TIMELY:              0.8,   // in-season or in-region: contextual relevance bonus
  NUDGE_OUTDOOR:       1.2,   // user opted "nudge me outside" — mild; weather still dominates
  NUDGE_INDOOR:       -0.3,   // mild indoor penalty when nudge-outdoors preference is on
  NOVELTY:             1.5,   // never-shown activity: encourage variety
  LIKED_PER:           1.0,   // per historical like: reinforce enjoyed activities
  DISLIKED_PER:       -1.2,   // per dislike: stronger avoidance than liking (negatives are stickier)
  OVERSHOW_RATE:       0.15,  // per showing: gradual staleness — avoids repeating too soon
  OVERSHOW_CAP:        1.0,   // ceiling on the staleness penalty
  FLOOR:               0.05,  // minimum weight — every feasible activity stays pickable
};

const Engine = {
  // Daypart from real sunrise/sunset when we have them; otherwise a clock heuristic.
  daypartFromClock(hour) {
    if (hour >= 6 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  },
  daypart(now, sun) {
    if (!sun || !sun.sunrise || !sun.sunset) return Engine.daypartFromClock(now.getHours());
    const t = now.getTime();
    const rise = sun.sunrise.getTime();
    const set = sun.sunset.getTime();
    if (t >= rise && t <= set) return 'day';
    // up to ~2.5h after sunset still counts as "evening"
    if (t > set && t <= set + 2.5 * 3600 * 1000 && now.getHours() < 23) return 'evening';
    return 'night';
  },

  buildContext(constraints, now = new Date(), ambient = {}) {
    const hour = now.getHours();
    const sun = ambient.sun || null;
    const weather = ambient.weather || null;
    let daylight;
    if (sun && sun.sunrise && sun.sunset) {
      daylight = now >= sun.sunrise && now <= sun.sunset;
    } else if (weather && typeof weather.isDay === 'boolean') {
      daylight = weather.isDay;
    } else {
      daylight = hour >= 6 && hour < 19;
    }
    const places = ambient.places || [];
    const lat = ambient.coords ? ambient.coords.lat : null;
    return {
      minutes: TIME_MINUTES[constraints.time] ?? Infinity,
      hour,
      daypart: Engine.daypart(now, sun),
      venuesOpen: hour >= OPEN_FROM && hour < OPEN_TO,
      daylight,
      weather,
      season: Engine.season(now, lat),
      region: Engine.region(ambient.tz),
      reach: constraints.reach || 'flexible', // raw "how far will you go" selection
      prefs: ambient.prefs || {},
      places,
      // measurement formatters (respect the user's unit settings) for activity text
      dist: (m) => Units.distance(m),
      len: (cm) => Units.smallLen(cm),
      // Pick a real nearby place matching any of `kinds`, or null. Activities use this
      // to turn "go to a grocery store" into "walk 7 min to <real store name>".
      nearby: (kinds) => {
        const pool = places.filter((p) => p.kinds.some((k) => kinds.includes(k)));
        if (!pool.length) return null;
        return U.pick(pool.slice(0, Math.min(6, pool.length))); // random among the nearest few
      },
    };
  },

  // Meteorological season from the date, flipped for the southern hemisphere when we
  // know the latitude. Always derivable (calendar), so seasonal gating never blocks
  // the whole pool — but truly condition-dependent activities also gate on weather/temp.
  season(now, lat) {
    const m = now.getMonth(); // 0 = Jan
    let s;
    if (m === 11 || m <= 1) s = 'winter';
    else if (m <= 4) s = 'spring';
    else if (m <= 7) s = 'summer';
    else s = 'autumn';
    if (lat != null && lat < 0) s = { winter: 'summer', spring: 'autumn', summer: 'winter', autumn: 'spring' }[s];
    return s;
  },

  // Coarse country bucket from the IANA timezone (which we only have when location +
  // weather are on). Used to gate region-specific activities. Returns one of the
  // supported country codes or null — and region-specific activities require a KNOWN
  // matching region, so they never surface in the wrong country.
  region(tz) {
    if (!tz) return null;
    if (/^Europe\/(London|Belfast|Guernsey|Jersey|Isle_of_Man)/.test(tz)) return 'UK';
    if (/^America\/(Toronto|Montreal|Nipigon|Thunder_Bay|Iqaluit|Winnipeg|Regina|Swift_Current|Edmonton|Vancouver|Dawson_Creek|Whitehorse|Yellowknife|Inuvik|Halifax|Glace_Bay|Moncton|Goose_Bay|St_Johns|Rankin_Inlet|Resolute|Cambridge_Bay|Atikokan|Blanc-Sablon|Rainy_River|Creston|Fort_Nelson|Dawson|Pangnirtung)/.test(tz)) return 'CA';
    if (/^Australia\//.test(tz)) return 'AU';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN';
    if (/^Europe\/(Berlin|Busingen)/.test(tz)) return 'DE';
    return null;
  },

  socialOk(a, want) {
    if (want === 'either') return true;
    if (a.social === 'either') return true;
    return a.social === want;
  },
  // Budget ceiling: 'free' shows only free; '$' shows free + $; '$$' shows all;
  // 'flexible' accepts anything. ('low' kept as a legacy alias for '$'.)
  budgetOk(a, want) {
    if (!want || want === 'flexible') return true;
    const ceil = BUDGET_TIER[want] ?? 2;
    return (BUDGET_TIER[a.budget] ?? 0) <= ceil;
  },

  isLongWalk(a) { return a.reach === 'walk' && a.minMinutes >= LONG_WALK_MIN; },
  // "How far will you go" — interprets the user's reach selection against an activity:
  //   here     -> stay put (no travel)
  //   indoor   -> stay in: indoor/either activities that need no travel
  //   walk     -> here + short walks (excludes long walks & drives)
  //   longwalk -> here + genuinely long walks (excludes short walks & drives)
  //   drive    -> anywhere a short drive reaches (everything)
  //   flexible -> everything
  reachOk(a, reach) {
    if (!reach || reach === 'flexible' || reach === 'drive') return true;
    if (reach === 'here')     return a.reach === 'here';
    if (reach === 'indoor')   return a.reach === 'here' && (a.env === 'indoor' || a.env === 'either');
    if (reach === 'walk')     return a.reach === 'here' || (a.reach === 'walk' && !Engine.isLongWalk(a));
    if (reach === 'longwalk') return a.reach === 'here' || Engine.isLongWalk(a);
    return true;
  },

  // Does the ambient weather satisfy a weather-only activity's trigger?
  weatherTriggerMet(a, w) {
    if (!a.weatherOnly) return true;     // not a weather-special activity
    if (!w) return false;                 // unknown weather -> don't surface these
    return a.weatherOnly.some((cond) => {
      if (cond === 'wet') return w.wet && !w.severe;
      if (cond === 'snow') return w.snow;
      if (cond === 'clear') return (w.code === 0 || w.code === 1) && w.isDay;
      if (cond === 'fog') return w.fog;
      if (cond === 'hot') return w.hot;
      if (cond === 'cold') return w.cold && !w.severe;
      if (cond === 'thunder') return w.thunder;
      return false;
    });
  },

  feasible(a, c, ctx) {
    if (a.minMinutes > ctx.minutes) return false;
    if (!a.energy.includes(c.energy)) return false;
    if (!Engine.socialOk(a, c.social)) return false;
    if (!Engine.budgetOk(a, c.budget)) return false;
    if (!a.daypart.includes(ctx.daypart)) return false;
    if (a.needsOpen && !ctx.venuesOpen) return false;
    if (!Engine.reachOk(a, ctx.reach)) return false;
    if (a.needsLight && !ctx.daylight) return false;
    // seasonal gating (calendar-based, always known)
    if (a.seasons && !a.seasons.includes(ctx.season)) return false;
    // region gating — country-specific activities need a KNOWN matching country
    // (from timezone), so they only ever appear where they make sense
    if (a.regions && (!ctx.region || !a.regions.includes(ctx.region))) return false;
    // temperature gating — only enforced when we actually have a reading, so a
    // "cool off in the water" never shows on a cold day and "bundle up" never on a hot one
    if (ctx.weather && ctx.weather.temp != null) {
      if (a.minTemp != null && ctx.weather.temp < a.minTemp) return false;
      if (a.maxTemp != null && ctx.weather.temp > a.maxTemp) return false;
    }
    // weather-only specials must match; non-specials never gated here
    if (!Engine.weatherTriggerMet(a, ctx.weather)) return false;
    // in genuinely severe weather, drop pure-outdoor activities entirely
    if (ctx.weather && ctx.weather.severe && a.env === 'outdoor' && !a.weatherOnly) return false;
    return true;
  },

  stuckMatch(a, stuck) {
    if (!stuck) return false;
    const s = stuck.toLowerCase();
    return a.tags.some((t) => s.includes(t) || t.includes(s.split(/\s+/).pop()));
  },

  score(a, c, ctx, stats) {
    let w = 1;
    if (c.vibe && c.vibe !== 'undefined') w += a.vibe.includes(c.vibe) ? W.VIBE_MATCH : 0;
    else w += W.VIBE_OPEN;

    if (Engine.stuckMatch(a, c.stuck)) w += W.STUCK_MATCH;

    // Weather steering (only when we actually know the weather).
    if (ctx.weather) {
      if (a.weatherOnly)            w += W.WEATHER_TIMELY;
      else if (a.env === 'outdoor') w += ctx.weather.outdoorHostile ? W.WEATHER_OUTDOOR_BAD : W.WEATHER_OUTDOOR_NICE;
      else if (a.env === 'indoor' && ctx.weather.outdoorHostile) w += W.WEATHER_INDOOR_COZY;
    }

    // In-season and in-region activities are timely/relevant -> a small surfacing bonus.
    if (a.seasons) w += W.TIMELY;
    if (a.regions) w += W.TIMELY;

    // "Nudge me outside" preference (mild; weather hostility still dominates).
    if (ctx.prefs.nudgeOutdoors) {
      if (a.env === 'outdoor')     w += W.NUDGE_OUTDOOR;
      else if (a.env === 'indoor') w += W.NUDGE_INDOOR;
    }

    const st = stats[a.id];
    if (!st || !st.shown) {
      w += W.NOVELTY;
    } else {
      w += (st.liked    || 0) * W.LIKED_PER;
      w += (st.disliked || 0) * W.DISLIKED_PER;
      w -= Math.min(st.shown * W.OVERSHOW_RATE, W.OVERSHOW_CAP);
    }
    return Math.max(w, W.FLOOR);
  },

  // Returns { activity, text } or null if nothing fits.
  generate(constraints, stats = {}, excludeIds = [], now = new Date(), ambient = {}) {
    const ctx = Engine.buildContext(constraints, now, ambient);
    let pool = ACTIVITIES.filter((a) => Engine.feasible(a, constraints, ctx) && !excludeIds.includes(a.id));
    if (!pool.length) pool = ACTIVITIES.filter((a) => Engine.feasible(a, constraints, ctx));
    if (!pool.length) return null;

    const weights = pool.map((a) => Engine.score(a, constraints, ctx, stats));
    const total = weights.reduce((s, x) => s + x, 0);
    let r = Math.random() * total;
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosen = pool[i]; break; }
    }
    return { activity: chosen, text: chosen.text(ctx) };
  },
};
