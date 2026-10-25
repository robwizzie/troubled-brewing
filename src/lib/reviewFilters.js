/* =============================================================================
   Sorting, filtering, searching and paging the complete review list on
   /reviews (GoogleReviewsFeed). Pure functions, so the rules are tested on
   their own (test/reviews.test.jsx).

   The feed's rows come from loadReviews() (src/lib/reviews.js), which has
   already applied the owners' star floor, hidden list and pins; this module
   only decides how a visitor slices what's left.
   ============================================================================= */

export const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'highest', label: 'Highest rated' },
  { id: 'detailed', label: 'Most detailed' },
];

/* What people write about, as keyword families. A topic chip only shows when
   enough reviews mention it (MIN_TOPIC) to be worth a click. */
export const TOPICS = [
  { id: 'coffee', label: 'Coffee', re: /\b(coffee|latte|espresso|cappuccino|cortado|americano|macchiato|mocha|cold brew|iced coffee|pour over|drip)\b/i },
  { id: 'food', label: 'Food', re: /\b(food|sandwich(es)?|breakfast|lunch|bagel|muffin|scone|croissant|pastr(y|ies)|cookie|brownie|toast|egg|wrap|salad|baked goods)\b/i },
  { id: 'tea', label: 'Matcha & tea', re: /\b(matcha|tea|chai|london fog)\b/i },
  { id: 'staff', label: 'Friendly staff', re: /\b(staff|barista|baristas|owner|owners|service|friendly|welcoming|kind|sweet|helpful)\b/i },
  { id: 'vibe', label: 'Atmosphere', re: /\b(cozy|cosy|atmosphere|vibe|vibes|decor|ambiance|ambience|aesthetic|charming|seating|music|art|wall)\b/i },
  { id: 'work', label: 'Work & study', re: /\b(wifi|wi-fi|work(ing)? from|laptop|study|studying|remote work)\b/i },
  { id: 'dogs', label: 'Dog-friendly', re: /\b(dog|dogs|pup|puppy|pup cup)\b/i },
];
export const MIN_TOPIC = 3;

/* The non-topic filters. `test` decides membership. */
export const BASE_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'picks', label: 'Our picks', test: (r) => Boolean(r.favorite) },
  { id: 'photos', label: 'With photos', test: (r) => Boolean(r.photo) },
  { id: 'five', label: '5 stars', test: (r) => Number(r.rating) >= 5 },
];

function filterById(id) {
  const base = BASE_FILTERS.find((f) => f.id === id);
  if (base) return base.test;
  const topic = TOPICS.find((t) => t.id === id);
  return topic ? (r) => topic.re.test(r.quote || '') : BASE_FILTERS[0].test;
}

/** The chips worth showing for this list, each with how many reviews it holds.
    "All" is always there; the rest only when they'd find something (topics:
    at least MIN_TOPIC, and never when they'd match everything). */
export function availableFilters(reviews) {
  const list = reviews || [];
  const out = [];
  for (const f of BASE_FILTERS) {
    const count = list.filter(f.test).length;
    if (f.id === 'all' || (count > 0 && count < list.length)) out.push({ id: f.id, label: f.label, count });
  }
  for (const t of TOPICS) {
    const count = list.filter((r) => t.re.test(r.quote || '')).length;
    if (count >= MIN_TOPIC && count < list.length) out.push({ id: t.id, label: t.label, count, topic: true });
  }
  return out;
}

const time = (r) => (r.published_at ? Date.parse(r.published_at) || 0 : 0);

/* Comparators. Undated reviews (cached by an older Edge Function) always sort
   after dated ones, keeping the order they came in (Array#sort is stable). */
const byDate = (dir) => (a, b) => {
  const ta = time(a);
  const tb = time(b);
  if (ta && tb) return dir * (ta - tb);
  if (ta) return -1;
  if (tb) return 1;
  return 0;
};
const COMPARE = {
  recommended: null, // the order loadReviews + the feed already built: picks, pins, then newest
  newest: byDate(-1),
  oldest: byDate(1),
  highest: (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || byDate(-1)(a, b),
  detailed: (a, b) => (b.quote || '').length - (a.quote || '').length,
};

/** Normalise a search string into lowercase words (ignores 1-letter noise). */
export function searchTerms(query) {
  return String(query || '').toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter((w) => w.length > 1);
}

/**
 * The visible list: filter, then search (every word must appear, in the review
 * or the reviewer's name), then sort.
 */
export function selectReviews(reviews, { filter = 'all', sort = 'recommended', query = '' } = {}) {
  const test = filterById(filter);
  const terms = searchTerms(query);
  const out = (reviews || []).filter((r) => {
    if (!test(r)) return false;
    if (!terms.length) return true;
    const hay = `${r.quote || ''} ${r.author || ''}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
  const cmp = COMPARE[sort];
  return cmp ? [...out].sort(cmp) : out;
}

/**
 * Page buttons for a pager: numbers with '…' gaps, always the first and last
 * page and a window around the current one. pageList(7, 20) →
 * [1, '…', 6, 7, 8, '…', 20].
 */
export function pageList(current, total, around = 1) {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1); // room for every page
  const keep = new Set([1, total]);
  for (let p = current - around; p <= current + around; p += 1) if (p >= 1 && p <= total) keep.add(p);
  // fill a gap of exactly one page instead of showing "…" for it
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0) {
      const gap = p - sorted[i - 1];
      if (gap === 2) out.push(p - 1);
      else if (gap > 2) out.push('…');
    }
    out.push(p);
  });
  return out;
}

/** Split text into [{ text, hit }] runs around the search terms, for <mark>. */
export function highlight(text, terms) {
  const s = String(text || '');
  if (!terms || !terms.length) return [{ text: s, hit: false }];
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${esc.join('|')})`, 'gi');
  return s.split(re).filter(Boolean).map((part) => ({ text: part, hit: terms.includes(part.toLowerCase()) }));
}
