import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getGoogleProfile, getTestimonials } from '../../lib/dataService.js';

/* Compact trust strip near the top of the home page: the live Google rating plus
   a couple of featured neighbor reviews. Rating + reviews come from the same
   sources as the Reviews page, so it's always in sync. */
export default function SocialProof({ data = {} }) {
  const { label = 'Loved by the neighborhood' } = data;
  const [profile, setProfile] = useState(null);
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([getGoogleProfile(), getTestimonials()]).then(([p, t]) => {
      if (!alive) return;
      setProfile(p);
      const featured = (t || []).filter((q) => q.featured);
      setQuotes((featured.length ? featured : t || []).slice(0, 2));
    });
    return () => { alive = false; };
  }, []);

  const rating = profile?.rating || 4.9;
  const mapsUrl = profile?.maps_url;

  return (
    <Reveal as="section" className="section section--tight">
      <div className="container">
        <div className="social-proof">
          <div className="social-proof__rating">
            <span className="social-proof__num">{rating.toFixed(1)}</span>
            <StarRating value={rating} size={20} />
            <span className="social-proof__label">{label}</span>
            <Link className="social-proof__link" to="/reviews">Read the reviews</Link>
          </div>
          <ul className="social-proof__quotes">
            {quotes.map((q) => (
              <li key={q.id} className="social-proof__quote">
                <p className="social-proof__text">&ldquo;{q.quote}&rdquo;</p>
                <p className="social-proof__author">{q.author}{q.source ? ` · ${q.source}` : ''}</p>
              </li>
            ))}
          </ul>
        </div>
        {mapsUrl && (
          <p className="sr-only">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">See all reviews on Google</a>
          </p>
        )}
      </div>
    </Reveal>
  );
}
