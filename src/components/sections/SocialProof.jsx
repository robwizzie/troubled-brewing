import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { getGoogleProfile, getTestimonials, reviewKey } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* Trust strip near the top of the home page: the live Google rating plus a
   slideshow of framed reviews — real Google reviews first (quality-gated),
   curated testimonials after, up to six.

   The strip PAGES by whole cards: `perView` cards exactly fill the visible
   width, so a frame is never sliced mid-word at the edge, and one dot == one
   view you can actually land on. Controls sit in a bar UNDER the strip rather
   than floating over it — these are framed pictures, and a chevron parked on
   the molding read like a smudge on the art. */

const AUTOPLAY_MS = 6500;
// Card counts per view, chosen off the CAROUSEL's width (not the viewport) —
// it shares a row with the rating block, so viewport media queries would lie.
function perViewFor(width) {
  if (width >= 880) return 3;
  if (width >= 520) return 2;
  return 1;
}
const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function SocialProof({ data = {} }) {
  const { label = 'Loved by the neighborhood' } = data;
  const [profile, setProfile] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [perView, setPerView] = useState(1);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set());
  const stripRef = useRef(null);
  const carouselRef = useRef(null);
  const rafRef = useRef(0);
  // autoplay stands down while the visitor is reading//touching this strip
  const pausedRef = useRef(false);
  const profileVersion = useDataVersion('google_profile');
  const testimonialsVersion = useDataVersion('testimonials');

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
  }, [profileVersion, testimonialsVersion]);

  const pageCount = Math.max(1, Math.ceil(quotes.length / perView));

  // Track the carousel's own width → how many whole cards fit per view.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const measure = () => setPerView(perViewFor(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Left edge of the strip's content box — where a card sits when it's "first".
  const contentLeft = (el) =>
    el.getBoundingClientRect().left + (parseFloat(getComputedStyle(el).paddingLeft) || 0);

  const goTo = useCallback(
    (p, behavior) => {
      const el = stripRef.current;
      if (!el) return;
      const cards = el.children;
      const target = cards[Math.min(p * perView, cards.length - 1)];
      if (!target) return;
      const delta = target.getBoundingClientRect().left - contentLeft(el);
      el.scrollTo({
        left: el.scrollLeft + delta,
        behavior: behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth'),
      });
    },
    [perView]
  );

  // Derive the active page from scroll position: whichever card sits closest to
  // the content edge. At max scroll the last page is short of a full step (a
  // trailing partial page clamps), so pin it explicitly or the dot lags behind.
  const readPage = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) return setPage(0);
    if (el.scrollLeft >= max - 4) return setPage(pageCount - 1);
    const left = contentLeft(el);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < el.children.length; i += 1) {
      const d = Math.abs(el.children[i].getBoundingClientRect().left - left);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setPage(Math.min(Math.floor(best / perView), pageCount - 1));
  }, [perView, pageCount]);

  function onScroll() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(readPage);
  }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // A perView change re-lays the strip out; realign so the active card stays put.
  useEffect(() => {
    if (!quotes.length) return;
    goTo(Math.min(page, pageCount - 1), 'auto');
    readPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perView, quotes.length]);

  // Autoplay: advance a page, wrapping at the end. Held off while the pointer
  // is over the strip, while focus is inside it, and on a hidden tab.
  useEffect(() => {
    if (pageCount <= 1 || prefersReducedMotion()) return;
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      goTo((page + 1) % pageCount);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [page, pageCount, goTo]);

  function onKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(page + 1, pageCount - 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(page - 1, 0)); }
  }

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  const rating = profile?.rating || 4.9;
  const mapsUrl = profile?.maps_url;
  const slides = pageCount > 1; // controls only when there's somewhere to go

  return (
    <Reveal as="section" className="section section--tight">
      <div className="container">
        <div className="social-proof">
          <div className="social-proof__rating">
            <span className="social-proof__eyebrow">Community reviews</span>
            <span className="social-proof__num">{rating.toFixed(1)}</span>
            <StarRating value={rating} size={20} />
            <span className="social-proof__label">{label}</span>
            <Link className="social-proof__link" to="/reviews">Read the reviews</Link>
          </div>
          <div
            className="social-proof__carousel"
            ref={carouselRef}
            style={{ '--per-view': perView }}
            role="group"
            aria-roledescription="carousel"
            aria-label="What the neighborhood says"
            onPointerEnter={pause}
            onPointerLeave={resume}
            onPointerDown={pause}
            onFocusCapture={pause}
            onBlurCapture={resume}
          >
            <ul
              className="social-proof__quotes"
              ref={stripRef}
              onScroll={onScroll}
              onKeyDown={onKeyDown}
              tabIndex={slides ? 0 : -1}
              aria-label="Reviews"
            >
              {quotes.map((q, i) => {
                const isLong = q.quote.length > 220;
                const open = expanded.has(q.id);
                const shown = !isLong || open
                  ? q.quote
                  : `${q.quote.slice(0, 220).trimEnd().replace(/\s+\S*$/, '')}…`;
                return (
                  /* each quote hangs like a small framed note — black molding, wide
                     mat (gallery frame classes), the byline engraved on brass */
                  <li
                    key={q.id}
                    className="gw-frame__art gw-frame__art--black-mat social-proof__quote"
                    style={{ '--tint': 'var(--color-paper)' }}
                    role="group"
                    aria-roledescription="review"
                    aria-label={`Review ${i + 1} of ${quotes.length}`}
                  >
                    <div>
                      <span className="social-proof__mark" aria-hidden="true">❝</span>
                      <p className="social-proof__text">{shown}</p>
                      {isLong && (
                        <button
                          type="button"
                          className="social-proof__more"
                          aria-expanded={open}
                          onClick={() => setExpanded((current) => {
                            const next = new Set(current);
                            if (open) next.delete(q.id); else next.add(q.id);
                            return next;
                          })}
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
              /* one control bar, same on touch and mouse — the arrows never sit
                 over the frames, and the dots read as pages you can land on */
              <div className="social-proof__controls">
                <button
                  type="button"
                  className="social-proof__navbtn"
                  aria-label="Previous reviews"
                  disabled={page === 0}
                  onClick={() => goTo(page - 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 5-7 7 7 7" />
                  </svg>
                </button>
                <div className="social-proof__dots">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to review page ${i + 1} of ${pageCount}`}
                      aria-current={page === i}
                      className={`social-proof__dot ${page === i ? 'is-active' : ''}`}
                      onClick={() => goTo(i)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="social-proof__navbtn"
                  aria-label="Next reviews"
                  disabled={page === pageCount - 1}
                  onClick={() => goTo(page + 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9.5 5 7 7-7 7" />
                  </svg>
                </button>
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
