// Supabase Edge Function: send the hours edited in admin → Hours & holidays to
// the shop's Google Business Profile, so the site and Google never disagree.
//
//   { action: 'status' } → { ok, connected }   is the Business Profile set up?
//   { action: 'push' }   → { ok, error? }      write the weekly grid (regular
//                                               hours) and every upcoming holiday
//                                               (special hours) to Google
//
// Only a signed-in admin may call it (the anon key is not enough).
//
// What it writes, from the `hours` and `hours_overrides` tables:
//   regularHours  — one period per open day ("7:30 AM" → 07:30); a day with
//                   no times is closed. A close at or before the open runs
//                   past midnight into the next day.
//   specialHours  — one period per holiday from today on: closed all day, or
//                   its own open/close. THIS REPLACES Google's special-hours
//                   list, so holidays are managed here from now on.
//
// After a successful push it also writes the same hours into the cached
// google_profile (weekday_periods, the shape Places returns) so the site shows
// them straight away, and stamps hours_pushed_at — google-profile then keeps
// these hours for a few days instead of Places' copy, which can lag behind a
// Business Profile edit.
//
// Uses the same Business Profile OAuth secrets as google-profile's "all
// reviews" (docs/INTEGRATIONS.md §Hours to Google):
//   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN, GBP_LOCATION_ID
// and needs the "My Business Business Information API" enabled.
//
// Deploy:   supabase functions deploy google-hours

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const gbp = {
    id: Deno.env.get('GBP_CLIENT_ID'),
    secret: Deno.env.get('GBP_CLIENT_SECRET'),
    refresh: Deno.env.get('GBP_REFRESH_TOKEN'),
    location: Deno.env.get('GBP_LOCATION_ID'),
  };
  const connected = Boolean(gbp.id && gbp.secret && gbp.refresh && gbp.location);

  try {
    // A real signed-in user, not just the public anon key.
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` } });
    if (!who.ok) return json({ ok: false, error: 'not_signed_in' }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.action === 'status') return json({ ok: true, connected }, 200);
    if (body?.action !== 'push') return json({ ok: false, error: 'unknown_action' }, 400);
    if (!connected) return json({ ok: false, error: 'not_connected' }, 200);

    const db = (path: string, init: RequestInit = {}) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      });

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()); // YYYY-MM-DD
    const [hRes, oRes] = await Promise.all([
      db('hours?select=*&order=day_of_week'),
      db(`hours_overrides?select=*&override_date=gte.${today}&order=override_date`),
    ]);
    if (!hRes.ok || !oRes.ok) throw new Error('Could not read hours');
    const hours: Record<string, any>[] = await hRes.json();
    const overrides: Record<string, any>[] = await oRes.json();

    // ---- weekly hours ----
    const regular: Record<string, any>[] = [];
    const places: Record<string, any>[] = [];
    for (const row of hours) {
      const d = Number(row.day_of_week);
      if (!(d >= 0 && d <= 6)) continue;
      const open = toMinutes(row.open_time);
      const close = toMinutes(row.close_time);
      if (open == null && close == null) continue; // closed that day
      if (open == null || close == null) {
        return json({ ok: false, error: 'bad_time', detail: `${DAY_NAMES[d]}: needs both an opening and a closing time` }, 200);
      }
      const overnight = close <= open;
      const closeDay = overnight ? (d + 1) % 7 : d;
      regular.push({ openDay: DAYS[d], openTime: tod(open), closeDay: DAYS[closeDay], closeTime: tod(close, true) });
      places.push({ open: { day: d, hour: Math.floor(open / 60), minute: open % 60 }, close: { day: closeDay, hour: Math.floor(close / 60), minute: close % 60 } });
    }

    // ---- holidays / special hours ----
    const special: Record<string, any>[] = [];
    for (const o of overrides) {
      const date = ymd(o.override_date);
      if (!date) continue;
      const open = toMinutes(o.open_time);
      const close = toMinutes(o.close_time);
      if (open == null || close == null) {
        special.push({ startDate: date, closed: true });
      } else {
        special.push({ startDate: date, openTime: tod(open), endDate: close <= open ? ymd(nextDay(o.override_date)) : date, closeTime: tod(close, true) });
      }
    }

    // ---- write to Google ----
    const tok = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: gbp.id!, client_secret: gbp.secret!, refresh_token: gbp.refresh!, grant_type: 'refresh_token' }),
    });
    if (!tok.ok) throw new Error(`token ${tok.status}: ${await tok.text()}`);
    const { access_token } = await tok.json();

    const loc = String(gbp.location).replace(/^locations\//, '');
    const patch = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${loc}?updateMask=regularHours,specialHours`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ regularHours: { periods: regular }, specialHours: { specialHourPeriods: special } }),
      },
    );
    if (!patch.ok) throw new Error(`Business Profile ${patch.status}: ${await patch.text()}`);

    // ---- show it on the site now, and hold it over Places for a few days ----
    const cache = { weekday_periods: places, weekday_hours: [], hours_pushed_at: new Date().toISOString() };
    let up = await db('google_profile?id=eq.1', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(cache) });
    if (!up.ok) {
      // before the hours_pushed_at migration has run
      const { hours_pushed_at: _t, ...rest } = cache;
      up = await db('google_profile?id=eq.1', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rest) });
    }
    if (!up.ok) console.error('google_profile cache', up.status, await up.text());

    return json({ ok: true, days: regular.length, holidays: special.length }, 200);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e) }, 200);
  }
});

/** "7:30 AM" / "7:30am" / "7 PM" / "15:00" → minutes after midnight, or null.
    Same reading as src/lib/hours.js toMinutes() (no am/pm = 24-hour clock). */
function toMinutes(str: unknown): number | null {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):?(\d{2})?\s*([AaPp])\.?\s*[Mm]?\.?$|^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  let h = Number(m[1] ?? m[4]);
  const min = Number(m[2] ?? m[5] ?? 0);
  const mer = m[3]?.toUpperCase();
  if (h > 23 || min > 59) return null;
  if (mer === 'P' && h !== 12) h += 12;
  if (mer === 'A' && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes → Google TimeOfDay; a closing time of midnight is 24:00. */
function tod(mins: number, isClose = false) {
  if (isClose && mins === 0) return { hours: 24, minutes: 0 };
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}

function ymd(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null;
}

function nextDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
