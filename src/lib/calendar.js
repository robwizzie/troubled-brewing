/* =============================================================================
   "Add to calendar" + "Text a friend" for an event row.

   Pure (no DOM) so it's unit-tested end to end (test/event-calendar.test.js).

   An event row is { id, title, description, event_date: 'YYYY-MM-DD',
   event_time: free text the owner typed, e.g. "6:00–8:00 PM", "7 PM",
   "11am-1pm", "All day" }. eventWindow() reads that text into a start and an
   end on the SHOP's wall clock (America/New_York):
     · a start and an end → both;
     · only a start → the end is 2 hours later (DEFAULT_DURATION_MIN);
     · no usable time ("All day", blank, or "7" with no am/pm — better a
       date-only entry than a wrong time) → an all-day event (DATE values).

   Calendars get the wall time WITH its zone, never the visitor's: the .ics
   uses TZID=America/New_York plus a VTIMEZONE block, Google gets ctz=, and
   Outlook gets the UTC offset in force on that date. So 7 PM is 7 PM in
   Haddon Heights whether you add it from Philly or Phoenix.
   ============================================================================= */

export const SHOP_TZ = 'America/New_York';
export const EVENT_LOCATION = 'Trouble Brewing Coffee House, 514 Station Ave, Haddon Heights, NJ 08035';
export const DEFAULT_DURATION_MIN = 120;
const UID_DOMAIN = 'troublebrewingcoffeehouse.com';

const pad = (n, w = 2) => String(n).padStart(w, '0');
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/** 'YYYY-MM-DD' + n days (calendar arithmetic, no timezone involved). */
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/* ---- reading the owner's time text ---------------------------------------- */

const TIME_TOKEN = /\b(noon|midnight)\b|(?<!\d)(\d{1,2})(?::(\d{2}))?(?!\d)\s*(?:([ap])\.?\s*m\b\.?)?/gi;

function tokens(text) {
  const out = [];
  for (const m of String(text).matchAll(TIME_TOKEN)) {
    if (m[1]) {
      out.push({ h: m[1].toLowerCase() === 'noon' ? 12 : 0, min: 0, mer: m[1].toLowerCase() === 'noon' ? 'p' : 'a', fixed: true });
      continue;
    }
    const h = Number(m[2]);
    const min = m[3] ? Number(m[3]) : 0;
    if (h > 23 || min > 59) continue;
    out.push({ h, min, mer: m[4] ? m[4].toLowerCase() : null, fixed: false });
    if (out.length === 2) break;
  }
  return out.slice(0, 2);
}

function to24({ h, min, mer, fixed }) {
  if (fixed) return h * 60 + min;
  let hh = h;
  if (h > 12) return h * 60 + min; // already 24-hour ("19:00")
  if (mer === 'p' && hh !== 12) hh += 12;
  if (mer === 'a' && hh === 12) hh = 0;
  return hh * 60 + min;
}

/**
 * Free-text time → { start, end } in minutes after midnight (end may be null;
 * end ≤ start means it runs past midnight). null when there's no usable time.
 */
export function parseEventTime(text) {
  const s = String(text || '').trim();
  if (!s || /\ball[\s-]*day\b/i.test(s)) return null;
  const [a, b] = tokens(s);
  if (!a) return null;
  const hasMer = (t) => t && (t.fixed || t.mer || t.h > 12);
  // "6–8 PM": the start borrows the end's am/pm; "11–1 PM" means 11 AM.
  if (!hasMer(a)) {
    if (!hasMer(b)) return null; // "7" alone is ambiguous
    const borrowed = { ...a, mer: b.mer };
    const start = to24(borrowed);
    const end = to24(b);
    a.mer = start > end && b.mer === 'p' ? 'a' : b.mer;
  }
  if (b && !hasMer(b)) b.mer = a.mer && to24({ ...b, mer: a.mer }) > to24(a) ? a.mer : (a.mer === 'a' ? 'p' : 'a');
  const start = to24(a);
  const end = b ? to24(b) : null;
  return { start, end: end === start ? null : end };
}

const hm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

/**
 * The event's span on the shop's wall clock:
 *   timed  → { allDay: false, startDate, startTime: 'HH:MM', endDate, endTime }
 *   allDay → { allDay: true,  startDate, endDate } (endDate EXCLUSIVE, per RFC 5545)
 * null when the row has no valid date.
 */
export function eventWindow(ev) {
  if (!ev || !isIsoDate(ev.event_date)) return null;
  const date = ev.event_date;
  const t = parseEventTime(ev.event_time);
  if (!t) return { allDay: true, startDate: date, endDate: addDays(date, 1) };
  let endMin = t.end == null ? t.start + DEFAULT_DURATION_MIN : t.end;
  if (endMin <= t.start) endMin += 24 * 60; // runs past midnight
  const dayCarry = Math.floor(endMin / (24 * 60));
  return {
    allDay: false,
    startDate: date,
    startTime: hm(t.start),
    endDate: addDays(date, dayCarry),
    endTime: hm(endMin % (24 * 60)),
  };
}

/* ---- timezone math ---------------------------------------------------------- */

const OFFSET_FMT = new Map();
function zoneParts(tz, date) {
  if (!OFFSET_FMT.has(tz)) {
    OFFSET_FMT.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  const p = {};
  for (const x of OFFSET_FMT.get(tz).formatToParts(date)) p[x.type] = x.value;
  return p;
}

/** Minutes `tz` is ahead of UTC at the instant `date` (New York: −240 or −300). */
export function tzOffsetMinutes(tz, date) {
  const p = zoneParts(tz, date);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** A wall-clock date + 'HH:MM' in `tz` → the real instant (Date). */
export function zonedToUtc(isoDate, time, tz = SHOP_TZ) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = tzOffsetMinutes(tz, new Date(guess));
  const second = tzOffsetMinutes(tz, new Date(guess - off * 60000));
  if (second !== off) off = second;
  return new Date(guess - off * 60000);
}

const offsetString = (mins) => `${mins < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(mins) / 60))}:${pad(Math.abs(mins) % 60)}`;
const compactDate = (iso) => iso.replace(/-/g, '');
const compactLocal = (iso, time) => `${compactDate(iso)}T${time.replace(':', '')}00`;
const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/* ---- .ics (RFC 5545) -------------------------------------------------------- */

/** TEXT value escaping: backslash, semicolon, comma, newline. */
export function escapeIcsText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold a content line at 75 octets (UTF-8), never splitting a character. */
export function foldIcsLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '';
  let bytes = 0;
  let limit = 75; // continuation lines start with a space, which counts
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
      limit = 74;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/* America/New_York since 2007: DST from the 2nd Sunday of March to the 1st
   Sunday of November, both at 2 AM local. */
const VTIMEZONE_NY = [
  'BEGIN:VTIMEZONE',
  'TZID:America/New_York',
  'X-LIC-LOCATION:America/New_York',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0400',
  'TZNAME:EDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'TZNAME:EST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 60) || 'event';
}

/** The description calendars get: the blurb, the owner's own time text, the link. */
function details(ev, url) {
  return [ev.description, ev.event_time && `When: ${ev.event_time}`, url].filter(Boolean).join('\n\n');
}

/** "trouble-brewing-trivia-night-2026-11-08.ics" */
export function icsFilename(ev) {
  return `trouble-brewing-${slugify(ev.title)}${isIsoDate(ev.event_date) ? `-${ev.event_date}` : ''}.ics`;
}

/** A complete VCALENDAR for one event (CRLF line endings), or '' with no date. */
export function buildIcs(ev, { url = '', now = new Date() } = {}) {
  const w = eventWindow(ev);
  if (!w) return '';
  const uid = `${ev.id ? `event-${ev.id}` : `${slugify(ev.title)}-${ev.event_date}`}@${UID_DOMAIN}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trouble Brewing Coffee House//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(w.allDay ? [] : VTIMEZONE_NY),
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    ...(w.allDay
      ? [`DTSTART;VALUE=DATE:${compactDate(w.startDate)}`, `DTEND;VALUE=DATE:${compactDate(w.endDate)}`]
      : [`DTSTART;TZID=${SHOP_TZ}:${compactLocal(w.startDate, w.startTime)}`, `DTEND;TZID=${SHOP_TZ}:${compactLocal(w.endDate, w.endTime)}`]),
    `SUMMARY:${escapeIcsText(ev.title)}`,
    `DESCRIPTION:${escapeIcsText(details(ev, url))}`,
    `LOCATION:${escapeIcsText(EVENT_LOCATION)}`,
    ...(url ? [`URL:${url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

/* ---- web calendars ---------------------------------------------------------- */

/** Google Calendar "create event" template link (wall times + ctz). */
export function googleCalendarUrl(ev, { url = '' } = {}) {
  const w = eventWindow(ev);
  if (!w) return '';
  const dates = w.allDay
    ? `${compactDate(w.startDate)}/${compactDate(w.endDate)}`
    : `${compactLocal(w.startDate, w.startTime)}/${compactLocal(w.endDate, w.endTime)}`;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title || 'Event at Trouble Brewing',
    dates,
    details: details(ev, url),
    location: EVENT_LOCATION,
    ctz: SHOP_TZ,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Outlook on the web compose link; times carry their New York UTC offset. */
export function outlookCalendarUrl(ev, { url = '' } = {}) {
  const w = eventWindow(ev);
  if (!w) return '';
  const at = (date, time) => {
    const off = tzOffsetMinutes(SHOP_TZ, zonedToUtc(date, time));
    return `${date}T${time}:00${offsetString(off)}`;
  };
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title || 'Event at Trouble Brewing',
    startdt: w.allDay ? w.startDate : at(w.startDate, w.startTime),
    enddt: w.allDay ? w.endDate : at(w.endDate, w.endTime),
    allday: w.allDay ? 'true' : 'false',
    body: details(ev, url),
    location: EVENT_LOCATION,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}

/* ---- "Text a friend" -------------------------------------------------------- */

/** "Sat, Nov 8 at 7 PM" / "Sat, Nov 8 at 7:30 PM" / "Sat, Nov 8" (all day). */
export function friendlyWhen(ev) {
  const w = eventWindow(ev);
  if (!w) return '';
  const [y, m, d] = w.startDate.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (w.allDay) return day;
  const [hh, mm] = w.startTime.split(':').map(Number);
  const h12 = hh % 12 || 12;
  return `${day} at ${h12}${mm ? `:${pad(mm)}` : ''} ${hh < 12 ? 'AM' : 'PM'}`;
}

export function inviteText(ev, { url = '' } = {}) {
  const when = friendlyWhen(ev);
  return `Want to go to ${ev.title} at Trouble Brewing${when ? ` on ${when}` : ''}?${url ? ` ${url}` : ''}`;
}

/** `sms:?&body=` — the one form both iOS Messages and Android accept. */
export function smsHref(ev, { url = '' } = {}) {
  return `sms:?&body=${encodeURIComponent(inviteText(ev, { url }))}`;
}
