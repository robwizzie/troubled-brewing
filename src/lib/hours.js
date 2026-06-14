/* Hours logic shared by HoursToday + the hours section.
   Times are stored as display strings ("7:30 AM"); we parse them for open/closed
   math but always render the original string. Google Business Profile is the
   intended source of truth (client asked) with these manual tables as the
   editable fallback + holiday overrides. */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const dow = now.getDay();
  const todayISO = now.toISOString().slice(0, 10);
  const override = overrides.find((o) => o.override_date === todayISO);

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

  const mins = now.getHours() * 60 + now.getMinutes();
  const o = toMinutes(row.open_time);
  const c = toMinutes(row.close_time);
  const open = o != null && c != null && mins >= o && mins < c;
  const closingSoon = open && c - mins <= 30;

  return {
    open,
    closingSoon,
    label: open ? (closingSoon ? `Open — closing at ${row.close_time}` : `Open until ${row.close_time}`) : `Closed — opens ${row.open_time}`,
    todayHours: `${row.open_time} – ${row.close_time}`,
    override: Boolean(override),
    overrideLabel: override?.label,
  };
}
