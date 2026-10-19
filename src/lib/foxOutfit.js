/* The fox's outfits: a small accessory or two for the season, swapped for
   the weather at the shop when it's raining, snowing or very hot.

   The fox himself never changes — same top hat, never any glasses (he's the
   logo fox). Outfits are small SVG accessories drawn over him by
   src/components/FoxOutfit.jsx; this file decides WHICH ones, and holds the
   one line he says about it in his card.

   Season (America/New_York calendar date, or ?foxday=MM-DD like foxDays):
     October → pumpkins · Nov–Feb → scarf · Dec 1–26 → scarf + holiday sprig
     Mar–May → a flower in the hat band · Jun–Aug → a little sun
     September → a falling leaf
   Weather (live, Open-Meteo, at 514 Station Ave) overrides the season's
   "beside him" piece: rain → umbrella, snow → snowflakes + scarf,
   ≥ 88°F → an iced drink. Anything he wears (scarf, sprig, flower) stays on.
   A failed or slow (3s) weather call just means season-only, silently.

   ?foxOutfit=rain|snow|hot|october|winter|holiday|spring|summer|september
   forces a look, so the owner can preview it (?weather=rain|snow, the
   rainy-day banner's preview, dresses him to match). Temperatures are only ever
   quoted from live data, never from a preview. */

export const SHOP = { lat: 39.8773, lon: -75.0646 }; // 514 Station Ave, Haddon Heights NJ
export const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${SHOP.lat}&longitude=${SHOP.lon}&current=weather_code,temperature_2m,is_day&temperature_unit=fahrenheit`;
export const WEATHER_KEY = 'tb.fox.weather';
export const WEATHER_TTL = 30 * 60 * 1000;
export const WEATHER_TIMEOUT = 3000;
export const HOT_F = 88;

export const LOOKS = ['rain', 'snow', 'hot', 'october', 'winter', 'holiday', 'spring', 'summer', 'september'];

/** The shop's calendar date: { month: 1–12, day }. */
export function shopDate(now = new Date(), search = typeof window !== 'undefined' ? window.location.search : '') {
  const q = /^(\d{1,2})-(\d{1,2})$/.exec(new URLSearchParams(search || '').get('foxday') || '');
  if (q) return { month: Number(q[1]), day: Number(q[2]) };
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'numeric', day: 'numeric' }).formatToParts(now);
    const get = (t) => Number(parts.find((p) => p.type === t)?.value);
    if (get('month') && get('day')) return { month: get('month'), day: get('day') };
  } catch { /* no Intl time zones: fall through to local */ }
  return { month: now.getMonth() + 1, day: now.getDate() };
}

/** 'october' | 'holiday' | 'winter' | 'spring' | 'summer' | 'september' */
export function seasonFor({ month, day }) {
  if (month === 10) return 'october';
  if (month === 12 && day >= 1 && day <= 26) return 'holiday';
  if (month === 11 || month === 12 || month === 1 || month === 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'september';
}

// WMO weather interpretation codes (Open-Meteo's `weather_code`)
const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW = new Set([71, 73, 75, 77, 85, 86]);

/** 'rain' | 'snow' | 'hot' | null for a weather code and a °F temperature. */
export function weatherFor(code, tempF) {
  const c = Number(code);
  if (code != null && SNOW.has(c)) return 'snow';
  if (code != null && RAIN.has(c)) return 'rain';
  if (Number.isFinite(Number(tempF)) && tempF !== null && Number(tempF) >= HOT_F) return 'hot';
  return null;
}

/** The forced look from ?foxOutfit=…, or null. */
export function outfitFromUrl(search = typeof window !== 'undefined' ? window.location.search : '') {
  let v = '';
  try { v = String(new URLSearchParams(search || '').get('foxOutfit') || '').trim().toLowerCase(); } catch { return null; }
  return LOOKS.includes(v) ? v : null;
}

/** The forced wet weather from ?weather=rain|snow (the rainy-day banner's
    preview), or null. Anything else is ignored. */
export function weatherPreviewFromUrl(search = typeof window !== 'undefined' ? window.location.search : '') {
  let v = '';
  try { v = String(new URLSearchParams(search || '').get('weather') || '').trim().toLowerCase(); } catch { return null; }
  return v === 'rain' || v === 'snow' ? v : null;
}

// what he WEARS for a season (stays on in any weather) and what sits BESIDE him
const WORN = { october: [], holiday: ['scarf', 'sprig'], winter: ['scarf'], spring: ['flower'], summer: [], september: [] };
const BESIDE = { october: ['pumpkins'], holiday: [], winter: [], spring: [], summer: ['sun'], september: ['leaf'] };
const WEATHER_PARTS = { rain: ['umbrella'], snow: ['scarf', 'snow'], hot: ['iced'] };

const SEASON_LINES = {
  october: 'Pumpkin season at Trouble.',
  holiday: 'Scarf on and a sprig in my hat. Happy holidays from Station Ave.',
  winter: 'Scarf weather on Station Ave.',
  spring: 'Spring on Station Ave. I’ve got a flower in my hat band.',
  summer: 'Summer on Station Ave. Iced drinks, anyone?',
  september: 'The first leaves are falling on Station Ave.',
};

function weatherLine(look, tempF) {
  const t = Number.isFinite(tempF) ? Math.round(tempF) : null;
  if (look === 'rain') return 'Umbrella out. It’s raining on Station Ave.';
  if (look === 'snow') return 'Bundled up. It’s snowing on Station Ave.';
  if (look === 'hot') return t != null ? `It’s ${t}°F on Station Ave. Iced, anyone?` : 'Iced drink weather on Station Ave.';
  return null;
}

/**
 * The outfit to wear: { id, parts: [...], line }.
 *   season   — seasonFor(…)
 *   weather  — { code, tempF } from the live call, or null
 *   override — a forced look (?foxOutfit=), or null
 * A forced season replaces the real season; a forced weather look keeps the
 * real season's worn pieces and never quotes a temperature.
 */
export function resolveOutfit({ season, weather = null, override = null } = {}) {
  let s = season || 'september';
  let w = null;
  let temp = null;
  if (override && WEATHER_PARTS[override]) w = override;
  else if (override && SEASON_LINES[override]) s = override;
  else if (weather) {
    w = weatherFor(weather.code, weather.tempF);
    temp = Number.isFinite(weather.tempF) ? weather.tempF : null;
  }
  const parts = new Set(WORN[s]);
  if (w) WEATHER_PARTS[w].forEach((p) => parts.add(p));
  else BESIDE[s].forEach((p) => parts.add(p));
  return {
    id: w || s,
    season: s,
    weather: w,
    parts: [...parts],
    line: w ? weatherLine(w, temp) : SEASON_LINES[s],
  };
}

const session = {
  get(k) { try { return window.sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.sessionStorage.setItem(k, v); } catch { /* private mode: fine */ } },
};

/** The cached live weather if it's under 30 minutes old, else null. */
export function cachedWeather(now = Date.now()) {
  try {
    const v = JSON.parse(session.get(WEATHER_KEY) || 'null');
    if (v && Number.isFinite(v.at) && now - v.at >= 0 && now - v.at < WEATHER_TTL && 'code' in v) {
      return { code: v.code, tempF: Number.isFinite(v.tempF) ? v.tempF : null, isDay: v.isDay ?? null };
    }
  } catch { /* bad cache: refetch */ }
  return null;
}

/** Live weather at the shop: { code, tempF, isDay }, or null on any failure
    or after WEATHER_TIMEOUT. Cached in sessionStorage for WEATHER_TTL. */
export async function fetchWeather({ fetchImpl = typeof fetch === 'function' ? fetch : null, now = Date.now(), timeout = WEATHER_TIMEOUT } = {}) {
  const hit = cachedWeather(now);
  if (hit) return hit;
  if (!fetchImpl) return null;
  let timer;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  try {
    const res = await Promise.race([
      fetchImpl(WEATHER_URL, ctrl ? { signal: ctrl.signal } : undefined),
      new Promise((_, reject) => { timer = setTimeout(() => { ctrl?.abort(); reject(new Error('timeout')); }, timeout); }),
    ]);
    if (!res || !res.ok) return null;
    const json = await res.json();
    const cur = json?.current;
    const code = Number(cur?.weather_code);
    if (!cur || !Number.isFinite(code)) return null;
    const tempF = Number(cur.temperature_2m);
    const out = { code, tempF: Number.isFinite(tempF) ? tempF : null, isDay: cur.is_day == null ? null : Boolean(cur.is_day) };
    session.set(WEATHER_KEY, JSON.stringify({ ...out, at: now }));
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
