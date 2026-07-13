import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getTestimonials } from '../../lib/dataService.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* Owner-curated favorites (optional) — hand-picked quotes owners paste in
   admin; the Google feed below carries the page when this is empty. */
export default function TestimonialsWall({ data = {} }) {
  const { heading = 'A few of our favorites', layout = 'masonry' } = data;
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    getTestimonials().then((t) => alive && setItems(t));
    return () => { alive = false; };
  }, []);

  // no hand-picked favorites yet — the Google feed carries the page
  if (items && items.length === 0) return null;

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {items === null ? (
          <SkeletonCards count={3} height={180} />
        ) : (
          <div className={`testimonials testimonials--${layout}`}>
            {items.map((t) => (
              <figure key={t.id} className="card testimonial">
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
