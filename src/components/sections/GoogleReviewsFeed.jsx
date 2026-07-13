import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getGoogleProfile, getTestimonials, reviewKey } from '../../lib/dataService.js';

/* Real Google reviews from the cached google_profile.reviews library (the
   Edge Function merges each refresh's top-5 in, so it grows over time).
   Renders a masonry wall a page at a time with a "Show more" control. */
export default function GoogleReviewsFeed({ data = {} }) {
  const { heading = 'Fresh from Google', count = 6 } = data;
  const pageSize = Math.max(3, count);
  const [reviews, setReviews] = useState(null);
  const [shown, setShown] = useState(pageSize);

  useEffect(() => {
    let alive = true;
    // only 4★ and up make the wall — same bar as the homepage carousel.
    // Reviews imported as curated testimonials are dropped here (matched by
    // author+text) so they don't show twice on this page.
    Promise.all([getGoogleProfile(), getTestimonials()]).then(([p, t]) => {
      if (!alive) return;
      const curated = new Set((t || []).map((x) => reviewKey(x.author, x.quote)));
      setReviews((p?.reviews || []).filter((r) => (r.rating ?? 5) >= 4 && !curated.has(reviewKey(r.author, r.text))));
    });
    return () => { alive = false; };
  }, []);

  if (reviews && reviews.length === 0) return null; // nothing cached yet — testimonials carry the page

  const visible = (reviews || []).slice(0, shown);
  const remaining = (reviews?.length || 0) - visible.length;

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        <div className="testimonials testimonials--masonry testimonials--google">
          {visible.map((r, i) => (
            <figure key={i} className="card testimonial">
              <div className="card__body">
                <div className="testimonial__head">
                  {r.profile_photo && <img className="testimonial__avatar" src={r.profile_photo} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                  <div>
                    <strong>{r.author}</strong>
                    {r.rating ? <StarRating value={r.rating} size={14} /> : null}
                  </div>
                </div>
                <blockquote>“{r.text}”</blockquote>
                {r.time && <figcaption className="testimonial__source">{r.time} · Google</figcaption>}
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
