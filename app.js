// UI wiring + on-device feedback store (v2). Still no accounts; the only network
// call is the optional, key-less weather lookup in context.js.
// Loop: constraints (+ ambient context) -> ONE action -> (limited reroll) -> feedback -> repeat.

const REROLL_LIMIT = 3;
const STORE_KEY = 'unstuck.v1';
const PREFS_KEY = 'unstuck.lastConstraints';

/* ---------------- on-device store ---------------- */
const EMPTY_TALLIES = () => ({ 'done-good': 0, 'done-meh': 0, 'skip': 0 });
const Store = {
  read() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      // Backfill any missing top-level shapes so older saves stay valid.
      return { stats: d.stats || {}, log: d.log || [], tallies: { ...EMPTY_TALLIES(), ...(d.tallies || {}) }, liked: d.liked || [] };
    }
    catch { return { stats: {}, log: [], tallies: EMPTY_TALLIES(), liked: [] }; }
  },
  write(data) { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {} },
  stats() { return Store.read().stats; },
  tallies() { return Store.read().tallies; },
  liked() { return Store.read().liked; },
  bump(id, field) {
    const d = Store.read();
    const s = (d.stats[id] = d.stats[id] || { shown: 0, liked: 0, disliked: 0, completed: 0 });
    s[field] = (s[field] || 0) + 1;
    s.lastTs = Date.now();
    Store.write(d);
  },
  // Count a tracked feedback tap, and remember "did it" activities so they're revisitable.
  recordTap(kind, id, text) {
    const d = Store.read();
    d.tallies[kind] = (d.tallies[kind] || 0) + 1;
    if (kind === 'done-good' && id) {
      const existing = d.liked.find((x) => x.id === id);
      if (existing) { existing.count += 1; existing.lastTs = Date.now(); if (text) existing.text = text; }
      else { d.liked.push({ id, text: text || '', count: 1, lastTs: Date.now() }); }
    }
    Store.write(d);
  },
  logEvent(entry) {
    const d = Store.read();
    d.log.push({ ts: Date.now(), ...entry });
    if (d.log.length > 300) d.log = d.log.slice(-300);
    Store.write(d);
  },
};

/* ---------------- session state ---------------- */
const session = { current: null, shownIds: [], rerolls: REROLL_LIMIT, constraints: null };

const el = (id) => document.getElementById(id);
const homeView = el('home');
const resultView = el('result');
const settingsView = el('settings');
const statsView = el('stats');
const cog = el('cog');

/* ---------------- constraints <-> UI ---------------- */
function readConstraints() {
  const c = {};
  document.querySelectorAll('#tune .field[data-key]').forEach((f) => {
    const on = f.querySelector('.chip.is-on');
    c[f.dataset.key] = on ? on.dataset.val : undefined;
  });
  c.stuck = el('stuck').value.trim();
  return {
    energy: c.energy || 'medium',
    time: c.time || 'flexible',
    budget: c.budget || 'flexible',
    social: c.social || 'either',
    vibe: c.vibe || 'undefined',
    reach: c.reach || 'flexible',
    stuck: c.stuck,
  };
}

function applyConstraints(c) {
  if (!c) return;
  document.querySelectorAll('#tune .field[data-key]').forEach((f) => {
    const val = c[f.dataset.key];
    if (val == null) return;
    f.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('is-on', chip.dataset.val === val));
  });
}

function persistConstraints(c) {
  try {
    const { stuck, ...rest } = c; // don't persist the free-text "stuck" note
    localStorage.setItem(PREFS_KEY, JSON.stringify(rest));
  } catch {}
}
function restoreConstraints() {
  try {
    const c = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (c) applyConstraints(c);
  } catch {}
}

/* ---------------- views ---------------- */
function showHome() {
  resultView.hidden = true;
  settingsView.hidden = true;
  statsView.hidden = true;
  homeView.hidden = false;
  cog.hidden = false;
  el('feedback').hidden = true;
  window.scrollTo(0, 0);
}

function openSettings() {
  homeView.hidden = true;
  resultView.hidden = true;
  statsView.hidden = true;
  settingsView.hidden = false;
  cog.hidden = true;
  syncSettingsUI();
  window.scrollTo(0, 0);
}

function openStats() {
  homeView.hidden = true;
  resultView.hidden = true;
  settingsView.hidden = true;
  statsView.hidden = false;
  cog.hidden = true;
  renderStats();
  window.scrollTo(0, 0);
}

function present(result) {
  if (!result) {
    // Dead-end: nothing fit. Offer the only escape hatch (back to start) here —
    // every *real* suggestion still requires a tracked feedback tap to leave.
    el('action').textContent = "Nothing fit those exact constraints right now. Loosen one — time, budget, or how far you'll go — and try again.";
    el('feedback').hidden = true;
    el('reroll').disabled = true;
    el('empty-back').hidden = false;
  } else {
    session.current = result;
    session.shownIds.push(result.activity.id);
    Store.bump(result.activity.id, 'shown');
    el('action').textContent = result.text;
    el('feedback').hidden = false;
    el('reroll').disabled = session.rerolls <= 0;
    el('empty-back').hidden = true;
  }
  el('reroll-count').textContent = session.rerolls > 0 ? `(${session.rerolls})` : '';
  homeView.hidden = true;
  settingsView.hidden = true;
  statsView.hidden = true;
  resultView.hidden = false;
  cog.hidden = false;
  window.scrollTo(0, 0);
}

// Ambient context + live preferences handed to the engine each generation.
function ambient() {
  return { ...Context.state, prefs: { nudgeOutdoors: Settings.get('nudgeOutdoors') } };
}

/* ---------------- actions ---------------- */
function generateFresh() {
  const constraints = readConstraints();
  session.constraints = constraints;
  session.shownIds = [];
  session.rerolls = REROLL_LIMIT;
  persistConstraints(constraints);
  present(Engine.generate(constraints, Store.stats(), [], new Date(), ambient()));
}

function reroll() {
  if (session.rerolls <= 0) return;
  session.rerolls -= 1;
  present(Engine.generate(session.constraints, Store.stats(), session.shownIds, new Date(), ambient()));
}

function giveFeedback(kind) {
  const cur = session.current;
  const id = cur && cur.activity.id;
  if (id) {
    if (kind === 'done-good') { Store.bump(id, 'completed'); Store.bump(id, 'liked'); }
    else if (kind === 'done-meh') { Store.bump(id, 'completed'); }
    else if (kind === 'skip') { Store.bump(id, 'disliked'); }
    Store.recordTap(kind, id, cur.text);
    Store.logEvent({ id, kind, constraints: session.constraints, weather: Context.state.weather && Context.state.weather.label });
  }
  showHome();
}

/* ---------------- stats / reflection ---------------- */
function renderStats() {
  const t = Store.tallies();
  el('tally-good').textContent = t['done-good'] || 0;
  el('tally-meh').textContent = t['done-meh'] || 0;
  el('tally-skip').textContent = t['skip'] || 0;

  const liked = Store.liked().slice().sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  const list = el('liked-list');
  list.textContent = ''; // clear
  if (!liked.length) {
    const empty = document.createElement('p');
    empty.className = 'liked-empty';
    empty.textContent = 'Nothing here yet. When you tap “👍 Did it”, that activity lands here so you can do it again.';
    list.appendChild(empty);
    return;
  }
  liked.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'liked-item';
    const txt = document.createElement('p');
    txt.className = 'liked-text';
    txt.textContent = item.text || item.id; // textContent: no HTML injection
    row.appendChild(txt);
    if (item.count > 1) {
      const badge = document.createElement('span');
      badge.className = 'liked-badge';
      badge.textContent = `did it ×${item.count}`;
      row.appendChild(badge);
    }
    list.appendChild(row);
  });
}

/* ---------------- greeting + context line ---------------- */
function setGreeting() {
  const dp = Engine.daypart(new Date(), Context.state.sun);
  el('greeting').textContent = {
    day: "Stuck? Let's get you moving.",
    evening: "Evening slump? One small thing.",
    night: "Can't settle? Try one quiet thing.",
  }[dp];
}

function renderContext(state) {
  const btn = el('ctx');
  if (state.status === 'ready' && state.weather) {
    const w = state.weather;
    const dp = Engine.daypart(new Date(), state.sun);
    btn.textContent = `${dp === 'night' ? '🌙' : '📍'} ${dp} · ${Context.summary()}`;
    btn.classList.add('is-on');
    btn.disabled = false;
  } else if (state.status === 'locating') {
    btn.textContent = '📍 reading your surroundings…';
    btn.disabled = true;
  } else if (state.status === 'denied') {
    btn.textContent = '📍 location off — using time of day';
    btn.classList.remove('is-on');
    btn.disabled = false;
  } else if (state.status === 'error') {
    btn.textContent = '📍 couldn’t read your surroundings — tap to retry';
    btn.classList.remove('is-on');
    btn.disabled = false;
  } else {
    // 'off' or 'idle' — location not enabled
    btn.textContent = '📍 tap to use location & weather';
    btn.classList.remove('is-on');
    btn.disabled = false;
  }
  setGreeting();
}

/* ---------------- settings ---------------- */
const SUB_TOGGLES = ['useWeather', 'useNearby']; // these only matter with location on

function syncSettingsUI() {
  const locOn = Settings.get('useLocation');
  ['useLocation', 'useWeather', 'useNearby', 'nudgeOutdoors'].forEach((k) => {
    const box = el(`set-${k}`);
    if (box) box.checked = !!Settings.get(k);
  });
  SUB_TOGGLES.forEach((k) => {
    const box = el(`set-${k}`);
    const row = document.querySelector(`.set-row[data-set="${k}"]`);
    if (box) box.disabled = !locOn;
    if (row) row.classList.toggle('is-disabled', !locOn);
  });
  // segmented unit controls
  ['tempUnit', 'units'].forEach((k) => {
    const val = Settings.get(k);
    document.querySelectorAll(`.seg[data-set="${k}"] .seg-btn`).forEach((b) => {
      b.classList.toggle('is-on', b.dataset.val === val);
    });
  });
}

function setUnit(key, val) {
  Settings.set(key, val);
  syncSettingsUI();
  renderContext(Context.state); // refresh the temperature on the context pill live
}

function onToggle(key, checked) {
  Settings.set(key, checked);
  Context.apply();      // re-acquire or clear context to match the new setting
  syncSettingsUI();
}

function clearData() {
  if (!window.confirm('Clear all saved data — feedback history, settings, and cached weather? This cannot be undone.')) return;
  try { localStorage.clear(); } catch {}
  Settings.reset();
  Context.set({ status: 'off', coords: null, weather: null, sun: null, places: [], fetchedAt: 0 });
  syncSettingsUI();
}

// Settings already apply live (so location/weather react immediately); Save makes the
// commit explicit and reassuring. We re-persist the current settings, then confirm.
function saveSettings() {
  try { localStorage.setItem(Settings.KEY, JSON.stringify(Settings.all())); } catch {}
  showToast('Settings saved ✓');
}

let toastTimer = null;
function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.hidden = false;
  // reflow so the transition replays even on back-to-back saves
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { t.hidden = true; }, 250);
  }, 1700);
}

/* ---------------- event binding ---------------- */
function bind() {
  el('go').addEventListener('click', generateFresh);
  el('reroll').addEventListener('click', reroll);
  el('empty-back').addEventListener('click', showHome);
  el('ctx').addEventListener('click', openSettings);
  el('cog').addEventListener('click', openSettings);
  el('settings-close').addEventListener('click', showHome);
  el('open-stats').addEventListener('click', openStats);
  el('stats-close').addEventListener('click', openSettings);
  el('save-settings').addEventListener('click', saveSettings);
  el('clear-data').addEventListener('click', clearData);

  document.querySelectorAll('.seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (btn) setUnit(seg.dataset.set, btn.dataset.val);
    });
  });

  ['useLocation', 'useWeather', 'useNearby', 'nudgeOutdoors'].forEach((k) => {
    el(`set-${k}`).addEventListener('change', (e) => onToggle(k, e.target.checked));
  });

  el('toggle-tune').addEventListener('click', (e) => {
    const tune = el('tune');
    const open = tune.hidden;
    tune.hidden = !open;
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('#tune .field[data-key] .chips').forEach((group) => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-on'));
      chip.classList.add('is-on');
    });
  });

  document.querySelectorAll('#feedback .fb').forEach((b) => {
    b.addEventListener('click', () => giveFeedback(b.dataset.fb));
  });
}

/* ---------------- boot ---------------- */
Context.onChange(renderContext);
Context.init();        // restores cached weather / silently refreshes if previously allowed
restoreConstraints();  // one-tap reopen with your last settings
renderContext(Context.state);
bind();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
