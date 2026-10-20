import { supabase, isSupabaseConfigured } from './supabase.js';
import { shopNow } from './hours.js';

/* "Make a wish for the menu" — the rules behind the fox's wish list
   (src/components/FoxWish.jsx) and the admin Wish list
   (src/admin/managers/WishList.jsx). Pure functions where possible, all
   tested in test/wishes.test.jsx.

   Anti-spam is layered and invisible to real people:
     client (here)  — a honeypot field, ~3s minimum on the form, one wish per
                      browser per shop day, no links / emails / phone numbers,
                      a small built-in rude-word list, and a gibberish check
                      (no vowels, a character 6+ times in a row, mostly
                      symbols). Whitespace is trimmed and collapsed first.
     server         — submit_wish() (supabase/migrations/2026-10-19-wishes.sql)
                      is the ONLY way the public can write: it re-checks the
                      lengths, the category list and links, rate-limits by a
                      hashed random browser token (never an IP) and globally,
                      and quietly de-dupes the same wish from the same browser.
   A wish holds no contact details at all: category, words, an optional
   "why" and an optional first name. */

export const CATEGORIES = [
  { id: 'drink', label: 'Drink', placeholder: 'A maple oat latte…' },
  { id: 'pastry', label: 'Pastry & treats', placeholder: 'A pistachio croissant…' },
  { id: 'food', label: 'Food', placeholder: 'A caprese panini…' },
  { id: 'other', label: 'Something else', placeholder: 'A board-game night…' },
];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Something else';

export const LIMITS = { text: 80, why: 140, name: 30 };
export const MIN_FORM_MS = 3000;

export const STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'considering', label: 'Considering' },
  { id: 'added', label: 'Added to menu' },
  { id: 'not_now', label: 'Not now' },
  { id: 'hidden', label: 'Hidden (spam)' },
];
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label || 'New';

/* ---- cleaning and checks ------------------------------------------------- */

/** Trim, drop control characters, collapse runs of whitespace. */
export function cleanText(s) {
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

const TLDS = 'com|net|org|io|co|xyz|ru|info|biz|me|ly|app|shop|site|online|top|us|uk|gg|tv|link|click';
const LINK = new RegExp(`(https?:|www\\.|\\b[a-z0-9-]+\\.(?:${TLDS})\\b)`, 'i');
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

export const hasLink = (s) => LINK.test(String(s || ''));
export const hasEmail = (s) => EMAIL.test(String(s || '')) || /@\w/.test(String(s || ''));
/** Seven or more digits in a phone-ish run ("856 555 0199", "+1 (856)…"). */
export function hasPhone(s) {
  const runs = String(s || '').match(/\+?\d[\d\s().-]{5,}\d/g) || [];
  return runs.some((r) => r.replace(/\D/g, '').length >= 7);
}

/* A deliberately small list. Whole words only (so "cocktail", "Scunthorpe"
   and a mis-spelled "shitake" are fine); `*` marks a stem that takes any
   ending ("fucking"). Leetspeak is folded first (sh1t, @ss). */
const RUDE = [
  'fuck*', 'shit', 'shits', 'shitty', 'bullshit', 'bitch*', 'cunt*', 'dick', 'dicks', 'dickhead', 'cock', 'cocks',
  'pussy', 'asshole*', 'arsehole*', 'bastard*', 'slut*', 'whore*', 'fag', 'fags', 'faggot*', 'nigger*', 'nigga*',
  'retard*', 'twat*', 'wank*', 'piss', 'pissed', 'porn*', 'nazi*', 'rape*', 'kys',
];
const RUDE_RE = new RegExp(`\\b(?:${RUDE.map((w) => (w.endsWith('*') ? `${w.slice(0, -1)}\\w*` : w)).join('|')})\\b`, 'i');
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };

export function isRude(s) {
  const plain = String(s || '').toLowerCase();
  const folded = plain.replace(/[013457@$!]/g, (c) => LEET[c] || c);
  return RUDE_RE.test(plain) || RUDE_RE.test(folded);
}

/** Keyboard-mash and filler: a character 6+ times in a row, no vowels at
    all, a long word with none, too few letters, or mostly symbols. */
export function isGibberish(s) {
  const t = String(s || '').toLowerCase();
  if (/(.)\1{5,}/.test(t)) return true;
  const letters = t.replace(/[^a-z]/g, '');
  if (letters.length < 3) return true;
  if (!/[aeiouy]/.test(letters)) return true;
  if (t.split(/\s+/).some((w) => w.replace(/[^a-z]/g, '').length >= 7 && !/[aeiouy]/.test(w))) return true;
  const visible = t.replace(/\s/g, '');
  return letters.length / Math.max(1, visible.length) < 0.6;
}

/**
 * Check a wish before it goes in the hat.
 *   { ok: true, wish } — cleaned and ready
 *   { ok: false, silent: true } — a bot signal: pretend it worked, send nothing
 *   { ok: false, field, code, message } — a gentle hint for a real person
 */
export function checkWish({ category, text, why = '', name = '', honeypot = '', elapsedMs = Infinity } = {}) {
  if (cleanText(honeypot)) return { ok: false, silent: true, code: 'honeypot' };
  if (!(elapsedMs >= MIN_FORM_MS)) return { ok: false, silent: true, code: 'too-fast' };
  const wish = {
    category: CATEGORY_IDS.includes(category) ? category : 'other',
    text: cleanText(text).slice(0, LIMITS.text),
    why: cleanText(why).slice(0, LIMITS.why),
    name: cleanText(name).slice(0, LIMITS.name),
  };
  const fields = [['text', wish.text], ['why', wish.why], ['name', wish.name]];
  if (!wish.text) return { ok: false, field: 'text', code: 'empty', message: 'Tell the fox what you’re wishing for.' };
  for (const [field, v] of fields) {
    if (v && (hasLink(v) || hasEmail(v) || hasPhone(v))) {
      return { ok: false, field, code: 'contact', message: 'The hat only takes menu wishes: no links, emails or phone numbers, please.' };
    }
  }
  for (const [field, v] of fields) {
    if (v && isRude(v)) return { ok: false, field, code: 'rude', message: 'Let’s keep it sweet. Try different words?' };
  }
  if (isGibberish(wish.text)) return { ok: false, field: 'text', code: 'gibberish', message: 'Hmm, the fox couldn’t read that one. A few real words?' };
  if (wish.why && /(.)\1{5,}/.test(wish.why)) return { ok: false, field: 'why', code: 'gibberish', message: 'Hmm, the fox couldn’t read that one. A few real words?' };
  if (wish.name && (!/[a-z]/i.test(wish.name) || /(.)\1{3,}/.test(wish.name))) {
    return { ok: false, field: 'name', code: 'gibberish', message: 'Just a first name is perfect (or leave it blank).' };
  }
  return { ok: true, wish };
}

/* ---- one wish a day, per browser ----------------------------------------- */
const DAY_KEY = 'tb-wish-day';
const TOKEN_KEY = 'tb-wish-token';

const local = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* private mode: fine */ } },
};

/** True if this browser already made today's wish (the shop's calendar day). */
export function wishedToday(now = new Date()) {
  return local.get(DAY_KEY) === shopNow(now).isoDate;
}
export function markWished(now = new Date()) {
  local.set(DAY_KEY, shopNow(now).isoDate);
}

/** A random id kept in this browser, only ever used (hashed, server side)
    to rate-limit. It identifies nobody. */
export function browserToken() {
  let t = local.get(TOKEN_KEY);
  if (t && /^[a-z0-9-]{16,64}$/i.test(t)) return t;
  try {
    t = window.crypto?.randomUUID?.() || null;
  } catch { t = null; }
  if (!t) t = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
  local.set(TOKEN_KEY, t);
  return t;
}

/** Sends a checked wish. Always resolves: before the migration runs (or on
    any error) the hat still eats the wish; developers get a console note. */
export async function sendWish(wish, { client = supabase, configured = isSupabaseConfigured } = {}) {
  if (!configured || !client) return { sent: false, reason: 'not-configured' };
  try {
    const { data, error } = await client.rpc('submit_wish', {
      p_category: wish.category,
      p_text: wish.text,
      p_why: wish.why || null,
      p_first_name: wish.name || null,
      p_token: browserToken(),
    });
    if (error) throw error;
    return { sent: true, result: data };
  } catch (err) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[wishes] submit_wish failed; the visitor still got their thank-you.', err?.message || err);
    }
    return { sent: false, reason: 'error' };
  }
}

/* ---- the fox's reply ----------------------------------------------------- */

/** "a Lavender Honey Latte" / "an oat cortado" / "the old scones back". */
export function withArticle(text) {
  const t = cleanText(text).replace(/[.!?…]+$/, '');
  if (!t) return 'that';
  if (/^(a|an|the|some|more|any|my|our|your|\d)\b/i.test(t)) return t;
  return `${/^[aeiou]/i.test(t) ? 'an' : 'a'} ${t}`;
}

export const REPLIES = [
  (w) => `Ooh, ${withArticle(w)}? I’ll slip it to Tom and Cat.`,
  (w) => `${withArticle(w).replace(/^./, (c) => c.toUpperCase())}. Now that’s a wish worth keeping.`,
  () => 'Noted, folded and safely under my hat. Tom and Cat read every one.',
  () => 'A fine wish. I’ll keep it warm under my hat till Tom and Cat come by.',
];

/** One of the replies, picked by `rand` (injectable for tests). Wishes that
    aren't a thing you could order get one of the general lines. */
export function foxReply(wish, rand = Math.random) {
  const orderable = wish?.category !== 'other';
  const pool = orderable ? REPLIES : REPLIES.slice(2);
  return pool[Math.floor(rand() * pool.length) % pool.length](wish?.text || '');
}

/* ---- the admin side: grouping similar wishes ----------------------------- */

const STOP = new Set(['a', 'an', 'the', 'some', 'any', 'more', 'please', 'pls', 'with', 'and', 'or', 'of', 'i', 'id', 'we', 'you',
  'want', 'wish', 'would', 'love', 'like', 'to', 'have', 'could', 'can', 'add', 'make', 'bring', 'back', 'new', 'your', 'our',
  'my', 'for', 'on', 'in', 'it', 'be', 'that', 'this', 'just', 'really', 'so', 'very', 'option', 'options', 'menu', 'maybe']);

/** "Lattes!" → "latte", "pastries" → "pastry", "glass" stays. */
export function singular(w) {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
  return w;
}

/** The words that matter in a wish, normalised: lowercase, no punctuation,
    no filler, singular. */
export function wishTokens(text) {
  const words = String(text || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    const s = singular(w);
    if (!STOP.has(w) && !STOP.has(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

const jaccard = (a, b) => {
  if (!a.length || !b.length) return 0;
  const inter = a.filter((x) => b.includes(x)).length;
  return inter / (a.length + b.length - inter);
};

const titleCase = (s) => s.replace(/\b([a-z])/g, (c) => c.toUpperCase());

/**
 * Groups wishes that ask for the same thing ("lavender latte", "Lavender
 * lattes please!", "iced lavender latte") by token overlap. Returns groups
 * sorted most-wished first: { key, label, count, ids, category, latest }.
 * Hidden (spam) wishes are left out.
 */
export function groupWishes(wishes = [], { threshold = 0.5 } = {}) {
  const groups = [];
  const sorted = [...wishes].filter((w) => w && w.status !== 'hidden')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  for (const w of sorted) {
    const tokens = wishTokens(w.text);
    if (!tokens.length) continue;
    let best = null;
    let bestScore = 0;
    for (const g of groups) {
      const score = jaccard(tokens, g.tokens);
      if (score > bestScore) { best = g; bestScore = score; }
    }
    if (best && bestScore >= threshold) {
      best.members.push(w);
      best.tokens = best.tokens.length <= tokens.length ? best.tokens : tokens; // keep the plainest phrasing
    } else {
      groups.push({ tokens, members: [w] });
    }
  }
  return groups.map((g) => {
    const counts = {};
    g.members.forEach((m) => { counts[m.category] = (counts[m.category] || 0) + 1; });
    const category = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const latest = g.members.reduce((t, m) => (String(m.created_at) > t ? String(m.created_at) : t), '');
    return {
      key: g.tokens.join(' '),
      label: titleCase(g.tokens.join(' ')),
      count: g.members.length,
      ids: g.members.map((m) => m.id),
      category,
      latest,
    };
  }).sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));
}

/** { drink: n, pastry: n, food: n, other: n } over the last `days` days. */
export function countByCategory(wishes = [], { now = new Date(), days = 30 } = {}) {
  const since = now.getTime() - days * 86400000;
  const out = Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0]));
  for (const w of wishes) {
    if (!w || w.status === 'hidden') continue;
    const t = new Date(w.created_at).getTime();
    if (Number.isFinite(t) && t >= since && t <= now.getTime() + 60000) out[CATEGORY_IDS.includes(w.category) ? w.category : 'other'] += 1;
  }
  return out;
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "2 days ago", "3 weeks ago", "Oct 2, 2025". */
export function relativeDate(iso, now = new Date()) {
  const d = new Date(iso);
  const ms = now - d;
  if (!Number.isFinite(ms)) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** CSV (RFC 4180, with a header row) for a spreadsheet. Formula-looking cells
    are prefixed with ' so a spreadsheet never runs a visitor's text. */
export function wishesToCsv(wishes = []) {
  const cols = [
    ['created_at', 'Date'], ['category', 'Category'], ['text', 'Wish'], ['why', 'Why'],
    ['first_name', 'First name'], ['status', 'Status'], ['admin_note', 'Private note'],
  ];
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = wishes.map((w) => cols.map(([k]) => {
    if (k === 'category') return cell(categoryLabel(w.category));
    if (k === 'status') return cell(statusLabel(w.status));
    return cell(w[k]);
  }).join(','));
  return [cols.map(([, h]) => h).join(','), ...rows].join('\r\n');
}
