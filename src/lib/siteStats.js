import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase.js';
import { shopNow } from './hours.js';

/* =============================================================================
   First-party, cookieless, aggregate-only site stats.

   WHY THIS RUNS WITHOUT THE CONSENT BANNER
   GA4 (src/lib/analytics.js) needs consent because it sets cookies and
   profiles a visitor across visits. This doesn't do either. What leaves the
   browser is only "add 1 to (today, event, key)", e.g. (2026-10-19,
   'page_view', '/menu'). Nothing else is stored or sent:
     - no IP address (the database function never reads or keeps one),
     - no user agent / browser / device details,
     - no visitor id, session id or fingerprint, so visits can't be linked,
     - no cookies, and no localStorage / sessionStorage for this at all,
     - no free text: event names are a fixed list (STAT_EVENTS), and each key
       is a page from a fixed list or a short token like 'fox_quiz'.
   A count of how many times the Menu page was opened today isn't personal
   data about anyone, so no consent is needed to keep it (ePrivacy only
   gates storing/reading things on the visitor's device, which this doesn't
   do). docs/INTEGRATIONS.md · "Site stats" says the same for the owners.

   Mechanics: events wait in memory and go up in one request at most every
   FLUSH_MS, and on page hide through navigator.sendBeacon (or a keepalive
   fetch). Everything fails silently. Nothing is sent from /admin, from the
   editor's canvas iframe, by automated browsers (navigator.webdriver), or
   when Supabase isn't configured. Before the migration runs the requests
   simply fail and nothing changes for visitors.
   ============================================================================= */

export const FLUSH_MS = 4000;
const MAX_BATCH = 50;

/* The public pages, as they're counted. Anything else is '/other', so a typo
   URL can never become its own row. */
export const STAT_PAGES = [
  '/', '/menu', '/about', '/events', '/location', '/contact', '/timeline', '/reviews',
  '/gallery-wall', '/troublemakers', '/neighborhood', '/gift-cards', '/privacy', '/accessibility',
];

/* A short plain token or 'other' (never names, titles or free text). */
const token = (v, fallback = '') => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  return /^[a-z0-9_-]{1,40}$/.test(s) ? s : 'other';
};

/** The page a path is counted as: one of STAT_PAGES, or '/other'. */
export function statPath(pathname) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  let p = String(pathname || '/').split(/[?#]/)[0];
  if (base && p.startsWith(base)) p = p.slice(base.length) || '/';
  p = p.replace(/\/+$/, '').toLowerCase() || '/';
  return STAT_PAGES.includes(p) ? p : '/other';
}

/** Where an Order click came from, in the dashboard's buckets. */
export function orderSource(location, path) {
  const l = String(location || '').toLowerCase();
  if (l === 'fox_quiz') return 'fox_quiz';
  if (l === 'fox') return 'surprise'; // the Surprise me pane's Order link
  if (l === 'fox_usual') return 'fox_usual';
  if (l.includes('pairing')) return 'pairings';
  if (l.startsWith('nav')) return 'nav';
  if (path === '/') return 'home';
  if (path === '/menu' || /^(menu|product_card|food_shelf)/.test(l)) return 'menu';
  return 'other';
}

/* The ONLY events counted, and the one small key each may carry. Keep in
   step with the whitelist in increment_stat() (the migration). */
export const STAT_EVENTS = {
  page_view: (p) => statPath(p.path),
  order_now_click: (p, path) => orderSource(p.location, path),
  fox_open: () => '',
  fox_question: (p) => token(p.question, 'other'), // 'quiz' = quiz started, 'surprise' = Surprise me
  fox_quiz_done: () => '',
  fox_surprise_again: () => '',
  poll_vote: () => '',
  gift_card_click: (p) => token(p.location),
  add_to_calendar: (p) => token(p.method),
  share_event: () => '', // "Text a friend" on an event
  menu_view: () => '',
  form_submit: (p) => token(p.form),
  directions_click: () => '',
  newsletter_signup: () => '',
  outbound_click: (p) => token(p.dest),
  specials_click: () => '',
  rainy_order: (p) => token(p.kind),
};

/* ---- may we count at all? ---------------------------------------------------- */
function currentPath() {
  try {
    return statPath(window.location.pathname);
  } catch {
    return '/other';
  }
}

export function statsAllowed() {
  if (!isSupabaseConfigured || typeof window === 'undefined') return false;
  try {
    if (window.navigator?.webdriver) return false; // automated browsers / most bots
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const raw = window.location.pathname;
    const p = base && raw.startsWith(base) ? raw.slice(base.length) : raw;
    if (/^\/admin(\/|$)/.test(p)) return false;
    if (window.self !== window.top || new URLSearchParams(window.location.search).has('canvas')) return false;
    return true;
  } catch {
    return false;
  }
}

/* ---- the in-memory queue ------------------------------------------------------ */
const queue = new Map(); // `${day}|${event}|${key}` → n
let timer = 0;
let listening = false;

/** Count one event (no-op unless it's whitelisted and we may count). */
export function recordStat(name, params = {}) {
  try {
    const keyOf = STAT_EVENTS[name];
    if (!keyOf || !statsAllowed()) return;
    const key = String(keyOf(params || {}, currentPath()) ?? '').slice(0, 80);
    const day = shopNow().isoDate;
    const id = `${day}|${name}|${key}`;
    queue.set(id, (queue.get(id) || 0) + 1);
    listen();
    if (!timer) timer = setTimeout(() => flushStats(), FLUSH_MS);
  } catch {
    /* stats never break the page */
  }
}

/** The queued counts as the batch body, and empty the queue. */
function drain() {
  const rows = [];
  for (const [id, n] of queue) {
    const [d, e, k] = id.split('|');
    rows.push({ d, e, k, n: Math.min(n, 20) });
    if (rows.length >= MAX_BATCH) break;
  }
  for (const r of rows) queue.delete(`${r.d}|${r.e}|${r.k}`);
  return rows;
}

const endpoint = () => `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/increment_stats`;

/** Send what's queued. `beacon` (page hide) prefers navigator.sendBeacon. */
export function flushStats({ beacon = false } = {}) {
  clearTimeout(timer);
  timer = 0;
  if (!queue.size || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  const rows = drain();
  if (queue.size) timer = setTimeout(() => flushStats(), FLUSH_MS); // more than one batch's worth
  const body = JSON.stringify(rows);
  try {
    // text/plain is what sendBeacon can send cross-origin without a preflight;
    // increment_stats(text) takes the raw body. The key rides in the query
    // because a beacon can't set headers.
    if (beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(`${endpoint()}?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`, new Blob([body], { type: 'text/plain' }));
      if (ok) return;
    }
    if (typeof fetch !== 'function') return;
    const headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'text/plain' };
    if (SUPABASE_ANON_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    fetch(endpoint(), { method: 'POST', headers, body, keepalive: true, credentials: 'omit' }).catch(() => {});
  } catch {
    /* silent */
  }
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const bye = () => flushStats({ beacon: true });
  window.addEventListener('pagehide', bye);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') bye(); });
}

/** Tests only: forget anything queued. */
export function _resetStatsForTests() {
  queue.clear();
  clearTimeout(timer);
  timer = 0;
}
export const _queuedForTests = () => [...queue.entries()];
