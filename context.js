// Ambient context acquisition: location, weather, real sunrise/sunset, and real
// nearby places. Everything is OPTIONAL, governed by Settings, and degrades
// gracefully — deny location or go offline and the app falls back to time-of-day.
//
// No API keys anywhere:
//   - weather  -> Open-Meteo
//   - places   -> Overpass API (OpenStreetMap)

const WEATHER_CACHE_KEY = 'unstuck.ctxCache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

const Context = {
  // status: 'idle' | 'off' | 'locating' | 'ready' | 'denied' | 'error'
  state: { status: 'idle', coords: null, weather: null, sun: null, places: [], tz: null, fetchedAt: 0 },
  listeners: [],

  onChange(fn) { Context.listeners.push(fn); },
  emit() { Context.listeners.forEach((fn) => fn(Context.state)); },
  set(patch) { Context.state = { ...Context.state, ...patch }; Context.emit(); },
  isStale() { return Date.now() - Context.state.fetchedAt > CACHE_TTL_MS; },

  // Restore a recent cached reading, then reconcile with current settings.
  init() {
    try {
      const c = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
      if (c && Date.now() - c.fetchedAt < CACHE_TTL_MS) {
        Context.state = {
          status: 'ready', coords: c.coords, weather: c.weather, places: c.places || [], tz: c.tz || null,
          sun: c.sun ? { sunrise: new Date(c.sun.sunrise), sunset: new Date(c.sun.sunset) } : null,
          fetchedAt: c.fetchedAt,
        };
      }
    } catch {}
    Context.apply();
  },

  // Reconcile live context with the current settings (called on boot and on toggle).
  apply() {
    if (Settings.get('useLocation')) {
      if (!Context.state.coords || Context.isStale()) Context.enable({ silent: true });
      else Context.set({ status: 'ready' });
    } else {
      Context.set({ status: 'off', coords: null, weather: null, sun: null, places: [] });
    }
  },

  // Acquire location, then weather + places per settings. User-gesture or silent refresh.
  async enable({ silent = false } = {}) {
    if (!Settings.get('useLocation')) Settings.set('useLocation', true);
    if (!('geolocation' in navigator)) { Context.set({ status: 'error' }); return Context.state; }
    if (!silent) Context.set({ status: 'locating' });
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, maximumAge: 15 * 60 * 1000 })
      );
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const patch = { status: 'ready', coords, fetchedAt: Date.now() };
      if (Settings.get('useWeather')) {
        try { const w = await Context.fetchWeather(coords.lat, coords.lon); patch.weather = w.weather; patch.sun = w.sun; patch.tz = w.tz; }
        catch { patch.weather = null; patch.sun = null; }
      } else { patch.weather = null; }
      if (Settings.get('useNearby')) {
        try { patch.places = await Context.fetchPlaces(coords.lat, coords.lon); }
        catch { patch.places = Context.state.places || []; }
      } else { patch.places = []; }
      Context.set(patch);
      Context.persist();
    } catch (err) {
      Context.set({ status: err && err.code === 1 ? 'denied' : 'error' });
    }
    return Context.state;
  },

  persist() {
    const s = Context.state;
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        coords: s.coords, weather: s.weather, places: s.places, tz: s.tz,
        sun: s.sun ? { sunrise: s.sun.sunrise.toISOString(), sunset: s.sun.sunset.toISOString() } : null,
        fetchedAt: s.fetchedAt,
      }));
    } catch {}
  },

  /* ---------------- weather (Open-Meteo, no key) ---------------- */
  async fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}`
      + `&current=temperature_2m,precipitation,weather_code,wind_speed_10m,is_day`
      + `&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('weather fetch failed');
    const j = await r.json();
    const cur = j.current || {};
    const weather = Context.classify(cur.weather_code, cur.temperature_2m, cur.precipitation, cur.wind_speed_10m, cur.is_day);
    let sun = null;
    if (j.daily && j.daily.sunrise && j.daily.sunset) {
      sun = { sunrise: new Date(j.daily.sunrise[0]), sunset: new Date(j.daily.sunset[0]) };
    }
    return { weather, sun, tz: j.timezone || null };
  },

  classify(code = 0, temp = null, precip = 0, wind = 0, isDay = 1) {
    const wet = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || precip > 0.1;
    const snow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
    const thunder = code >= 95;
    const fog = code === 45 || code === 48;
    const cold = temp !== null && temp <= 2;
    const hot = temp !== null && temp >= 33;
    const windy = wind >= 40;
    const severe = thunder || windy || (snow && precip > 1) || (wet && precip > 4);
    const outdoorHostile = severe || cold || hot || (wet && !severe);
    const labels = {
      0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
      45: 'foggy', 48: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'drizzle',
      61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow',
      75: 'heavy snow', 80: 'rain showers', 81: 'rain showers', 82: 'heavy showers',
      85: 'snow showers', 86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm',
    };
    return { code, temp, label: labels[code] || 'unsettled', wet, snow, thunder, fog, cold, hot, windy, severe, outdoorHostile, isDay: !!isDay };
  },

  /* ---------------- nearby places (Overpass / OSM, no key) ---------------- */
  async fetchPlaces(lat, lon) {
    const la = lat.toFixed(5), lo = lon.toFixed(5);
    const q = `[out:json][timeout:20];(`
      + `node["amenity"~"^(cafe|restaurant|fast_food|bar|pub|library)$"](around:1600,${la},${lo});`
      + `node["shop"~"^(supermarket|convenience|books)$"](around:1600,${la},${lo});`
      + `node["leisure"="park"](around:1600,${la},${lo});`
      + `way["leisure"="park"](around:1600,${la},${lo});`
      + `node["natural"="water"](around:2500,${la},${lo});`
      + `way["natural"="water"](around:2500,${la},${lo});`
      + `way["waterway"](around:2000,${la},${lo});`
      + `);out center tags 80;`;
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q });
    if (!r.ok) throw new Error('places fetch failed');
    const j = await r.json();
    return Context.parsePlaces(j.elements || [], lat, lon);
  },

  kindsFor(tags = {}) {
    const k = [];
    const a = tags.amenity, s = tags.shop, l = tags.leisure, n = tags.natural;
    if (a === 'cafe') k.push('eatery', 'cafe');
    if (a === 'restaurant' || a === 'fast_food' || a === 'bar' || a === 'pub') k.push('eatery');
    if (a === 'library') k.push('library', 'books');
    if (s === 'supermarket' || s === 'convenience') k.push('grocery');
    if (s === 'books') k.push('books');
    if (l === 'park') k.push('park');
    if (n === 'water' || tags.waterway) k.push('water');
    return k;
  },

  parsePlaces(elements, lat, lon) {
    const out = [];
    for (const e of elements) {
      const name = e.tags && e.tags.name;
      if (!name) continue; // only named places are useful for a concrete instruction
      const plat = e.lat ?? (e.center && e.center.lat);
      const plon = e.lon ?? (e.center && e.center.lon);
      if (plat == null || plon == null) continue;
      const kinds = Context.kindsFor(e.tags);
      if (!kinds.length) continue;
      const dist = Context.haversine(lat, lon, plat, plon);
      out.push({ name, kinds, dist, minutes: Math.max(1, Math.round(dist / 80)) }); // ~80 m/min walk
    }
    out.sort((p, q) => p.dist - q.dist);
    return out.slice(0, 40);
  },

  haversine(la1, lo1, la2, lo2) {
    const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
    const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1);
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  },

  summary() {
    const s = Context.state;
    if (s.status === 'locating') return 'reading your surroundings…';
    if (!s.weather) return '';
    const t = s.weather.temp !== null ? ` ${Units.temp(s.weather.temp)}` : '';
    return `${s.weather.label}${t}`;
  },
};
