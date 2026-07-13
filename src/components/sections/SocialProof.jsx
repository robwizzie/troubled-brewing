import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getGoogleProfile, getTestimonials, reviewKey } from '../../lib/dataService.js';

/* Trust strip near the top of the home page: the live Google rating plus a
   slideshow of framed reviews — real Google reviews first (quality-gated),
   curated testimonials after, up to six. Scroll-snap does the sliding; the
   overlaid brass chevrons page a card at a time (disabled at the ends) and
   the dots track + jump to a card. */
export default function SocialProof({ data = {} }) {
  const { label = 'Loved by the neighborhood' } = data;
  const [profile, setProfile] = useState(null);
  const [quotes, setQuotes] = useState([]);
  // dots mark scroll STOPS, not cards — on desktop ~2.5 cards share a view,
  // so per-card dots would include dead ones that never light up
  const [pos, setPos] = useState({ atStart: true, atEnd: false, index: 0, stops: 1 });
  const [expanded, setExpanded] = useState(() => new Set());
  const stripRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getGoogleProfile(), getTestimonials()]).then(([p, t]) => {
      if (!alive) return;
      setProfile(p);
      // featured first, then the rest — the slideshow has room for everyone
      const all = t || [];
      const curated = [...all.filter((q) => q.featured), ...all.filter((q) => !q.featured)];
      // Real Google reviews first — 4★+ with an actual quote (rating-only
      // reviews have nothing to frame); curated favorites fill out the set.
      // A review the owners imported as a testimonial is dropped from the
      // Google side (same author+text) so a quote never hangs twice.
      // Full text is kept: the card clips it behind a Read-more toggle.
      const curatedKeys = new Set(curated.map((q) => reviewKey(q.author, q.quote)));
      const google = (p?.reviews || [])
        .map((r, i) => ({ ...r, text: String(r.text || '').replace(/\s+/g, ' ').trim(), i }))
        .filter((r) => (r.rating ?? 5) >= 4 && r.text.length >= 30 && !curatedKeys.has(reviewKey(r.author, r.text)))
        .map((r) => ({ id: `g-${r.i}`, quote: r.text, author: r.author, source: 'Google' }));
      setQuotes([...google, ...curated].slice(0, 6));
    });
    return () => { alive = false; };
  }, []);

  // One "step" = a card width + the strip gap (16px = --space-4).
  function stepWidth(el) {
    const card = el.querySelector('.social-proof__quote');
    return card ? card.getBoundingClientRect().width + 16 : 300;
  }
  // Track scroll position → chevron disabled states + the active dot.
  function readPos() {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const w = stepWidth(el);
    const stops = max > 8 ? Math.ceil(max / w) + 1 : 1;
    const atEnd = el.scrollLeft >= max - 4;
    setPos({
      atStart: el.scrollLeft <= 4,
      atEnd,
      stops,
      // the last stop is the clamped max-scroll position, shy of a full step
      index: atEnd ? stops - 1 : Math.min(Math.round(el.scrollLeft / w), stops - 1),
    });
  }
  function onScroll() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(readPos);
  }
  useEffect(() => { readPos(); }, [quotes]);
  useEffect(() => {
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('resize', onScroll); cancelAnimationFrame(rafRef.current); };
  }, []);

  function step(dir) {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * stepWidth(el), behavior: 'smooth' });
  }
  function jumpTo(i) {
    const el = stripRef.current;
    if (!el) return;
    el.scrollTo({ left: i * stepWidth(el), behavior: 'smooth' });
  }

  const rating = profile?.rating || 4.9;
  const mapsUrl = profile?.maps_url;
  const slides = pos.stops > 1; // controls only when the strip actually scrolls

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
            <ul className="social-proof__quotes" ref={stripRef} onScroll={onScroll} aria-label="Reviews">
              {quotes.map((q) => {
                const isLong = q.quote.length > 190;
                const open = expanded.has(q.id);
                const shown = !isLong || open ? q.quote : `${q.quote.slice(0, 190).trimEnd().replace(/\s+\S*$/, '')}…`;
                return (
                  /* each quote hangs like a small framed note — black molding, wide
                     mat (gallery frame classes), the byline engraved on brass */
                  <li key={q.id} className="gw-frame__art gw-frame__art--black-mat social-proof__quote" style={{ '--tint': 'var(--color-paper)' }}>
                    <div>
                      <span className="social-proof__mark" aria-hidden="true">❝</span>
                      <p className="social-proof__text">{shown}</p>
                      {isLong && (
                        <button
                          type="button"
                          className="social-proof__more"
                          aria-expanded={open}
                          onClick={() => setExpanded((s) => { const n = new Set(s); if (open) n.delete(q.id); else n.add(q.id); return n; })}
                        >
                          {open ? 'Show less' : 'Read more'}
                        </button>
                      )}
                      <p className="social-proof__author"><span className="brass-plate">{q.author}{q.source ? ` · ${q.source}` : ''}</span></p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {slides && (
              <>
                <button type="button" className="social-proof__navbtn social-proof__navbtn--prev" aria-label="Previous review" disabled={pos.atStart} onClick={() => step(-1)}>‹</button>
                <button type="button" className="social-proof__navbtn social-proof__navbtn--next" aria-label="Next review" disabled={pos.atEnd} onClick={() => step(1)}>›</button>
                <div className="social-proof__dots" role="tablist" aria-label="Reviews position">
                  {Array.from({ length: pos.stops }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-label={`Go to position ${i + 1} of ${pos.stops}`}
                      aria-selected={pos.index === i}
                      className={`social-proof__dot ${pos.index === i ? 'is-active' : ''}`}
                      onClick={() => jumpTo(i)}
                    />
                  ))}
                </div>
              </>
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
