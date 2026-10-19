import { useEffect, useMemo, useRef, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { loadReviews } from '../../lib/reviews.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* EVERY real Google review the shop has, straight from the cached
   google_profile.reviews library (the Edge Function merges each refresh's
   reviews in, so it grows toward the full set), newest first.

   This is the complete list, not a teaser: the only reviews left off are the
   ones the owners chose to leave off — anything below their star floor and
   anything they hid (admin → Reviews; the rules live once in
   src/lib/reviews.js, the same ones the homepage strip uses). A review the
   owners ALSO hand-picked as a testimonial still appears here; the favorites
   wall above is a selection, this is the record. The same review never shows
   twice within the feed (Google-vs-Google duplicates collapse in
   loadReviews). Star-only ratings with no words at all are skipped — there's
   nothing to pin up.

   The section's `count` used to cap the feed (the live row says 5); now it
   only sizes the first batch, and never below 12. Rendering is progressive so
   a 300-review library stays quick: the first batch draws at once, and a
   sentinel under the wall appends the next batch as a visitor scrolls near
   the end (IntersectionObserver; where that's missing, everything renders
   up front). A plain "Show all N reviews" button stays underneath as the
   keyboard / no-scroll fallback.

   The summary line states the true number shown, and when Google's own total
   (google_profile.review_count) is bigger than what we've cached, a quiet line
   says so and links to the full list on Google. */
export default function GoogleReviewsFeed({ data = {} }) {
  const { heading = 'Fresh from Google', count = 9 } = data;
  const batch = Math.max(12, Number(count) || 0);
  const [feed, setFeed] = useState(null);
  const [shown, setShown] = useState(batch);
  const [photosOnly, setPhotosOnly] = useState(false);
  const sentinel = useRef(null);

  const profileVersion = useDataVersion('google_profile');
  const testimonialsVersion = useDataVersion('testimonials');
  const blocksVersion = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    loadReviews({ only: 'google', order: 'newest', minLength: 1 }).then((r) => alive && setFeed(r));
    return () => { alive = false; };
  }, [profileVersion, testimonialsVersion, blocksVersion]);

  const reviews = feed?.reviews || null;
  const hasPhotos = useMemo(() => (reviews || []).some((r) => r.photo), [reviews]);
  const pool = useMemo(() => (photosOnly ? (reviews || []).filter((r) => r.photo) : reviews || []), [reviews, photosOnly]);
  const remaining = Math.max(0, pool.length - shown);

  // append the next batch whenever the sentinel under the wall comes near the
  // viewport. Re-observing after every append matters: if the new batch still
  // leaves the sentinel on screen, the fresh observer reports it at once and
  // the next batch follows.
  useEffect(() => {
    if (!reviews || remaining === 0) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setShown(Infinity); return undefined; }
    const el = sentinel.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setShown((n) => n + batch); },
      { rootMargin: '0px 0px 800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reviews, remaining, shown, batch]);

  if (reviews && reviews.length === 0) return null; // nothing cached yet — testimonials carry the page

  const visible = pool.slice(0, shown);
  const total = reviews ? reviews.length : 0;
  const onGoogle = Number(feed?.count) || 0;
  const googleUrl = feed?.mapsUrl || (feed?.placeId ? `https://www.google.com/maps/place/?q=place_id:${feed.placeId}` : '');

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {reviews && (
          <p className="section-sub reviews-feed__summary">
            {onGoogle > total
              ? <>The latest {total} of our {onGoogle} Google reviews, newest first{googleUrl ? <> — <a href={googleUrl} target="_blank" rel="noopener noreferrer">read them all on Google</a></> : null}.</>
              : <>{total === 1 ? '1 review from Google' : `All ${total} reviews from Google`}, newest first.</>}
          </p>
        )}
        {hasPhotos && (
          <div className="testimonials-filter" role="group" aria-label="Filter reviews">
            <button type="button" className={`testimonials-filter__chip ${photosOnly ? '' : 'is-active'}`} aria-pressed={!photosOnly} onClick={() => setPhotosOnly(false)}>All</button>
            <button type="button" className={`testimonials-filter__chip ${photosOnly ? 'is-active' : ''}`} aria-pressed={photosOnly} onClick={() => setPhotosOnly(true)}>With photos</button>
          </div>
        )}
        <div className="testimonials testimonials--masonry testimonials--google">
          {visible.map((r) => (
            <figure key={r.id} className="card testimonial">
              {r.photo && <img className="testimonial__photo" src={r.photo} alt={`Photo from ${r.author}'s review`} loading="lazy" referrerPolicy="no-referrer" />}
              <div className="card__body">
                <div className="testimonial__head">
                  <span className="social-proof__portrait" aria-hidden="true">{r.avatar ? <img src={r.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>{r.author.slice(0, 1)}</span>}</span>
                  <div>
                    <strong>{r.author}</strong>
                    {r.rating ? <StarRating value={r.rating} size={14} /> : null}
                  </div>
                </div>
                <blockquote>“{r.quote}”</blockquote>
                {(r.time || r.url) && (
                  <figcaption className="testimonial__source">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">{r.time || 'See on Google'} · Google</a>
                    ) : (
                      `${r.time} · Google`
                    )}
                  </figcaption>
                )}
              </div>
            </figure>
          ))}
        </div>
        {remaining > 0 && (
          <>
            <div ref={sentinel} className="reviews-feed__sentinel" aria-hidden="true" />
            <p style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setShown(Infinity)}>
                Show all {pool.length} reviews
              </button>
            </p>
          </>
        )}
      </div>
    </Reveal>
  );
}
