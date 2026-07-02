/* Hours logic shared by HoursToday + the hours section.
   Times are stored as display strings ("7:30 AM"); we parse them for open/closed
   math but always render the original string. Google Business Profile is the
   intended source of truth (client asked) with these manual tables as the
   editable fallback + holiday overrides.
   All "is it open right now?" math runs on the SHOP's clock (America/New_York),
   never the visitor's — someone browsing from another timezone must see the
   same status as someone standing outside the door. */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SHOP_TZ = 'America/New_York';

/* One reusable formatter (Intl construction is expensive). h23 avoids the
   "24:xx" midnight edge case some engines produce with h24. */
const SHOP_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TZ,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const DOW_BY_NAME = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** The given moment on the SHOP's clock, whatever the visitor's timezone:
    { dow: 0-6 (Sun-Sat), isoDate: 'YYYY-MM-DD', minutes: since midnight }. */
export function shopNow(now = new Date()) {
  const parts = {};
  for (const p of SHOP_CLOCK.formatToParts(now)) parts[p.type] = p.value;
  return {
    dow: DOW_BY_NAME[parts.weekday],
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function dayName(dow, short = false) {
  return (short ? DAY_SHORT : DAY_NAMES)[dow] ?? '';
}

/** Parse "7:30 AM" → minutes since midnight, or null. */
export function toMinutes(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):?(\d{2})?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3] ? m[3].toUpperCase() : null;
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Compute today's status given weekly hours + overrides.
 * Returns { open, label, todayHours, override }.
 */
export function computeStatus(hours, overrides = [], now = new Date()) {
  const { dow, isoDate, minutes } = shopNow(now);
  const override = overrides.find((o) => o.override_date === isoDate);

  const row = override
    ? { open_time: override.open_time, close_time: override.close_time, label: override.label }
    : hours.find((h) => h.day_of_week === dow) || {};

  if (!row.open_time || !row.close_time) {
    return {
      open: false,
      label: override?.label || 'Closed today',
      todayHours: 'Closed',
      override: Boolean(override),
    };
  }

  const o = toMinutes(row.open_time);
  const c = toMinutes(row.close_time);
  const open = o != null && c != null && minutes >= o && minutes < c;
  const closingSoon = open && c - minutes <= 30;

  return {
    open,
    closingSoon,
    label: open ? (closingSoon ? `Open — closing at ${row.close_time}` : `Open until ${row.close_time}`) : `Closed — opens ${row.open_time}`,
    todayHours: `${row.open_time} – ${row.close_time}`,
    override: Boolean(override),
    overrideLabel: override?.label,
  };
}
