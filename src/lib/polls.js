import { supabase, isSupabaseConfigured } from './supabase.js';
import { shopNow } from './hours.js';

/* =============================================================================
   "This or that" polls — the one-tap question in the fox's card.

   Tables (supabase/migrations/2026-10-19-polls-and-stats.sql): `polls`, the
   owner's questions, and `poll_votes`, one row per vote. Visitors only ever
   read the poll that's running today and its TOTALS (the poll_results()
   function); they never read vote rows.

   One vote per browser per poll:
   - the browser remembers which polls it voted in (VOTED_KEY), and
   - each browser makes up one random id (VOTER_KEY) sent with the vote; the
     database refuses a second vote with the same id for the same poll.
   That random id is the only thing stored about a voter: no IP, no name,
   nothing that identifies a person.

   Until the migration runs, every read here fails quietly and returns null,
   and the fox simply doesn't show a poll.
   ============================================================================= */

export const VOTED_KEY = 'tb-poll-voted'; // { [pollId]: 'a' | 'b' }
export const VOTER_KEY = 'tb-poll-voter'; // the random voter id

/* Icons an owner can pick for each option: keys only here (the database
   stores the key); src/components/PollIcon.jsx draws them. */
export const POLL_ICONS = [
  { id: 'iced', label: 'Snowflake' },
  { id: 'cup', label: 'Iced cup' },
  { id: 'hot', label: 'Hot mug' },
  { id: 'milk', label: 'Milk' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'spice', label: 'Spice' },
  { id: 'croissant', label: 'Croissant' },
  { id: 'cake', label: 'Muffin / cake' },
  { id: 'cookie', label: 'Cookie' },
  { id: 'bagel', label: 'Bagel' },
  { id: 'sandwich', label: 'Sandwich' },
  { id: 'egg', label: 'Egg' },
  { id: 'sweet', label: 'Candy' },
  { id: 'sun', label: 'Sun' },
  { id: 'moon', label: 'Moon' },
];
const ICON_IDS = new Set(POLL_ICONS.map((i) => i.id));
export const iconOrNull = (id) => (ICON_IDS.has(id) ? id : null);

export const QUESTION_MAX = 120;
export const OPTION_MAX = 40;

/* Ideas for the owner, drawn from the real menu (all on SpotOn: Iced / Hot
   Latte, Croissant, Muffin, Cappuccino, Hot Matcha / Chai Latte, Bagel /
   Breakfast Sandwich). Suggestions only: the admin never publishes these by
   itself. */
export const SUGGESTED_POLLS = [
  { question: 'Iced or hot today?', option_a: 'Iced', option_b: 'Hot', icon_a: 'iced', icon_b: 'hot' },
  { question: 'Croissant or muffin?', option_a: 'Croissant', option_b: 'Muffin', icon_a: 'croissant', icon_b: 'cake' },
  { question: 'Latte or cappuccino?', option_a: 'Latte', option_b: 'Cappuccino', icon_a: 'milk', icon_b: 'hot' },
  { question: 'Matcha or chai?', option_a: 'Matcha', option_b: 'Chai', icon_a: 'leaf', icon_b: 'spice' },
  { question: 'Bagel or breakfast sandwich?', option_a: 'Bagel', option_b: 'Breakfast sandwich', icon_a: 'bagel', icon_b: 'sandwich' },
  { question: 'Sweet or savory?', option_a: 'Sweet', option_b: 'Savory', icon_a: 'sweet', icon_b: 'egg' },
];

/* ---- dates ---------------------------------------------------------------- */

/** Is a poll running on `today` (an ISO date on the shop's clock)? */
export function isRunning(p, today = shopNow().isoDate) {
  if (!p || p.status !== 'published') return false;
  if (p.starts_on && p.starts_on > today) return false;
  if (p.ends_on && p.ends_on < today) return false;
  return true;
}

/** The poll the fox shows today: of the running ones, the one that started
    most recently (a dated poll beats an open-ended one that began earlier),
    then the newest. */
export function pickActivePoll(polls, today = shopNow().isoDate) {
  const live = (polls || []).filter((p) => isRunning(p, today));
  live.sort((x, y) =>
    String(y.starts_on || '').localeCompare(String(x.starts_on || ''))
    || String(y.created_at || '').localeCompare(String(x.created_at || '')));
  return live[0] || null;
}

/** Where a poll stands, in the owner's words. */
export function pollPhase(p, today = shopNow().isoDate) {
  if (!p) return 'draft';
  if (p.status === 'archived') return 'archived';
  if (p.status === 'ended') return 'ended';
  if (p.status !== 'published') return 'draft';
  if (p.starts_on && p.starts_on > today) return 'scheduled';
  if (p.ends_on && p.ends_on < today) return 'finished';
  return 'running';
}

/* ---- results ---------------------------------------------------------------- */

/** Two whole percentages that always add up to 100 (or both 0). */
export function percents(a, b) {
  const A = Math.max(0, Number(a) || 0);
  const B = Math.max(0, Number(b) || 0);
  const total = A + B;
  if (!total) return { a: 0, b: 0, total: 0 };
  const pa = Math.round((A / total) * 100);
  return { a: pa, b: 100 - pa, total };
}

/** The fox's line once you've voted. Light, never smug. */
export function foxPollLine(poll, res, mine) {
  if (!poll || !res || !res.total) return 'First vote! You’re setting the trend.';
  const name = (c) => (c === 'a' ? poll.option_a : poll.option_b);
  const { a, b, total } = percents(res.a, res.b);
  if (total < 3) return 'Early days. Tell a friend and see who wins.';
  if (a === b) return 'Dead heat! I’m staying out of this one.';
  const lead = a > b ? 'a' : 'b';
  const gap = Math.abs(a - b);
  if (mine === lead) return gap >= 30 ? `${name(lead)} by a mile. You’re with the crowd.` : `You and most folks agree: ${name(lead)}.`;
  if (mine) return gap >= 30 ? `A ${name(mine)} rebel. I respect it.` : `Close one! ${name(mine)} could still catch up.`;
  return `${name(lead)} is ahead, ${a > b ? a : b}% to ${a > b ? b : a}%.`;
}

/* ---- this browser ------------------------------------------------------------ */

function readVoted() {
  try {
    const v = JSON.parse(window.localStorage.getItem(VOTED_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** 'a' | 'b' if this browser already voted in this poll, else null. */
export function myVote(pollId) {
  const v = readVoted()[pollId];
  return v === 'a' || v === 'b' ? v : null;
}

export function rememberVote(pollId, choice) {
  try {
    const all = readVoted();
    all[pollId] = choice;
    // keep the list small: only the last 30 polls
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - 30))) delete all[k];
    window.localStorage.setItem(VOTED_KEY, JSON.stringify(all));
  } catch {
    /* private mode: the database's one-vote rule still holds */
  }
}

let memoryVoter = '';
function randomId() {
  const bytes = new Uint8Array(18);
  try {
    window.crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

/** This browser's random voter id (made once, kept in localStorage). */
export function voterId() {
  try {
    let id = window.localStorage.getItem(VOTER_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = randomId();
      window.localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    if (!memoryVoter) memoryVoter = randomId();
    return memoryVoter;
  }
}

/* ---- network (all fail quietly) --------------------------------------------- */

/** Today's poll, or null (none running, no Supabase, or no polls table yet). */
export async function getActivePoll() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('id, question, option_a, option_b, icon_a, icon_b, starts_on, ends_on, status, created_at')
      .eq('status', 'published');
    if (error) return null;
    return pickActivePoll(data);
  } catch {
    return null;
  }
}

/** { a, b, total } for a poll, or null. */
export async function getPollResults(pollId) {
  if (!isSupabaseConfigured || !pollId) return null;
  try {
    const { data, error } = await supabase.rpc('poll_results', { p_poll_id: pollId });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { a: 0, b: 0, total: 0 };
    return { a: Number(row.a) || 0, b: Number(row.b) || 0, total: Number(row.total) || 0 };
  } catch {
    return null;
  }
}

/** Send a vote. Resolves true when it counted (or this browser had already
    voted, which the database tells us), false if it couldn't be sent. */
export async function castVote(pollId, choice) {
  if (!isSupabaseConfigured || !pollId || (choice !== 'a' && choice !== 'b')) return false;
  try {
    const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, choice, voter_hash: voterId() });
    if (error && error.code !== '23505') return false; // 23505: already voted from this browser
    rememberVote(pollId, choice);
    return true;
  } catch {
    return false;
  }
}
