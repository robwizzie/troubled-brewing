import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { loadReviews } from '../../lib/reviews.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* Owner-curated favorites (optional) — hand-picked quotes owners paste in
   admin; the Google feed below carries the page when this is empty. Quotes
   can carry a photo, and a filter narrows the wall to photo reviews.

   Reads through src/lib/reviews.js like every other review surface, so the
   owner's star floor and hidden/pinned/photo overrides apply here too. */
export default function TestimonialsWall({ data = {} }) {
  const { heading = 'A few of our favorites', layout = 'masonry' } = data;
  const [items, setItems] = useState(null);
  const [photosOnly, setPhotosOnly] = useState(false);

  const version = useDataVersion('testimonials');
  const blocksVersion = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    loadReviews({ only: 'curated' }).then((r) => alive && setItems(r.reviews));
    return () => { alive = false; };
  }, [version, blocksVersion]);

  // no hand-picked favorites yet — the Google feed carries the page
  if (items && items.length === 0) return null;

  const hasPhotos = (items || []).some((t) => t.photo);
  const visible = photosOnly ? items.filter((t) => t.photo) : items;

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {hasPhotos && (
          <div className="testimonials-filter" role="group" aria-label="Filter reviews">
            <button type="button" className={`testimonials-filter__chip ${photosOnly ? '' : 'is-active'}`} aria-pressed={!photosOnly} onClick={() => setPhotosOnly(false)}>All</button>
            <button type="button" className={`testimonials-filter__chip ${photosOnly ? 'is-active' : ''}`} aria-pressed={photosOnly} onClick={() => setPhotosOnly(true)}>With photos</button>
          </div>
        )}
        {items === null ? (
          <SkeletonCards count={3} height={180} />
        ) : (
          <div className={`testimonials testimonials--${layout}`}>
            {visible.map((t) => (
              <figure key={t.id} className="card testimonial">
                {t.photo && <img className="testimonial__photo" src={t.photo} alt={`Photo from ${t.author}'s review`} loading="lazy" referrerPolicy="no-referrer" />}
                <div className="card__body">
                  {t.rating ? <StarRating value={t.rating} /> : null}
                  <blockquote>“{t.quote}”</blockquote>
                  <figcaption>
                    <strong>{t.author}</strong>
                    {t.source ? <span className="testimonial__source"> · {t.source} review</span> : null}
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
