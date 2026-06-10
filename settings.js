// User settings — the source of truth for which optional context features are on.
// Persisted on-device; no network, no accounts.
const Settings = {
  KEY: 'unstuck.settings',
  defaults: {
    useLocation: false,   // master switch for anything location-based
    useWeather: true,     // weather-aware suggestions (needs location)
    useNearby: true,      // name real nearby places (needs location)
    nudgeOutdoors: false, // bias suggestions toward getting outside
    tempUnit: 'C',        // 'C' | 'F'  — world-standard default (US users can flip)
    units: 'metric',      // 'metric' | 'imperial'
  },
  cache: null,
  listeners: [],

  all() {
    if (!this.cache) {
      try { this.cache = { ...this.defaults, ...JSON.parse(localStorage.getItem(this.KEY) || '{}') }; }
      catch { this.cache = { ...this.defaults }; }
    }
    return this.cache;
  },
  get(k) { return this.all()[k]; },
  set(k, v) {
    const a = this.all();
    a[k] = v;
    this.cache = a;
    try { localStorage.setItem(this.KEY, JSON.stringify(a)); } catch {}
    this.listeners.forEach((fn) => fn(k, v, a));
  },
  onChange(fn) { this.listeners.push(fn); },
  reset() {
    this.cache = { ...this.defaults };
    try { localStorage.removeItem(this.KEY); } catch {}
  },
};
