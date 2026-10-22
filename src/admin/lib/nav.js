/* =============================================================================
   One map of the admin, in the owner's words. The sidebar, the home page's
   task cards, the "What do you want to change?" search, the breadcrumbs and
   the "Recently published" list all read from here, so a screen is always
   called the same thing everywhere.
   ============================================================================= */
import {
  LuAtSign, LuCalendarDays, LuCamera, LuChartLine, LuCircleHelp, LuClock, LuCoffee, LuCroissant, LuFrame, LuHistory, LuHouse,
  LuImages, LuInbox, LuLink, LuMegaphone, LuPanelsTopLeft, LuSettings, LuSquarePen, LuStar, LuStore, LuUserRound, LuUsers, LuVote, LuWandSparkles,
} from 'react-icons/lu';

/* Friendly page names — the owner picks "Menu", never a slug. */
export const PAGE_NAMES = {
  home: 'Home',
  menu: 'Menu',
  about: 'Our Story',
  events: 'Events',
  location: 'Hours & Location',
  contact: 'Contact',
  reviews: 'Reviews',
  'gallery-wall': 'Gallery Wall',
  troublemakers: 'Troublemakers',
  neighborhood: 'Local Love',
  timeline: 'Timeline',
  'gift-cards': 'Gift Cards',
};

/* Every screen. `nav` places it in the sidebar: 'top' (always visible, in
   order), a group name (groups appear in the order they first show up here),
   'more' (folded away under "Settings & more") or 'bottom' (Help, at the foot).
   `icon` is a Lucide component from react-icons/lu.

   Adding a screen is ONE line here (plus its <Route> in AdminApp.jsx); the
   sidebar, breadcrumbs, quick-jump and home page all pick it up:
     { to: '/admin/stats', icon: LuChartLine, label: 'Site stats', nav: 'Every day' },

   Hand-picked quotes are no longer a screen of their own: Reviews has
   "+ Favorite", which makes the same quote. The old screen still opens from
   a link on Reviews for editing the quotes already picked. */
export const SCREENS = [
  { to: '/admin', icon: LuHouse, label: 'Home', nav: 'top', end: true },
  { to: '/admin/chalkboard', icon: LuCamera, label: 'Today’s chalkboard', nav: 'top', star: true },
  { to: '/admin/editor', icon: LuSquarePen, label: 'Edit your pages', nav: 'top' },
  { to: '/admin/hours', icon: LuClock, label: 'Hours & holidays', nav: 'Every day' },
  { to: '/admin/quick-blocks', icon: LuMegaphone, label: 'Banner & links', nav: 'Every day' },
  { to: '/admin/inbox', icon: LuInbox, label: 'Messages', nav: 'Every day', badge: 'inbox' },
  { to: '/admin/wishes', icon: LuWandSparkles, label: 'Wish list', nav: 'Every day', badge: 'wishes' },
  { to: '/admin/menu', icon: LuCoffee, label: 'Menu', nav: 'On the site' },
  { to: '/admin/events', icon: LuCalendarDays, label: 'Events', nav: 'On the site' },
  { to: '/admin/reviews', icon: LuStar, label: 'Google reviews', nav: 'On the site' },
  { to: '/admin/gallery', icon: LuFrame, label: 'Gallery Wall', nav: 'On the site' },
  { to: '/admin/troublemakers', icon: LuUsers, label: 'Troublemakers', nav: 'On the site' },
  { to: '/admin/pairings', icon: LuCroissant, label: 'Drink pairings', nav: 'On the site' },
  { to: '/admin/look', icon: LuPanelsTopLeft, label: 'Homepage look', nav: 'On the site' },
  { to: '/admin/polls', icon: LuVote, label: 'This or that polls', nav: 'On the site' },
  { to: '/admin/settings', icon: LuSettings, label: 'Settings', nav: 'more', end: true },
  { to: '/admin/account', icon: LuUserRound, label: 'Your account', nav: 'more' },
  { to: '/admin/stats', icon: LuChartLine, label: 'Site stats', nav: 'more' },
  { to: '/admin/neighborhood', icon: LuStore, label: 'Local Love', nav: 'more' },
  { to: '/admin/timeline', icon: LuHistory, label: 'Timeline', nav: 'more' },
  { to: '/admin/media', icon: LuImages, label: 'Photo library', nav: 'more' },
  { to: '/admin/google', icon: LuLink, label: 'Google connection', nav: 'more' },
  { to: '/admin/help', icon: LuCircleHelp, label: 'Help', nav: 'bottom' },
];

const PLACES = new Set(['top', 'more', 'bottom']);
/** The sidebar's named groups, in the order they first appear in SCREENS. */
export const NAV_GROUPS = [...new Set(SCREENS.map((s) => s.nav).filter((n) => n && !PLACES.has(n)))];

/** The sidebar group a screen sits in ("Every day", "More"…), or ''. */
export function groupOf(screen) {
  if (!screen) return '';
  if (screen.to === '/admin/settings') return '';
  if (screen.nav === 'more') return 'Settings';
  return PLACES.has(screen.nav) ? '' : screen.nav;
}

/** The screen a path belongs to (longest matching prefix), or null. */
export function screenFor(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '') || '/';
  let best = null;
  for (const s of SCREENS) {
    if (p === s.to || (s.to !== '/admin' && p.startsWith(`${s.to}/`))) {
      if (!best || s.to.length > best.to.length) best = s;
    }
  }
  return best;
}

/** A human name for a path: "Today’s chalkboard", "Edit your pages · Menu". */
export function describePath(pathname) {
  const p = String(pathname || '');
  const m = p.match(/\/admin\/editor\/([^/?#]+)/);
  if (m) return `Edit your pages · ${PAGE_NAMES[m[1]] || 'a page'}`;
  if (/\/admin\/editor\/?$/.test(p)) return `Edit your pages · ${PAGE_NAMES.home}`;
  return screenFor(p)?.label || 'Admin';
}

/* ---- The jobs people actually come here to do ----------------------------
   The home page, in the words staff use. `TASKS` are the big cards (the
   chalkboard has its own banner, then the first COMMON_COUNT are "Most
   days"); `SITE_TASKS` and `VISITOR_TASKS` are the two short lists under
   them; `SETTINGS_TASKS` live on the Settings screen, out of the way.
   `keywords` feed the search box; include the words a barista would type,
   misspelled or not. */
export const TASKS = [
  {
    id: 'chalkboard', to: '/admin/chalkboard', icon: LuCamera,
    title: 'Update the chalkboard',
    desc: 'Snap the specials board — it goes on the homepage.',
    keywords: 'chalkboard chalk blackboard black board sign signs specials special today daily photo picture pic camera snap board menu board past boards old history archive keep longer until replace stay how long duration',
  },
  {
    id: 'hours', to: '/admin/hours', icon: LuClock,
    title: 'Change hours or add a holiday closure',
    desc: 'Opening times on every page, plus days you’re closed.',
    keywords: 'hours open opening close closing closed time times holiday holidays christmas thanksgiving easter snow storm weather early late schedule day off vacation',
  },
  {
    id: 'menu', to: '/admin/menu', icon: LuCoffee,
    title: 'Edit the menu descriptions or photos',
    desc: 'What each drink and bite says, its photo and dietary tags.',
    keywords: 'menu drink drinks food item items latte coffee espresso tea pastry pastries bagel description describe photo picture vegan gluten dairy dietary allergy sold out',
  },
  {
    id: 'event', to: '/admin/events', icon: LuCalendarDays,
    title: 'Add an event',
    desc: 'Open mics, art nights and more on the Events page.',
    keywords: 'event events calendar open mic music live night class workshop party date trivia show',
  },
  {
    id: 'banner', to: '/admin/quick-blocks', icon: LuMegaphone,
    title: 'Post an announcement banner',
    desc: 'The message bar across the top of every page.',
    keywords: 'banner announcement announce message notice alert news bar top heads up featured drink',
  },
];

/* "On the website": the rest of what's on the public pages. */
export const SITE_TASKS = [
  {
    id: 'pages', to: '/admin/editor', icon: LuSquarePen,
    title: 'Edit a page’s words or photos',
    desc: 'Tap any part of any page and type over it.',
    keywords: 'page pages words text writing wording photo photos picture image about story homepage home heading title section hero typo spelling paragraph contact',
  },
  {
    id: 'reviews', to: '/admin/reviews', icon: LuStar,
    title: 'Hide or feature a review',
    desc: 'Choose which Google reviews show, and which one leads.',
    keywords: 'review reviews google stars star rating hide feature pin bad good testimonial testimonials customer quote quotes favourite favorite hand picked',
  },
  { id: 'gallery', to: '/admin/gallery', icon: LuFrame, title: 'Edit the Gallery Wall', desc: 'Names, artists and stories, and the box around each piece.', keywords: 'gallery art artist artists painting paintings wall piece pieces frame frames hotspot box for sale story' },
  { id: 'team', to: '/admin/troublemakers', icon: LuUsers, title: 'Edit the staff cards', desc: 'The Troublemakers page: photos, roles and fun facts.', keywords: 'troublemakers staff team barista baristas employee employees people bio new hire' },
  {
    id: 'pairings', to: '/admin/pairings', icon: LuCroissant,
    title: 'Pair a drink with a treat',
    desc: '“Goes great with…” under a drink on the Menu page.',
    keywords: 'pair pairs pairing pairings goes great with treat treats combo combos match together muffin scone cookie croissant bakery snack recommend recommendation suggestion',
  },
  {
    id: 'look', to: '/admin/look', icon: LuPanelsTopLeft,
    title: 'Change the homepage look',
    desc: 'Compare the homepage styles and preview one before it goes live.',
    keywords: 'look style styles design theme concept layout hero front homepage appearance seasonal refresh redesign',
  },
];

/* "From your visitors": what people sent or did on the site. */
export const VISITOR_TASKS = [
  { id: 'inbox', badge: 'inbox', to: '/admin/inbox', icon: LuInbox, title: 'Read messages', desc: 'Contact and catering forms.', keywords: 'inbox message messages email contact catering form enquiry inquiry request order' },
  { id: 'wishes', badge: 'wishes', to: '/admin/wishes', icon: LuWandSparkles, title: 'Read the menu wishes', desc: 'Drinks and treats people wished for.', keywords: 'wish wishes wishlist suggestion suggestions idea ideas request requests feedback customer customers want menu new drink fox' },
  { id: 'polls', to: '/admin/polls', icon: LuVote, title: 'Ask a “This or that” poll', desc: 'A one-tap question in the fox, and its results.', keywords: 'poll polls vote votes voting question this or that survey fox quiz results ask' },
];

/* Settings: setup and rarely changed pages, one quiet screen. */
export const SETTINGS_TASKS = [
  { id: 'account', to: '/admin/account', icon: LuUserRound, title: 'Your account', desc: 'Your email, your password, and signing out.', keywords: 'account password change password email login log in sign out signout logout me profile' },
  { id: 'social', to: '/admin/quick-blocks', icon: LuAtSign, title: 'Social media links', desc: 'Instagram, Facebook and friends in the footer.', keywords: 'social instagram facebook tiktok links footer x twitter' },
  { id: 'google', to: '/admin/google', icon: LuLink, title: 'Google connection', desc: 'Where your rating, reviews and address come from.', keywords: 'google connection connect rating maps address place refresh fetch' },
  { id: 'photos', to: '/admin/media', icon: LuImages, title: 'Photo library', desc: 'Every photo you have uploaded.', keywords: 'photo library photos images uploads upload pictures media' },
  { id: 'stats', to: '/admin/stats', icon: LuChartLine, title: 'Site stats', desc: 'Visits, top pages, Order clicks and fox use.', keywords: 'stats statistics analytics visit visits visitors traffic views pages numbers clicks orders dashboard report how many people busy' },
  { id: 'local', to: '/admin/neighborhood', icon: LuStore, title: 'Local Love', desc: 'The neighbours on the Local Love page.', keywords: 'local love business businesses neighbor neighbour neighborhood shop shops station ave partner' },
  { id: 'timeline', to: '/admin/timeline', icon: LuHistory, title: 'Timeline', desc: 'The shop’s story, year by year.', keywords: 'timeline history milestone milestones year anniversary' },
  { id: 'help', to: '/admin/help', icon: LuCircleHelp, title: 'Help', desc: 'Plain-English how-tos.', keywords: 'help how stuck guide tutorial question undo mistake' },
];

/** Kept for older imports: everything that isn't a big card. */
export const MORE_TASKS = [...SITE_TASKS, ...VISITOR_TASKS, ...SETTINGS_TASKS];

const ALL_TASKS = [...TASKS, ...MORE_TASKS];

/** How many cards (after the chalkboard) make the home page's "Most days" row. */
export const COMMON_COUNT = 4;

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
// "holidays" → "holiday", "pastries" → "pastry": close enough for a search box
const stem = (w) => (w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const STOP = new Set(['a', 'an', 'the', 'to', 'i', 'my', 'our', 'want', 'need', 'how', 'do', 'can', 'on', 'of', 'for', 'and', 'it', 'is', 'change', 'update', 'edit', 'add', 'new', 'put', 'make', 'some', 'up', 'set', 'in', 'website', 'site', 'page']);

/** Screens matching what someone typed, best first. "closed christmas" → hours. */
export function searchTasks(query, { limit = 5 } = {}) {
  const all = words(query).map(stem);
  const q = all.filter((w) => !STOP.has(w));
  const terms = q.length ? q : all; // "edit page" still finds pages
  if (!terms.length) return [];
  const scored = ALL_TASKS.map((t, i) => {
    const titleWords = words(t.title).map(stem);
    const keyWords = words(t.keywords).map(stem);
    let score = 0;
    for (const term of terms) {
      if (titleWords.includes(term)) score += 3;
      else if (keyWords.includes(term)) score += 2;
      else if (term.length >= 3 && [...titleWords, ...keyWords].some((w) => w.startsWith(term))) score += 1;
    }
    return { t, score, i };
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const seen = new Set();
  const out = [];
  for (const { t } of scored) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/* ---- "Recently published" (this device) --------------------------------- */
const RECENT_KEY = 'tb-admin-recent-v1';
const RECENT_MAX = 6;

export function readRecent() {
  try {
    const list = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((r) => r && r.path && r.at) : [];
  } catch {
    return [];
  }
}

export function recordPublish(path, at = new Date()) {
  try {
    const entry = { path: String(path), label: describePath(path), at: at.toISOString() };
    const rest = readRecent().filter((r) => r.label !== entry.label);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...rest].slice(0, RECENT_MAX)));
  } catch {
    /* private mode / storage full — the list is a convenience only */
  }
}

/** Current admin path without the deploy base ("/troubled-brewing/admin/x" → "/admin/x"). */
export function currentAdminPath() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const p = window.location.pathname;
  return base && p.startsWith(base) ? p.slice(base.length) || '/' : p;
}

/** "just now", "12 min ago", "3:40 PM", "yesterday", "Mon". */
export function agoLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((now - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
