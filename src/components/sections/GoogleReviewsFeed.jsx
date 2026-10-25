import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Reveal from '../Reveal.jsx';
import StarRating from '../StarRating.jsx';
import { loadReviews } from '../../lib/reviews.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SORTS, availableFilters, highlight, pageList, searchTerms, selectReviews } from '../../lib/reviewFilters.js';

/* EVERY real Google review the shop has, straight from the cached
   google_profile.reviews library (the Edge Function pulls the location's full
   review list when the Business Profile is connected), as ONE list: the
   owners' hand-picked favorites lead, marked "Our pick", then every other
   Google review. A favorite that came from Google shows once, as the pick.

   This is the complete list, not a teaser: the only reviews left off are the
   ones the owners chose to leave off — anything below their star floor and
   anything they hid (admin → Reviews; the rules live once in
   src/lib/reviews.js). Star-only ratings with no words are skipped.

   Visitors slice it with a toolbar (src/lib/reviewFilters.js):
     · search      every word must appear in the review or the reviewer's
                   name; matches are highlighted
     · sort        Recommended (picks, then newest) · newest · oldest ·
                   highest rated · most detailed
     · chips       All · Our picks · With photos · 5 stars, plus topic chips
                   (Coffee, Food, Matcha & tea…) that only appear when enough
                   reviews mention them; each shows its count
   and pages through it, PER_PAGE at a time, with numbered pages. The page,
   sort, chip and search live in the URL (?page=&sort=&show=&q=), so a sliced
   view can be shared and the back button keeps your place. Changing page
   brings the top of the list back into view.

   Long reviews are clamped with "Read more". The summary line states the true
   number shown; when Google's own total is bigger than what's cached, it says
   so and links to the full list on Google. */
const LEGACY_HEADING = 'Fresh from Google';
const DEFAULT_HEADING = 'Every review, in one place';
const LONG_QUOTE = 420; // characters; longer reviews get "Read more"

const SORT_IDS = new Set(SORTS.map((s) => s.id));

/** The view in the address bar (only on /reviews — tests and previews have no URL to keep). */
function readUrlState() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    page: Math.max(1, parseInt(p.get('page'), 10) || 1),
    sort: SORT_IDS.has(p.get('sort')) ? p.get('sort') : 'recommended',
    filter: p.get('show') || 'all',
    query: p.get('q') || '',
  };
}
function writeUrlState({ page, sort, filter, query }) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  const set = (k, v, dflt) => (v && v !== dflt ? url.searchParams.set(k, String(v)) : url.searchParams.delete(k));
  set('page', page, 1);
  set('sort', sort, 'recommended');
  set('show', filter, 'all');
  set('q', query.trim(), '');
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
}

function Quote({ text, terms }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG_QUOTE;
  const parts = highlight(text, terms);
  return (
    <>
      <blockquote className={long && !open ? 'reviews-feed__quote is-clamped' : 'reviews-feed__quote'}>
        “{parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}”
      </blockquote>
      {long && (
        <button type="button" className="reviews-feed__more-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
}

function ReviewCard({ r, terms }) {
  return (
    <figure className={`card testimonial${r.favorite ? ' testimonial--pick' : ''}`}>
      {r.favorite && <span className="testimonial__pick">★ Our pick</span>}
      {r.photo && <img className="testimonial__photo" src={r.photo} alt={`Photo from ${r.author}'s review`} loading="lazy" referrerPolicy="no-referrer" />}
      <div className="card__body">
        <div className="testimonial__head">
          <span className="social-proof__portrait" aria-hidden="true">{r.avatar ? <img src={r.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>{r.author.slice(0, 1)}</span>}</span>
          <div>
            <strong>{r.author}</strong>
            {r.rating ? <StarRating value={r.rating} size={14} /> : null}
          </div>
        </div>
        <Quote text={r.quote} terms={terms} />
        {(r.time || r.url) && (
          <figcaption className="testimonial__source">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer">{r.time || 'See on Google'} · {r.source || 'Google'}</a>
            ) : (
              `${r.time} · ${r.source || 'Google'}`
            )}
          </figcaption>
        )}
      </div>
    </figure>
  );
}

function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className="reviews-pager" aria-label="Review pages">
      <button type="button" className="reviews-pager__step" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        <span aria-hidden="true">‹</span> Previous
      </button>
      <ol className="reviews-pager__pages">
        {pageList(page, pages).map((p, i) => (
          <li key={`${p}-${i}`}>
            {p === '…' ? (
              <span className="reviews-pager__gap" aria-hidden="true">…</span>
            ) : (
              <button
                type="button"
                className={`reviews-pager__num${p === page ? ' is-current' : ''}`}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="reviews-pager__step" onClick={() => onPage(page + 1)} disabled={page >= pages}>
        Next <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
}

export default function GoogleReviewsFeed({ data = {} }) {
  const { count = 9 } = data;
  const heading = !data.heading || data.heading === LEGACY_HEADING ? DEFAULT_HEADING : data.heading;
  const perPage = Math.max(12, Number(count) || 0);
  const initial = useMemo(readUrlState, []);
  const [feed, setFeed] = useState(null);
  const [page, setPage] = useState(initial.page || 1);
  const [sort, setSort] = useState(initial.sort || 'recommended');
  const [filter, setFilter] = useState(initial.filter || 'all');
  const [query, setQuery] = useState(initial.query || '');
  const topRef = useRef(null);
  const searchId = useId();
  const sortId = useId();

  const profileVersion = useDataVersion('google_profile');
  const testimonialsVersion = useDataVersion('testimonials');
  const blocksVersion = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    Promise.all([
      loadReviews({ only: 'curated', minLength: 1 }),
      loadReviews({ only: 'google', order: 'newest', minLength: 1 }),
    ]).then(([picks, google]) => {
      if (!alive) return;
      const pickKeys = new Set(picks.reviews.map((r) => r.key));
      const favorites = picks.reviews.map((r) => ({ ...r, favorite: true }));
      const rest = google.reviews.filter((r) => !pickKeys.has(r.key));
      setFeed({ ...google, reviews: [...favorites, ...rest], favoriteCount: favorites.length, googleCount: google.reviews.length });
    });
    return () => { alive = false; };
  }, [profileVersion, testimonialsVersion, blocksVersion]);

  const reviews = feed?.reviews || null;
  const chips = useMemo(() => availableFilters(reviews), [reviews]);
  // a stale ?show= (a topic that no longer has enough reviews) falls back to All
  const activeFilter = chips.some((c) => c.id === filter) ? filter : 'all';
  const terms = useMemo(() => searchTerms(query), [query]);
  const results = useMemo(() => selectReviews(reviews, { filter: activeFilter, sort, query }), [reviews, activeFilter, sort, query]);
  const pages = Math.max(1, Math.ceil(results.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const visible = results.slice(start, start + perPage);

  useEffect(() => {
    if (reviews) writeUrlState({ page: current, sort, filter: activeFilter, query });
  }, [reviews, current, sort, activeFilter, query]);

  if (reviews && reviews.length === 0) return null; // nothing to show yet

  const narrowed = activeFilter !== 'all' || terms.length > 0;
  function goTo(p) {
    setPage(Math.min(Math.max(1, p), pages));
    const el = topRef.current;
    if (el?.scrollIntoView) {
      const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }
  const reset = () => { setFilter('all'); setQuery(''); setPage(1); };

  const total = feed?.googleCount || 0;
  const favCount = feed?.favoriteCount || 0;
  const onGoogle = Number(feed?.count) || 0;
  const googleUrl = feed?.mapsUrl || (feed?.placeId ? `https://www.google.com/maps/place/?q=place_id:${feed.placeId}` : '');
  const sortLabel = SORTS.find((s) => s.id === sort)?.label.toLowerCase() || '';

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {reviews && (
          <p className="section-sub reviews-feed__summary">
            {onGoogle > total
              ? <>{total} of our {onGoogle} Google reviews{googleUrl ? <> — <a href={googleUrl} target="_blank" rel="noopener noreferrer">read them all on Google</a></> : null}.</>
              : <>{total === 1 ? '1 review from Google' : `All ${total} reviews from Google`}.</>}
            {favCount > 0 && <> Our own favorites lead the way.</>}
          </p>
        )}

        {reviews && reviews.length > 1 && (
          <div className="reviews-toolbar" ref={topRef}>
            <div className="reviews-toolbar__row">
              <div className="reviews-toolbar__search">
                <label htmlFor={searchId} className="sr-only">Search reviews</label>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                <input
                  id={searchId}
                  type="search"
                  placeholder="Search reviews — try “matcha” or “muffin”"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                />
              </div>
              <div className="reviews-toolbar__sort">
                <label htmlFor={sortId}>Sort</label>
                <select id={sortId} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            {chips.length > 1 && (
              <div className="testimonials-filter reviews-toolbar__chips" role="group" aria-label="Filter reviews">
                {chips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`testimonials-filter__chip ${activeFilter === c.id ? 'is-active' : ''}`}
                    aria-pressed={activeFilter === c.id}
                    onClick={() => { setFilter(c.id); setPage(1); }}
                  >
                    {c.label} <span className="reviews-toolbar__count">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="reviews-toolbar__status" role="status" aria-live="polite">
              {results.length === 0
                ? 'No reviews match that.'
                : results.length <= perPage
                  ? `Showing ${results.length === 1 ? '1 review' : `all ${results.length} reviews`}${narrowed ? ' that match' : ''}, ${sortLabel}.`
                  : `Showing ${start + 1}–${start + visible.length} of ${results.length} reviews${narrowed ? ' that match' : ''}, ${sortLabel}.`}
              {narrowed && <> <button type="button" className="reviews-toolbar__clear" onClick={reset}>Clear filters</button></>}
            </p>
          </div>
        )}

        {results.length === 0 && reviews ? (
          <div className="reviews-feed__empty">
            <p>Nothing matches {terms.length ? <>“{query.trim()}”</> : 'that filter'} yet.</p>
            <button type="button" className="btn btn--ghost" onClick={reset}>Show every review</button>
          </div>
        ) : (
          <div className="testimonials testimonials--masonry testimonials--google">
            {visible.map((r) => <ReviewCard key={r.id} r={r} terms={terms} />)}
          </div>
        )}

        <Pager page={current} pages={pages} onPage={goTo} />
      </div>
    </Reveal>
  );
}
