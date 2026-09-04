import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { loadReviews } from '../../lib/reviews.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* Trust strip near the top of the home page: the live Google rating plus a
   slideshow of framed reviews. Which reviews, and in what order, is decided
   once in src/lib/reviews.js — pinned/featured first, then the ones carrying a
   photo, then newest, with anything under the owner's star floor dropped.

   The strip PAGES by whole cards: `perView` cards exactly fill the visible
   width, so a frame is never sliced mid-word at the edge, and one dot == one
   view you can actually land on. Controls sit in a bar UNDER the strip rather
   than floating over it — these are framed pictures, and a chevron parked on
   the molding read like a smudge on the art.

   PAGING MATH (this is what used to make it scroll strangely): a target is
   measured with `offsetLeft`, which is pure layout — it does not move while a
   smooth scroll is in flight. The old code measured live rects and added the
   delta to the CURRENT scrollLeft, so any overlapping scroll (autoplay landing
   on top of a swipe, a dot pressed twice, snap points nudging afterwards) was
   measured against a moving target and the strip drifted a fraction of a card
   off every time, never quite landing on a snap point. Alongside that, a
   `programmatic` guard keeps scroll events from re-deriving the page while WE
   are the ones scrolling, so the dots step once instead of flickering through
   every page in between. */

const AUTOPLAY_MS = 6500;
// how long we consider a smooth scroll "in flight" if scrollend never fires
// (Safari < 17 has no scrollend event)
const SCROLL_SETTLE_MS = 700;

/* Card counts per view, chosen off the CAROUSEL's width (not the viewport) —
   it shares a row with the rating block, so viewport media queries would lie.
   Inside the site's normal `.container`, the widest this strip gets is ~836px,
   so a desktop shows TWO large, comfortably readable framed quotes; the 3-up
   step is there for a wider layout, not something the homepage reaches. Three
   across at 836px would be ~215px of text per card, which puts most of every
   review behind "Read more". */
function perViewFor(width) {
  if (width >= 880) return 3;
  if (width >= 520) return 2;
  return 1;
}
const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function SocialProof({ data = {} }) {
  const { label = 'Loved by the neighborhood', count = 6 } = data;
  const [rating, setRating] = useState(4.9);
  const [mapsUrl, setMapsUrl] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [perView, setPerView] = useState(1);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set());
  const stripRef = useRef(null);
  const carouselRef = useRef(null);
  const rafRef = useRef(0);
  // autoplay stands down while the visitor is reading/touching this strip
  const pausedRef = useRef(false);
  // true from the moment we start a programmatic scroll until it settles
  const programmaticRef = useRef(false);
  const settleTimerRef = useRef(0);
  // autoplay ping-pongs (…→ last → back to first) instead of rewinding the
  // whole strip in one long scroll, which is what a wrap-around looks like
  const dirRef = useRef(1);
  const profileVersion = useDataVersion('google_profile');
  const testimonialsVersion = useDataVersion('testimonials');
  const blocksVersion = useDataVersion('content_blocks');

  useEffect(() => {
    let alive = true;
    // 30 chars minimum: a rating-only review has nothing to frame
    loadReviews({ minLength: 30 }).then((r) => {
      if (!alive) return;
      setRating(r.rating);
      setMapsUrl(r.mapsUrl);
      setQuotes(r.reviews.slice(0, Math.max(3, Number(count) || 6)));
    });
    return () => { alive = false; };
  }, [count, profileVersion, testimonialsVersion, blocksVersion]);

  const pageCount = Math.max(1, Math.ceil(quotes.length / perView));

  // Track the carousel's own width → how many whole cards fit per view.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return undefined;
    const measure = () => setPerView(perViewFor(el.getBoundingClientRect().width));
    measure();
    // no ResizeObserver (jsdom, very old Safari): the one measurement above
    // still gives the right layout, it just won't follow a resize
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Scroll the strip so card `p * perView` sits at the content edge.
     `offsetLeft` is measured from the scroll container's padding box, so
     subtracting the left padding gives the exact scrollLeft that puts the card
     flush with the strip's inner edge — the same place scroll-snap wants it.
     No live rects, no dependence on where the strip currently happens to be. */
  const goTo = useCallback(
    (p, behavior) => {
      const el = stripRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(p, Math.ceil(el.children.length / perView) - 1));
      const target = el.children[Math.min(clamped * perView, el.children.length - 1)];
      if (!target) return;
      const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
      const left = Math.max(0, Math.min(target.offsetLeft - padLeft, el.scrollWidth - el.clientWidth));

      setPage(clamped); // the dots follow the intent, not the animation
      programmaticRef.current = true;
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => { programmaticRef.current = false; }, SCROLL_SETTLE_MS);
      el.scrollTo({ left, behavior: behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth') });
    },
    [perView]
  );

  /* Derive the active page from where the visitor left the strip: whichever
     card sits closest to the content edge. Only ever runs for scrolls WE
     didn't start (see programmaticRef) — otherwise every intermediate frame of
     a smooth scroll would repaint the dots. */
  const readPage = useCallback(() => {
    const el = stripRef.current;
    if (!el || programmaticRef.current) return;
    const max = el.scrollWidth - el.clientWidth;
    const count = Math.ceil(el.children.length / perView);
    if (max <= 4) return setPage(0);
    // at max scroll the last page is short of a full step (a trailing partial
    // page clamps), so pin it explicitly or the dot lags a page behind
    if (el.scrollLeft >= max - 4) return setPage(Math.max(0, count - 1));
    const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const at = el.scrollLeft + padLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < el.children.length; i += 1) {
      const d = Math.abs(el.children[i].offsetLeft - at);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setPage(Math.min(Math.floor(best / perView), Math.max(0, count - 1)));
  }, [perView]);

  function onScroll() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(readPage);
  }
  // scrollend (where supported) ends the guard exactly, instead of on the timer
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return undefined;
    const done = () => { programmaticRef.current = false; };
    el.addEventListener('scrollend', done);
    return () => el.removeEventListener('scrollend', done);
  }, [quotes.length]);
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    window.clearTimeout(settleTimerRef.current);
  }, []);

  // A perView change re-lays the strip out; realign so the active card stays
  // put (instantly — an animated correction on a resize reads as a glitch).
  useEffect(() => {
    if (!quotes.length) return;
    goTo(Math.min(page, pageCount - 1), 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perView, quotes.length]);

  /* Autoplay: one page at a time, reversing at each end so the strip never
     rewinds past everything at once. Held off while the pointer is over the
     strip, while focus is inside it, on a hidden tab, and while a scroll we
     started is still settling. The interval restarts on every page change, so
     a visitor who swipes gets the full dwell time on the card they landed on
     rather than an autoplay firing a moment later. */
  useEffect(() => {
    if (pageCount <= 1 || prefersReducedMotion()) return undefined;
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden || programmaticRef.current) return;
      if (page >= pageCount - 1) dirRef.current = -1;
      else if (page <= 0) dirRef.current = 1;
      goTo(page + dirRef.current);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [page, pageCount, goTo]);

  function onKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(page + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(page - 1); }
  }

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

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
                // a card carrying a photo gives the words less room, so it
                // clips sooner — the picture is the point of that card
                const limit = q.photo ? 140 : 220;
                const isLong = q.quote.length > limit;
                const open = expanded.has(q.id);
                const shown = !isLong || open
                  ? q.quote
                  : `${q.quote.slice(0, limit).trimEnd().replace(/\s+\S*$/, '')}…`;
                return (
                  /* each quote hangs like a small framed note — black molding, wide
                     mat (gallery frame classes), the byline engraved on brass */
                  <li
                    key={q.id}
                    className={`gw-frame__art gw-frame__art--black-mat social-proof__quote${q.photo ? ' social-proof__quote--photo' : ''}`}
                    style={{ '--tint': 'var(--color-paper)' }}
                    role="group"
                    aria-roledescription="review"
                    aria-label={`Review ${i + 1} of ${quotes.length}`}
                  >
                    <div>
                      {q.photo ? (
                        <img
                          className="social-proof__photo"
                          src={q.photo}
                          alt={`Photo from ${q.author}'s review`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="social-proof__mark" aria-hidden="true">❝</span>
                      )}
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
