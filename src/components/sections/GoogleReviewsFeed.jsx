import { useEffect, useMemo, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { loadReviews } from '../../lib/reviews.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* Every real Google review the shop has, straight from the cached
   google_profile.reviews library (the Edge Function merges each refresh's
   top-5 in, so it grows toward the full set). Which ones are allowed on the
   page — the star floor, anything the owners hid, the photos they attached —
   is decided once in src/lib/reviews.js, the same rules the homepage strip
   uses, so the two can never disagree.

   Renders a masonry wall a page at a time, with a "with photos" filter once
   any review carries one. */
export default function GoogleReviewsFeed({ data = {} }) {
  const { heading = 'Fresh from Google', count = 9 } = data;
  const pageSize = Math.max(3, Number(count) || 9);
  const [reviews, setReviews] = useState(null);
  const [shown, setShown] = useState(pageSize);
  const [photosOnly, setPhotosOnly] = useState(false);

  const profileVersion = useDataVersion('google_profile');
  const testimonialsVersion = useDataVersion('testimonials');
  const blocksVersion = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    // Google only: the hand-picked favorites already have their own wall
    // above, and a review imported as a testimonial is dropped from this side
    // by loadReviews so a quote never hangs twice on one page.
    loadReviews({ only: 'google' }).then((r) => alive && setReviews(r.reviews));
    return () => { alive = false; };
  }, [profileVersion, testimonialsVersion, blocksVersion]);

  const hasPhotos = useMemo(() => (reviews || []).some((r) => r.photo), [reviews]);
  const pool = photosOnly ? (reviews || []).filter((r) => r.photo) : reviews || [];

  if (reviews && reviews.length === 0) return null; // nothing cached yet — testimonials carry the page

  const visible = pool.slice(0, shown);
  const remaining = pool.length - visible.length;

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
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
                  {r.avatar && <img className="testimonial__avatar" src={r.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />}
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
          <p style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setShown((n) => n + pageSize)}>
              Show more reviews ({remaining})
            </button>
          </p>
        )}
      </div>
    </Reveal>
  );
}
