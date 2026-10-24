/* =============================================================================
   An event's day span. `event_date` is the first day; the optional `end_date`
   is the last day (inclusive) of a multi-day event — a weekend festival, a
   week of specials. Blank, malformed or not after the start → a one-day event.

   Kept tiny and dependency-free: the events list, the data layer, the
   calendar builder, JSON-LD and the fox all read spans through here.
   ============================================================================= */

export const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/** The last day of the event ('YYYY-MM-DD'), or '' with no valid start. */
export function eventLastDay(ev) {
  if (!ev || !isIsoDate(ev.event_date)) return '';
  return isIsoDate(ev.end_date) && ev.end_date > ev.event_date ? ev.end_date : ev.event_date;
}

/** True when the event runs over more than one day. */
export function isMultiDay(ev) {
  return Boolean(ev && isIsoDate(ev.event_date) && eventLastDay(ev) !== ev.event_date);
}

/** Still on (or still to come) on `todayIso`. Undated events always count. */
export function isUpcoming(ev, todayIso) {
  if (!ev?.event_date) return true;
  return (eventLastDay(ev) || ev.event_date) >= todayIso;
}

const noon = (iso) => new Date(`${iso}T12:00:00`);

/**
 * "Saturday, October 24" — or, for a span, "Saturday, October 24 – Monday,
 * October 26". `style` 'short' gives "Sat, Oct 24 – Mon, Oct 26".
 */
export function formatEventDays(ev, style = 'long') {
  if (!ev || !isIsoDate(ev.event_date)) return '';
  const opts = style === 'short'
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { weekday: 'long', month: 'long', day: 'numeric' };
  const first = noon(ev.event_date).toLocaleDateString('en-US', opts);
  if (!isMultiDay(ev)) return first;
  return `${first} – ${noon(eventLastDay(ev)).toLocaleDateString('en-US', opts)}`;
}
