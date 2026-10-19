import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  // On the Reviews page the favorites lead the one combined feed
  // (GoogleReviewsFeed), so this separate wall steps aside there.
  const onReviewsPage = /\/reviews\/?$/.test(useLocation().pathname);

  const version = useDataVersion('testimonials');
  const blocksVersion = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    loadReviews({ only: 'curated' }).then((r) => alive && setItems(r.reviews));
    return () => { alive = false; };
  }, [version, blocksVersion]);

  // no hand-picked favorites yet, or they're already in the Reviews feed
  if (onReviewsPage || (items && items.length === 0)) return null;

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
          <div className={`testimonials testimonials--${layout}${visible.length === 4 || visible.length === 2 ? ' testimonials--pairs' : ''}`}>
            {visible.map((t) => (
              <figure key={t.id} className="card testimonial">
                {t.photo && <img className="testimonial__photo" src={t.photo} alt={`Photo from ${t.author}'s review`} loading="lazy" referrerPolicy="no-referrer" />}
                <div className="card__body">
                  <div className="testimonial__head">
                    <span className="social-proof__portrait" aria-hidden="true">
                      {t.avatar ? <img src={t.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>{t.author.slice(0, 1)}</span>}
                    </span>
                    <div>
                      <strong>{t.author}</strong>
                      {t.rating ? <StarRating value={t.rating} size={14} /> : null}
                    </div>
                  </div>
                  <blockquote>“{t.quote}”</blockquote>
                  {t.source ? (
                    <figcaption className="testimonial__source">
                      {t.url ? <a href={t.url} target="_blank" rel="noopener noreferrer">{t.source} review{t.time ? ` · ${t.time}` : ''}</a> : `${t.source} review${t.time ? ` · ${t.time}` : ''}`}
                    </figcaption>
                  ) : null}
                </div>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
