import { mediaUrl } from './config.js';
import SIZES from './pagePhotos.data.json';

/* The shop's own photographs (Alex McDonnell's shoot for the owners, plus their
   storefront snaps), optimised into public/images/pages/ as
   <name>-<width>.webp with a <name>.jpg fallback. pagePhotos.data.json records
   which widths exist for each and its aspect ratio.

   Sections store the plain "/images/pages/<name>.jpg" path, so the CMS sees
   one ordinary image url; photoSources() turns a path it recognises into a
   WebP srcset, and passes any other url (an admin upload, a hotlink) through
   untouched. */

const PAGE_RE = /^\/?images\/pages\/([a-z0-9-]+)\.jpg$/i;

export const pagePhoto = (name) => `/images/pages/${name}.jpg`;

export function photoSources(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return null;
  const m = raw.match(PAGE_RE);
  const meta = m && SIZES[m[1]];
  if (!meta) return { src: mediaUrl(raw), srcSet: null, ratio: null };
  const srcSet = meta.widths.map((w) => `${mediaUrl(`/images/pages/${m[1]}-${w}.webp`)} ${w}w`).join(', ');
  return { src: mediaUrl(raw), srcSet, ratio: meta.ratio };
}
