import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getGoogleProfile } from '../../lib/dataService.js';

/* A rotating set of fresh Google reviews from the cached google_profile.reviews
   (Places returns up to 5). Renders nothing extra if none are cached yet. */
export default function GoogleReviewsFeed({ data = {} }) {
  const { heading = 'Fresh from Google', count = 5 } = data;
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    let alive = true;
    getGoogleProfile().then((p) => alive && setReviews(p?.reviews || []));
    return () => { alive = false; };
  }, []);

  if (reviews && reviews.length === 0) return null; // nothing cached yet — testimonials carry the page

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        <div className="grid grid--3">
          {(reviews || []).slice(0, count).map((r, i) => (
            <figure key={i} className="card testimonial">
              <div className="card__body">
                <div className="testimonial__head">
                  {r.profile_photo && <img className="testimonial__avatar" src={r.profile_photo} alt="" loading="lazy" />}
                  <div>
                    <strong>{r.author}</strong>
                    {r.rating ? <StarRating value={r.rating} size={14} /> : null}
                  </div>
                </div>
                <blockquote>“{r.text}”</blockquote>
                {r.time && <figcaption className="testimonial__source">{r.time}</figcaption>}
              </div>
            </figure>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
