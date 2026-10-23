/* Shared helpers for Local Love — used by both the card grid and the
   illustrated Station Ave strip, so the two layouts can never disagree about
   where a business sits on the street or where its directions link points. */

import { mediaUrl } from './config.js';

/* logo_url / photo_url may be absolute (hotlinked, or an admin upload) or a
   site-relative path to a file we host ("/images/neighbors/anthonys.png");
   mediaUrl() resolves the latter under the deploy base. */
export { mediaUrl };

/* The logos the owners sent us, self-hosted under public/images/neighbors/
   (trimmed to the artwork, PNG/JPG with a WebP twin). Each one is drawn on
   the street as a painted sign board in the logo's own ground colour, so the
   artwork sits flush on it; `ratio` is the file's width / height, so the
   board can be sized before the image arrives. */
const NEIGHBOR_LOGOS = {
  anthonys: { bg: '#000000', ink: '#ffffff', ratio: 480 / 265 },
  ralphs: { bg: '#47403a', ink: '#f3e9da', ratio: 1 },
  'south-jersey-special': { bg: '#ffffff', ink: '#111111', ratio: 480 / 79 },
  'janes-tea-house': { bg: '#ffffff', ink: '#c9787a', ratio: 480 / 168 },
  'april-robin': { bg: '#dacce0', ink: '#141414', ratio: 480 / 163 },
  'michaels-jewelers': { bg: '#ffffff', ink: '#111111', ratio: 480 / 137 },
  'docs-finds': { bg: '#025b07', ink: '#ffffff', ratio: 480 / 202 },
};
const HOSTED_LOGO = /^\/?images\/neighbors\/([a-z0-9-]+)\.(png|jpe?g|webp)$/i;

/* Everything the storefront needs to hang a logo: the resolved src, a WebP
   twin for the files we host (only the known ones — each has a .webp beside
   it), and the sign's ground colour + shape when we know them. Anything else
   (a hotlink, an admin upload) gets a cream board and is measured as it
   loads. No logo → null. */
export function logoFor(url) {
  const src = mediaUrl(url);
  if (!src) return null;
  const m = HOSTED_LOGO.exec(String(url).trim());
  const known = m ? NEIGHBOR_LOGOS[m[1].toLowerCase()] : null;
  const webp = known && m[2].toLowerCase() !== 'webp' ? src.replace(/\.(png|jpe?g)$/i, '.webp') : null;
  return { src, webp, bg: known?.bg || null, ink: known?.ink || null, ratio: known?.ratio || null };
}

export const CATEGORY_LABELS = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  retail: 'Shop',
  service: 'Service',
  bakery: 'Bakery',
  bar: 'Bar',
  other: 'Local spot',
};

export const categoryLabel = (c) => (c ? CATEGORY_LABELS[c] || c : '');

/* Leading street number, for the walk-the-block ordering. Anything without one
   sorts after the numbered places, keeping its manual display_order. */
export function streetNumber(address) {
  const m = /^\s*(\d{1,5})/.exec(String(address || ''));
  return m ? Number(m[1]) : null;
}

export const initials = (name) =>
  String(name || '?')
    .replace(/^(the|a)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* The directions link. A row's own maps_url wins; otherwise a Google Maps
   search for name + address. The addresses are typed as just the street
   ("512 Station Ave"), which Maps would resolve to whichever Station Ave it
   fancies, so the town is appended unless the address already names it.
   No address and no maps_url → no link. */
const TOWN = ', Haddon Heights, NJ 08035';
export function directionsUrl(b) {
  if (b.maps_url) return b.maps_url;
  if (!b.address) return null;
  const where = /haddon heights/i.test(b.address) ? b.address : `${b.address}${TOWN}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${where}`)}`;
}

/* The street name on its own ("12 Kings Hwy, Haddon Heights" → "Kings Hwy"),
   for the "Around town" stretch where the number alone means nothing. */
export function streetName(address) {
  return String(address || '').replace(/,.*$/, '').replace(/^\s*\d{1,5}[a-z]?\s+/i, '').trim();
}

/* Only businesses with a website are listed — the owner's rule: no site, no
   storefront (in either layout). A url has to at least look like one. */
export const hasWebsite = (b) => /^https?:\/\/\S+\.\S+/i.test(String(b?.url || '').trim());

/* Street-number order (or the owner's manual order), website-less rows dropped.
   Ties and unnumbered rows fall back to display_order so the result is stable
   whatever the DB returns. */
export function orderBusinesses(rows, orderBy = 'street') {
  const byManual = (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0);
  const list = (rows || []).filter(hasWebsite);
  if (orderBy !== 'street') return list.sort(byManual);
  return list.sort((a, b) => {
    const na = streetNumber(a.address);
    const nb = streetNumber(b.address);
    if (na == null && nb == null) return byManual(a, b);
    if (na == null) return 1;
    if (nb == null) return -1;
    return na - nb || byManual(a, b);
  });
}

/* How many of the ordered rows come before the shop's own door — the index
   the "You are here" storefront is dropped in at. -1 = don't show it. */
export function usIndex(ordered, ourNumber) {
  if (ourNumber == null) return -1;
  return ordered.filter((b) => (streetNumber(b.address) ?? Infinity) < ourNumber).length;
}
