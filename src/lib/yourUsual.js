import { orderUrlFor } from './order.js';
import { productImageSources } from './productImage.js';

/* "Your usual": the last drink a visitor actually tapped Order on, remembered in THEIR browser only —
   localStorage `tb.fox.usual`, never sent anywhere. On a later visit (more
   than ~10 minutes later, less than 60 days) his card greets them with it.

   It's always re-resolved by name against the current menu before it's
   shown, so the price, photo and SpotOn link are today's; if the drink has
   left the menu the usual is quietly forgotten. Every storage call is
   wrapped: with storage blocked the site simply never has a usual. */

export const USUAL_KEY = 'tb.fox.usual';
export const USUAL_MIN_AGE = 10 * 60 * 1000; // not "back" if they just picked it
export const USUAL_MAX_AGE = 60 * 24 * 60 * 60 * 1000;

const norm = (s) => String(s || '').trim().toLowerCase();

const local = {
  get() { try { return window.localStorage.getItem(USUAL_KEY); } catch { return null; } },
  set(v) { try { window.localStorage.setItem(USUAL_KEY, v); } catch { /* private mode: fine */ } },
  del() { try { window.localStorage.removeItem(USUAL_KEY); } catch { /* fine */ } },
};

/** Remember a menu item as the visitor's usual. */
export function saveUsual(item, now = Date.now()) {
  if (!item?.name) return null;
  const usual = {
    name: String(item.name),
    price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
    orderUrl: orderUrlFor(item),
    image: productImageSources(item)[0] || null,
    savedAt: now,
  };
  local.set(JSON.stringify(usual));
  return usual;
}

export function forgetUsual() {
  local.del();
}

/** The raw saved usual, or null. */
export function readUsual() {
  try {
    const v = JSON.parse(local.get() || 'null');
    return v && typeof v.name === 'string' && Number.isFinite(v.savedAt) ? v : null;
  } catch {
    return null;
  }
}

/**
 * The usual to greet a visitor with: { usual, item } (item = today's menu
 * row), or null. Forgets it when it's too old or no longer on the menu.
 * With no menu loaded yet nothing is decided (null, nothing forgotten).
 */
export function loadUsual(menu, now = Date.now()) {
  const usual = readUsual();
  if (!usual) return null;
  const age = now - usual.savedAt;
  if (age > USUAL_MAX_AGE) { forgetUsual(); return null; }
  if (!Array.isArray(menu) || !menu.length) return null;
  const item = menu.find((i) => norm(i?.name) === norm(usual.name));
  if (!item) { forgetUsual(); return null; }
  if (item.available === false) return null; // off today; keep it for later
  if (age < USUAL_MIN_AGE) return null;
  return { usual, item };
}

/** 'a' or 'an' for a drink name ("an Iced Latte", "a Hot Chocolate"). */
export function articleFor(name) {
  const w = norm(name).replace(/^[^a-z0-9]+/, '');
  if (!w) return 'a';
  if (/^(hour|honest|honou?r|heir|herb)/.test(w)) return 'an';
  if (/^(uni|use|usu|uti|ure|uro|euro|eu|ewe|one\b|once)/.test(w)) return 'a';
  if (/^8/.test(w) || /^(11|18)(\D|$)/.test(w)) return 'an'; // "an 8oz", "an 18oz"
  return /^[aeiou]/.test(w) ? 'an' : 'a';
}
