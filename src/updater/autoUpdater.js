const REPO = 'MeaCore-Enterprise/FlowClow';
const API  = 'https://api.github.com';
const CACHE_KEY       = 'fc_update_v2';
const SNOOZE_KEY      = 'fc_update_snooze';
const CHECK_INTERVAL  = 4 * 60 * 60 * 1000;   // 4 h between network calls
const FETCH_TIMEOUT   = 12_000;                 // 12 s network timeout
const MAX_RETRIES     = 3;
const RETRY_DELAYS    = [2000, 5000, 10000];

// ── Semver helpers ────────────────────────────────────────────────────────────
function parseSemver(v) {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [+m[1], +m[2], +m[3]];
}

export function isNewer(remote, local) {
  const [rMa, rMi, rPa] = parseSemver(remote);
  const [lMa, lMi, lPa] = parseSemver(local);
  if (rMa !== lMa) return rMa > lMa;
  if (rMi !== lMi) return rMi > lMi;
  return rPa > lPa;
}

// ── Storage helpers ───────────────────────────────────────────────────────────
function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

function readSnooze() {
  try { return +localStorage.getItem(SNOOZE_KEY) || 0; } catch { return 0; }
}

function writeSnooze(ts) {
  try { localStorage.setItem(SNOOZE_KEY, String(ts)); } catch {}
}

// ── Fetch with timeout + retry ────────────────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status}`);
      throw new Error(`HTTP ${res.status} – retrying`);
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] ?? 10000));
    }
  }
}

// ── Find best APK asset from a release ───────────────────────────────────────
function findApk(release) {
  if (!Array.isArray(release?.assets)) return null;
  return (
    release.assets.find(a => a.name.includes('debug') && a.name.endsWith('.apk')) ||
    release.assets.find(a => !a.name.includes('unsigned') && a.name.endsWith('.apk')) ||
    release.assets.find(a => a.name.endsWith('.apk')) ||
    null
  );
}

// ── AutoUpdater (EventTarget-based) ──────────────────────────────────────────
class AutoUpdater extends EventTarget {
  constructor() {
    super();
    this._state = {
      status: 'idle',       // idle | checking | up-to-date | available | installing | error
      release:   null,
      apkAsset:  null,
      error:     null,
      lastChecked: 0,
      currentVersion: '1.0.1',
    };
    this._checkTimer = null;
  }

  get state() { return { ...this._state }; }

  _set(patch) {
    this._state = { ...this._state, ...patch };
    this.dispatchEvent(new CustomEvent('change', { detail: this._state }));
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Start background checks. Call once when app is ready. */
  start(currentVersion) {
    if (currentVersion) this._set({ currentVersion });
    this._scheduleCheck();
  }

  /** Force a fresh network check regardless of cache/snooze. */
  async forceCheck() {
    return this._doCheck({ force: true });
  }

  /** Check with cache — will skip network if recent enough. */
  async check() {
    return this._doCheck({ force: false });
  }

  /** Open system download/install flow for the latest APK. */
  install() {
    const { apkAsset } = this._state;
    if (!apkAsset?.browser_download_url) return;
    this._set({ status: 'installing' });
    try {
      window.open(apkAsset.browser_download_url, '_system');
    } catch {
      window.location.href = apkAsset.browser_download_url;
    }
  }

  /** Dismiss update for 24 hours. */
  snooze(hours = 24) {
    writeSnooze(Date.now() + hours * 60 * 60 * 1000);
    this._set({ status: 'idle' });
  }

  /** Clear all caches for testing. */
  reset() {
    try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem(SNOOZE_KEY); } catch {}
    this._set({ status: 'idle', release: null, apkAsset: null, error: null });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _scheduleCheck() {
    // First check: 4 seconds after start (let app paint first)
    setTimeout(() => {
      this._doCheck({ force: false });
      // Repeat every CHECK_INTERVAL while app is open
      this._checkTimer = setInterval(() => this._doCheck({ force: false }), CHECK_INTERVAL);
    }, 4000);
  }

  async _doCheck({ force }) {
    const now = Date.now();

    // Respect snooze unless forced
    if (!force && readSnooze() > now) {
      this._set({ status: 'idle' });
      return this._state;
    }

    // Use fresh cache if available and not forced
    const cache = readCache();
    if (!force && cache && (now - cache.checkedAt) < CHECK_INTERVAL) {
      return this._applyRelease(cache.release, cache.checkedAt);
    }

    this._set({ status: 'checking', error: null });

    try {
      const res = await fetchWithRetry(`${API}/repos/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      const release = await res.json();
      writeCache({ release, checkedAt: now });
      return this._applyRelease(release, now);
    } catch (err) {
      const msg = err.name === 'AbortError' ? 'Tiempo de espera agotado' : err.message;
      this._set({ status: 'error', error: msg, lastChecked: now });
      return this._state;
    }
  }

  _applyRelease(release, checkedAt) {
    const { currentVersion } = this._state;
    const apkAsset = findApk(release);

    if (release && apkAsset && isNewer(release.tag_name, currentVersion)) {
      this._set({ status: 'available', release, apkAsset, lastChecked: checkedAt, error: null });
    } else {
      this._set({ status: 'up-to-date', release, apkAsset: null, lastChecked: checkedAt, error: null });
    }
    return this._state;
  }
}

export const autoUpdater = new AutoUpdater();
export default autoUpdater;
