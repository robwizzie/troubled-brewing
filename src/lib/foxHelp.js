import { computeStatus, dayName, nextOpening } from './hours.js';
import { MENU_CATEGORY_ORDER } from './menuService.js';
import { formatEventDays, isMultiDay } from './eventDates.js';

// how the fox says each menu category out loud
const SAY_CATEGORY = { espresso: 'espresso', specialty: 'specialty drinks', food: 'food', pastry: 'pastries', seasonal: 'seasonal specials' };

/* The fox's help panel: the questions visitors actually ask, each answered
   from data the site already has — never from a guess. A question whose
   source is missing (no parking copy on the Location page, nothing tagged
   gluten-free on the menu, no Pup Cup…) simply isn't offered.

   Where each answer comes from (all passed in by FoxGuide.jsx, which loads
   them through dataService/menuService, so live Supabase data wins and the
   bundled seed is the fallback):
     · open        — hours rows (Google profile weekly hours when cached, else
                     the admin hours table) + holiday overrides → computeStatus
                     / nextOpening (src/lib/hours.js), on the shop's clock
     · where       — Google profile formatted_address (else SITE.address) and
                     its maps_url for directions
     · order       — the SpotOn order URL (config.js SPOTON_ORDER_URL via
                     order.js) and the home page's own "Skip the line" copy
     · menu        — the live menu: how many items are available and which
                     categories they fall in
     · parking     — the Location page's "Parking" rich-text block, verbatim
     · dietary     — menu items flagged gluten-free / vegan (dietary_flags)
                     that are available right now
     · dog         — an available "Pup Cup" on the menu
     · events      — upcoming rows in the events table + the Events page's own
                     "Want to host something?" call to action
     · contact     — the shop phone (Google profile, else SITE) + /contact
     · fun         — one of the sourced QUIPS (src/lib/foxDays.js)

   Wi-Fi is deliberately NOT a question: the only mention anywhere in the
   site is a 2019 third-party write-up on the timeline, which isn't a current
   promise. Add it here once the shop says so on a page. */

/** Plain text from the small bits of markdown the CMS blocks use. */
export function plainText(md = '') {
  return String(md)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A section's data on a page by type + heading (case-insensitive). */
export function findSection(sections, type, heading) {
  return (sections || []).find((s) => s?.type === type && (!heading || heading.test(s?.data?.heading || '')))?.data || null;
}

const dropTag = (name) => String(name).replace(/\s*\((GF|V|VG|DF)\)\s*$/i, '').trim();
const hasFlag = (i, f) => Array.isArray(i?.dietary_flags) && i.dietary_flags.includes(f);
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function fmtEventDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** The open/closed answer — exported so the panel header can show the same words. */
export function hoursAnswer(hours, overrides = [], now = new Date()) {
  if (!Array.isArray(hours) || hours.length === 0) return null;
  const s = computeStatus(hours, overrides, now);
  const close = s.todayHours.split(' – ')[1];
  // a holiday override names itself (an override with no hours comes back as label)
  const named = s.override ? (s.overrideLabel || (s.label !== 'Closed today' ? s.label : '')) : '';
  const holiday = named ? `${named}: ` : '';
  if (s.open) {
    return {
      open: true,
      short: s.closingSoon ? `Open, closing at ${close}` : `Open until ${close}`,
      text: s.closingSoon
        ? `${holiday}We’re open, but not for long. We close at ${close} today.`
        : `${holiday}Yes! We’re open until ${close} today. Come say hi.`,
    };
  }
  const next = nextOpening(hours, overrides, now);
  let when = '';
  if (next) {
    when = next.inDays === 0 ? `We open at ${next.time} today.`
      : next.inDays === 1 ? `Back tomorrow at ${next.time}.`
        : `Back ${dayName(next.dow)} at ${next.time}.`;
  }
  return {
    open: false,
    short: next ? (next.inDays === 0 ? `Opens ${next.time}` : `Closed · opens ${next.inDays === 1 ? 'tomorrow' : dayName(next.dow, true)} ${next.time}`) : 'Closed',
    text: `${holiday}We’re closed right now. ${when}`.trim(),
  };
}

/**
 * Every question the fox can answer today, in the order he offers them.
 * Each: { id, q, a, links: [{ label, href }] } — an href starting with "/"
 * is a page on this site, anything else opens outside it.
 */
export function foxAnswers({
  hours = [], overrides = [], now = new Date(),
  address = '', mapsUrl = '',
  orderUrl = '', orderCopy = '',
  menu = [],
  parking = '',
  events = [], hostCopy = '',
  phone = '', phoneHref = '',
  quip = '',
} = {}) {
  const out = [];
  const available = (menu || []).filter((i) => i && i.name && i.available !== false);

  const h = hoursAnswer(hours, overrides, now);
  if (h) out.push({ id: 'open', q: 'Are you open?', a: h.text, links: [{ label: 'All hours & directions', href: '/location' }] });

  if (address) {
    out.push({
      id: 'where',
      q: 'Where are you?',
      a: `You’ll find us at ${address}.`,
      links: [{ label: 'Get directions', href: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` }],
    });
  }

  if (orderUrl) {
    out.push({ id: 'order', q: 'Can I order ahead?', a: orderCopy ? `Yep! ${orderCopy}` : 'Yep! Order ahead on SpotOn.', links: [{ label: 'Order on SpotOn', href: orderUrl }] });
  }

  if (available.length) {
    const cats = MENU_CATEGORY_ORDER.filter((c) => available.some((i) => i.category === c)).map((c) => SAY_CATEGORY[c]);
    const what = cats.length ? listOf(cats) : 'good things';
    out.push({
      id: 'menu',
      q: 'What’s on the menu?',
      a: `${what[0].toUpperCase()}${what.slice(1)}: ${available.length} items on the menu right now. Have a browse.`,
      links: [{ label: 'See the menu', href: '/menu' }],
    });
  }

  if (parking) out.push({ id: 'parking', q: 'Where do I park?', a: parking, links: [{ label: 'Hours & location', href: '/location' }] });

  const gf = available.filter((i) => hasFlag(i, 'gluten-free')).map((i) => dropTag(i.name));
  const vegan = available.filter((i) => hasFlag(i, 'vegan')).map((i) => dropTag(i.name));
  if (gf.length || vegan.length) {
    const say = (names, kind) => (names.length === 1
      ? `The ${names[0]} is ${kind}.`
      : `${names.length} ${kind} picks right now, like the ${listOf(names.slice(0, 2))}.`);
    const parts = ['Yes!'];
    if (gf.length) parts.push(say(gf, 'gluten-free'));
    if (vegan.length) parts.push(say(vegan, 'vegan'));
    out.push({
      id: 'dietary',
      q: gf.length && vegan.length ? 'Gluten-free or vegan?' : gf.length ? 'Anything gluten-free?' : 'Anything vegan?',
      a: `${parts.join(' ')} Look for the ${gf.length ? 'GF' : 'VG'} tag on the menu.`,
      links: [{ label: 'See the menu', href: '/menu' }],
    });
  }

  const pup = available.find((i) => /pup cup/i.test(i.name));
  if (pup) out.push({ id: 'dog', q: 'Anything for my dog?', a: 'There’s a Pup Cup on the menu just for them.', links: [{ label: 'See the menu', href: '/menu' }] });

  const next = (events || []).find((e) => e && e.title);
  if (next || hostCopy) {
    const lines = [];
    if (next) lines.push(`Next up: ${next.title}${next.event_date ? `, ${isMultiDay(next) ? formatEventDays(next) : fmtEventDate(next.event_date)}` : ''}${next.event_time ? ` at ${next.event_time}` : ''}.`);
    if (hostCopy) lines.push(`Hosting? ${hostCopy}`);
    out.push({
      id: 'events',
      q: 'Events & catering',
      a: lines.join(' '),
      links: [{ label: 'See events', href: '/events' }, ...(hostCopy ? [{ label: 'Catering inquiry', href: '/contact' }] : [])],
    });
  }

  if (phone || phoneHref) {
    out.push({
      id: 'contact',
      q: 'How do I reach you?',
      a: `Give us a call at ${phone}, or send a message. We read every one.`,
      links: [{ label: `Call ${phone}`, href: phoneHref }, { label: 'Message us', href: '/contact' }],
    });
  }

  if (quip) out.push({ id: 'fun', q: 'Tell me something fun', a: quip, links: [] });

  return out;
}
