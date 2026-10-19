/* Shared helpers for Local Love — used by both the card grid and the
   illustrated Station Ave strip, so the two layouts can never disagree about
   where a business sits on the street or where its directions link points. */

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
