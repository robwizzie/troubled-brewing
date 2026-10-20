import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { shopNow } from '../../lib/hours.js';

/* The "Site stats" page's data: reads the daily counts in `site_stats`
   (src/lib/siteStats.js writes them) and turns them into the few numbers the
   owners care about. Pure functions below the loader, so they're testable. */

export const RANGES = [7, 30, 90];

export const PAGE_LABELS = {
  '/': 'Home', '/menu': 'Menu', '/about': 'Our Story', '/events': 'Events', '/location': 'Hours & Location',
  '/contact': 'Contact', '/timeline': 'Timeline', '/reviews': 'Reviews', '/gallery-wall': 'Gallery Wall',
  '/troublemakers': 'Troublemakers', '/neighborhood': 'Local Love', '/gift-cards': 'Gift Cards',
  '/privacy': 'Privacy', '/accessibility': 'Accessibility', '/other': 'Other pages',
};

/* Order-click sources, in the order the dashboard lists them. */
export const ORDER_SOURCES = [
  { id: 'menu', label: 'Menu page', lead: 'The Menu page' },
  { id: 'fox_quiz', label: 'Fox quiz', lead: 'The fox quiz' },
  { id: 'surprise', label: 'Surprise me', lead: 'The fox’s Surprise me' },
  { id: 'home', label: 'Homepage', lead: 'The homepage' },
  { id: 'pairings', label: 'Drink pairings', lead: 'Drink pairings' },
  { id: 'fox_usual', label: 'Fox: your usual', lead: 'The fox’s “your usual”' },
  { id: 'nav', label: 'Top bar button', lead: 'The top bar’s Order button' },
  { id: 'other', label: 'Other pages', lead: 'Other pages' },
];

/** ISO date `n` days before `iso`. */
export function isoMinus(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Load the counts for the last `days` days (today included).
    → { rows } or { missing: true } (no table yet) or { error } */
export async function loadStats(days, today = shopNow().isoDate) {
  if (!isSupabaseConfigured) return { missing: true };
  try {
    const from = isoMinus(today, days - 1);
    const { data, error } = await supabase
      .from('site_stats')
      .select('day, event, key, count')
      .gte('day', from)
      .order('day', { ascending: true })
      .limit(20000);
    if (error) {
      const msg = `${error.code || ''} ${error.message || ''}`;
      if (/42P01|PGRST205|does not exist|schema cache/i.test(msg)) return { missing: true };
      return { error };
    }
    return { rows: data || [] };
  } catch (error) {
    return { error };
  }
}

const periodWords = (days) => (days === 7 ? 'this week' : days === 30 ? 'in the last 30 days' : 'in the last 3 months');
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** Everything the dashboard shows, from raw rows. */
export function summarize(rows, days, today = shopNow().isoDate) {
  const from = isoMinus(today, days - 1);
  const inRange = (rows || []).filter((r) => r && r.day >= from && r.day <= today);
  const sum = (event, key) => inRange
    .filter((r) => r.event === event && (key === undefined || r.key === key))
    .reduce((t, r) => t + (Number(r.count) || 0), 0);

  // page views per day, every day present (zeros included)
  const byDay = new Map();
  for (const r of inRange) if (r.event === 'page_view') byDay.set(r.day, (byDay.get(r.day) || 0) + (Number(r.count) || 0));
  const daily = Array.from({ length: days }, (_, i) => {
    const day = isoMinus(today, days - 1 - i);
    return { day, views: byDay.get(day) || 0 };
  });
  const views = daily.reduce((t, d) => t + d.views, 0);

  const pageMap = new Map();
  for (const r of inRange) if (r.event === 'page_view') pageMap.set(r.key, (pageMap.get(r.key) || 0) + (Number(r.count) || 0));
  const topPages = [...pageMap.entries()]
    .map(([path, count]) => ({ path, label: PAGE_LABELS[path] || path, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const orderBy = ORDER_SOURCES.map((s) => ({ ...s, count: sum('order_now_click', s.id) }));
  const known = new Set(ORDER_SOURCES.map((s) => s.id));
  const stray = inRange.filter((r) => r.event === 'order_now_click' && !known.has(r.key)).reduce((t, r) => t + (Number(r.count) || 0), 0);
  orderBy.find((s) => s.id === 'other').count += stray;
  const orders = orderBy.reduce((t, s) => t + s.count, 0);

  const fox = {
    opens: sum('fox_open'),
    quizStarted: sum('fox_question', 'quiz'),
    quizFinished: sum('fox_quiz_done'),
    surprise: sum('fox_question', 'surprise') + sum('fox_surprise_again'),
    pollVotes: sum('poll_vote'),
  };
  const extras = {
    giftCards: sum('gift_card_click'),
    calendarAdds: sum('add_to_calendar'),
    textFriend: sum('share_event'),
  };

  // the one plain-English line
  const when = periodWords(days);
  let summary;
  if (!views && !orders) {
    summary = `No visits counted ${when} yet. Numbers appear here as people use the site.`;
  } else {
    const top = orderBy.filter((s) => s.id !== 'other' && s.count > 0).sort((a, b) => b.count - a.count)[0];
    const fromFox = orderBy.find((s) => s.id === 'fox_quiz').count;
    const parts = [`${plural(views, 'page')} opened ${when}.`];
    if (top) parts.push(`${top.lead} led to ${plural(top.count, 'order click')}.`);
    if (fromFox && top?.id !== 'fox_quiz') parts.push(`The fox quiz added ${fromFox.toLocaleString('en-US')} more.`);
    summary = parts.join(' ');
  }

  return { days, daily, views, topPages, orderBy, orders, fox, extras, summary };
}
