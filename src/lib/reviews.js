import { getGoogleProfile, getTestimonials, getContentBlock, reviewKey } from './dataService.js';

/* =============================================================================
   THE one place that decides which reviews the site shows, in what order, and
   what each one looks like.

   Before this existed, the homepage strip, the reviews-page feed and the
   testimonials wall each re-implemented "a good review" slightly differently
   (different star floors, different dedupe, different sort), so the same quote
   could show twice on one page and a 3★ could slip onto the wall. Every
   surface now calls loadReviews() and renders whatever comes back.

   Two sources, one shape:
     · Google  — the cached google_profile.reviews library (the Edge Function
                 merges each refresh's top-5 in, so it grows toward the full set)
     · Curated — the testimonials table (hand-picked quotes, optional photo)

   Owner overrides live in the `review_settings` content block, keyed by
   reviewKey(author, text) so they survive Google re-ordering its cache:
     min_rating  the star floor (default 4 — only the good ones)
     hidden      { key: true } — never show this one
     pinned      { key: true } — show it first, everywhere
     photos      { key: url }  — a photo the owner attached by hand (Google's
                 APIs don't return review images, so this is how a review
                 becomes a "with photo" review)
   ============================================================================= */

export const REVIEW_SETTINGS_KEY = 'review_settings';

export const DEFAULT_REVIEW_SETTINGS = {
  min_rating: 4,
  hidden: {},
  pinned: {},
  photos: {},
};

/** Merge a stored settings block over the defaults (any field may be absent). */
export function normalizeReviewSettings(raw) {
  const s = raw || {};
  const num = Number(s.min_rating);
  return {
    min_rating: Number.isFinite(num) ? Math.min(5, Math.max(1, num)) : DEFAULT_REVIEW_SETTINGS.min_rating,
    hidden: s.hidden && typeof s.hidden === 'object' ? s.hidden : {},
    pinned: s.pinned && typeof s.pinned === 'object' ? s.pinned : {},
    photos: s.photos && typeof s.photos === 'object' ? s.photos : {},
  };
}

export async function getReviewSettings() {
  return normalizeReviewSettings(await getContentBlock(REVIEW_SETTINGS_KEY));
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/* Google's cache row → the shape every review renderer consumes. `time` is
   Google's relative description ("2 weeks ago"); `published_at` is the real
   timestamp the newer Edge Function stores, and is what we sort on. */
function fromGoogle(r, i) {
  const quote = clean(r.text);
  return {
    id: r.review_id || `g-${i}`,
    key: reviewKey(r.author, quote),
    author: clean(r.author) || 'Google user',
    quote,
    rating: r.rating == null ? 5 : Number(r.rating),
    source: 'Google',
    time: clean(r.time),
    published_at: r.published_at || null,
    url: r.review_url || '',
    avatar: r.profile_photo || '',
    photo: '',
    featured: false,
    curated: false,
  };
}

function fromTestimonial(t) {
  const quote = clean(t.quote);
  return {
    id: `t-${t.id}`,
    key: reviewKey(t.author, quote),
    author: clean(t.author),
    quote,
    rating: t.rating == null ? 5 : Number(t.rating),
    source: clean(t.source),
    time: '',
    published_at: null,
    url: '',
    avatar: '',
    photo: t.image_url || '',
    featured: Boolean(t.featured),
    curated: true,
    display_order: t.display_order ?? 0,
  };
}

/* Sort: the owner's pins and featured picks first, then reviews carrying a
   photo (they are the ones worth a big card), then newest. Curated quotes with
   no timestamp keep their manual display_order among themselves. */
function compare(a, b) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (Boolean(a.photo) !== Boolean(b.photo)) return a.photo ? -1 : 1;
  if (a.published_at && b.published_at) return a.published_at < b.published_at ? 1 : -1;
  if (a.published_at) return -1;
  if (b.published_at) return 1;
  return (a.display_order ?? 0) - (b.display_order ?? 0);
}

/**
 * Every review the site is allowed to show, best first.
 *
 * @param {object}  opts
 * @param {number}  opts.minLength  drop quotes shorter than this (the homepage
 *                                  frames need something to frame; a bare "5★"
 *                                  with no words is not a card)
 * @param {'all'|'google'|'curated'} opts.only  which source to RETURN. Both
 *        sources are always loaded regardless, because dedupe needs both: a
 *        review the owners imported as a testimonial must disappear from the
 *        Google side, or the same quote hangs twice on the reviews page.
 * @returns {Promise<{rating:number, count:number, mapsUrl:string, reviews:object[]}>}
 */
export async function loadReviews({ minLength = 0, only = 'all' } = {}) {
  const [profile, testimonials, settings] = await Promise.all([
    getGoogleProfile(),
    getTestimonials(),
    getReviewSettings(),
  ]);

  const picks = [...(testimonials || []).map(fromTestimonial), ...(profile?.reviews || []).map(fromGoogle)];

  const seen = new Set();
  const reviews = [];
  for (const r of picks) {
    // curated first in `picks`, so a review the owners imported as a
    // testimonial wins over its Google twin and the quote never hangs twice
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    if (settings.hidden[r.key]) continue;
    if (r.rating < settings.min_rating) continue;
    if (r.quote.length < minLength) continue;
    if (only === 'google' && r.curated) continue;
    if (only === 'curated' && !r.curated) continue;
    reviews.push({ ...r, pinned: Boolean(settings.pinned[r.key]), photo: settings.photos[r.key] || r.photo });
  }
  reviews.sort(compare);

  return {
    rating: profile?.rating || 5,
    count: profile?.review_count || 0,
    mapsUrl: profile?.maps_url || '',
    reviews,
  };
}
