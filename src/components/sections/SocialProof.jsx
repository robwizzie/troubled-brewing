import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getGoogleProfile, getTestimonials } from '../../lib/dataService.js';

/* Trust strip near the top of the home page: the live Google rating plus a
   swipeable CAROUSEL of framed reviews — real Google reviews first (quality-
   gated), curated testimonials after, up to six. Scroll-snap does the work;
   the brass chevrons nudge a card at a time for mouse users. */
export default function SocialProof({ data = {} }) {
  const { label = 'Loved by the neighborhood' } = data;
  const [profile, setProfile] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const stripRef = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getGoogleProfile(), getTestimonials()]).then(([p, t]) => {
      if (!alive) return;
      setProfile(p);
      const featured = (t || []).filter((q) => q.featured);
      const curated = featured.length ? featured : t || [];
      // Real Google reviews first, quality-gated so a terse "ok." or a rant
      // never lands in a frame; curated testimonials fill out the carousel.
      const google = (p?.reviews || [])
        .map((r, i) => ({ ...r, text: String(r.text || '').replace(/\s+/g, ' ').trim(), i }))
        .filter((r) => (r.rating ?? 5) >= 4 && r.text.length >= 40 && r.text.length <= 220)
        .map((r) => ({ id: `g-${r.i}`, quote: r.text, author: r.author, source: 'Google' }));
      setQuotes([...google, ...curated].slice(0, 6));
    });
    return () => { alive = false; };
  }, []);

  const rating = profile?.rating || 4.9;
  const mapsUrl = profile?.maps_url;

  function nudge(dir) {
    const el = stripRef.current;
    if (!el) return;
    const card = el.querySelector('.social-proof__quote');
    const step = card ? card.getBoundingClientRect().width + 16 : 300;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

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
          <div className="social-proof__carousel">
            <ul className="social-proof__quotes" ref={stripRef} aria-label="Reviews">
              {quotes.map((q) => (
                /* each quote hangs like a small framed note — black molding, wide
                   mat (gallery frame classes), the byline engraved on brass */
                <li key={q.id} className="gw-frame__art gw-frame__art--black-mat social-proof__quote" style={{ '--tint': 'var(--color-paper)' }}>
                  <div>
                    <p className="social-proof__text">&ldquo;{q.quote}&rdquo;</p>
                    <p className="social-proof__author"><span className="brass-plate">{q.author}{q.source ? ` · ${q.source}` : ''}</span></p>
                  </div>
                </li>
              ))}
            </ul>
            {quotes.length > 2 && (
              <div className="social-proof__nav">
                <button type="button" className="social-proof__navbtn" aria-label="Previous review" onClick={() => nudge(-1)}>‹</button>
                <button type="button" className="social-proof__navbtn" aria-label="Next review" onClick={() => nudge(1)}>›</button>
              </div>
            )}
          </div>
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
