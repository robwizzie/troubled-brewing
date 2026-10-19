/* Non-component helpers for the explicit-publish model (see publishing.jsx). */

/* ---- Plain-words error messages ------------------------------------------- */
export function friendlyError(e) {
  const raw = String(e?.message || e || '').trim();
  const msg = raw.toLowerCase();
  if (/failed to fetch|network|load failed|offline|timed? ?out/.test(msg)) {
    return 'We couldn’t reach the server — check the shop Wi-Fi or your phone signal, then press Publish again. Your changes are still here.';
  }
  if (/jwt|expired|not authenticated|401|unauthor|session/.test(msg)) {
    return 'You’ve been signed out. Open the admin in a new tab, sign in, then come back and press Publish — your changes are still here.';
  }
  if (/permission|row-level security|rls|403|denied/.test(msg)) {
    return 'This account isn’t allowed to change that. Ask your developer to check your admin access. Your changes are still here.';
  }
  if (/duplicate|unique/.test(msg)) {
    return 'Something with the same name or date already exists. Change it slightly and press Publish again.';
  }
  return `Publishing didn’t finish${raw ? ` (${raw})` : ''}. Your changes are still here — try Publish again, and if it keeps happening, contact your developer.`;
}

export const publishedTime = (d = new Date()) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/* ---- Deep-ish equality for "did anything change?" ------------------------- */
export function same(a, b) {
  const norm = (v) => (v === undefined || v === '' ? null : v);
  a = norm(a);
  b = norm(b);
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return String(a) === String(b) && typeof a === typeof b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (!same(a[k], b[k])) return false;
  return true;
}
