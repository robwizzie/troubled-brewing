import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics.js';
import { asset } from '../../lib/config.js';
import { SITE } from '../../lib/seed.js';
import { categoryLabel, directionsUrl, initials, streetName, streetNumber } from '../../lib/localBusinesses.js';
import { awningFor, buildWalk } from '../../lib/stationAve.js';

/* Local Love as a walk down Station Ave.

   The neighbors are drawn as little storefronts along an illustrated street,
   in real street-number order: our side of the road (the even numbers, with
   our own door at 514 and a "You are here" pin over it) along the top, the
   odd-numbered side across the road underneath, each shop under the door it
   faces. Places off Station Ave come last, under an "Around town" sign. The
   strip scrolls sideways; tapping a storefront slides its details up
   underneath (never a modal — the street stays usable), and stepping to the
   previous / next door slides the street along so that storefront is in view.

   Interaction rules, because a sideways scroller is easy to make annoying:
   - touch: plain native scrolling, snapping storefront by storefront;
   - mouse: drag to scroll; the vertical wheel moves the street ONLY while the
     pointer is over it AND it can still move that way — at either end the
     wheel goes back to scrolling the page, so the page is never trapped;
   - keyboard: every storefront is a button in tab order, arrow keys / Home /
     End walk between them, and the prev/next buttons page the street.

   Everything a row might lack degrades: no photo → a lit, drawn shop window;
   no logo → a painted monogram on the hanging sign. (No website → not listed
   at all; see orderBusinesses.) */

const reduceMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* grid rows: 1 our side's buildings, 2 our sidewalk, 3 the road,
   4 the far side's buildings, 5 their sidewalk */
const ROWS = { main: 1, across: 4 };
const place = (s, extra = {}) => ({ gridColumn: s.col, gridRow: ROWS[s.side] ?? 1, ...extra });

/* ---- the drawn bits ------------------------------------------------------ */

function Glyph({ category }) {
  // a little line drawing in the shop window when there's no photo
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (category) {
    case 'restaurant':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}>
          <path d="M15 8v13a4 4 0 0 0 8 0V8M19 8v32" />
          <path d="M33 40V8c-4 3-6 9-6 15h6" />
        </g></svg>
      );
    case 'cafe':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}>
          <path d="M9 18h24v10a10 10 0 0 1-10 10h-4A10 10 0 0 1 9 28z" />
          <path d="M33 21h3a5 5 0 0 1 0 10h-4M17 6c-2 3 2 5 0 8M24 6c-2 3 2 5 0 8" />
        </g></svg>
      );
    case 'retail':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}>
          <path d="M10 17h28l-2 23H12z" />
          <path d="M18 21v-6a6 6 0 0 1 12 0v6" />
        </g></svg>
      );
    case 'bakery':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}>
          <path d="M8 30c4-12 28-12 32 0-6 4-26 4-32 0z" />
          <path d="M18 22l3 9M26 21l-1 10M33 25l-4 7" />
        </g></svg>
      );
    case 'bar':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}>
          <path d="M12 9h24l-12 16zM24 25v13M16 39h16" />
        </g></svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}>
          <path d="M24 39S9 30 9 19a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 11-15 20-15 20z" />
        </g></svg>
      );
  }
}

/* Anthony's patio: two orange market umbrellas over little tables */
function Umbrellas() {
  return (
    <svg className="shop__umbrellas" viewBox="0 0 120 60" aria-hidden="true">
      {[26, 92].map((x) => (
        <g key={x}>
          <path d={`M${x - 24} 22 Q${x} 1 ${x + 24} 22 Z`} fill="#e0793a" />
          <path d={`M${x - 24} 22 Q${x - 12} 27 ${x} 22 Q${x + 12} 27 ${x + 24} 22`} fill="#c25c24" />
          <path d={`M${x} 3 V22 M${x - 12} 9 L${x - 12} 23 M${x + 12} 9 L${x + 12} 23`} stroke="#b4511d" strokeWidth="0.8" />
          <rect x={x - 0.9} y="20" width="1.8" height="38" fill="#2c2722" />
          <rect x={x - 10} y="43" width="20" height="2.4" rx="1" fill="#2c2722" />
          <path d={`M${x - 7} 45 v13 M${x + 7} 45 v13`} stroke="#2c2722" strokeWidth="1.4" />
        </g>
      ))}
    </svg>
  );
}

function Storefront({ stop, index, selected, onSelect }) {
  const { b, n } = stop;
  const [logoOk, setLogoOk] = useState(true);
  const [photoOk, setPhotoOk] = useState(true);
  const { look, roof, tall, awning = 'stripe', umbrellas, sign } = stop.building;
  const [awn, awnAlt] = awningFor(b.category);
  const cat = categoryLabel(b.category);
  const offAve = n == null || !/station/i.test(b.address || '');
  const style = place(stop, {
    '--wall': look.wall, '--trim': look.trim, '--sign': look.sign, '--ink': look.ink, '--roof': look.roof,
    '--awn': awn, '--awn-alt': awnAlt, '--i': Math.min(index, 9),
  });
  const board = offAve ? (b.address ? streetName(b.address) : '') : cat;
  return (
    <li className={`ave__stop ave__stop--${stop.side}${selected ? ' is-selected' : ''}`} style={style}>
      <button
        type="button"
        className={`shop shop--${look.tex} shop--roof-${roof} shop--tall-${tall} shop--awning-${awning}`}
        aria-pressed={selected}
        aria-controls="ave-detail"
        aria-label={`${b.name}${b.address ? `, ${b.address}` : ''}${cat ? ` — ${cat}` : ''}`}
        data-stop={stop.id}
        onClick={() => onSelect(stop.id)}
      >
        <span className="shop__roof" aria-hidden="true" />
        <span className="shop__upper" aria-hidden="true">
          <i /><i />
          <span className="shop__blade">
            {b.logo_url && logoOk ? (
              <img src={b.logo_url} alt="" draggable="false" loading="lazy" referrerPolicy="no-referrer" onError={() => setLogoOk(false)} />
            ) : (
              <span className="shop__mono">{initials(b.name)}</span>
            )}
          </span>
        </span>
        <span className="shop__sign" aria-hidden="true"><span>{sign || b.name}</span></span>
        {awning !== 'none' && <span className="shop__awning" aria-hidden="true" />}
        <span className="shop__ground" aria-hidden="true">
          <span className={`shop__window${b.photo_url && photoOk ? ' has-photo' : ''}`}>
            {b.photo_url && photoOk ? (
              <img src={b.photo_url} alt="" draggable="false" loading="lazy" referrerPolicy="no-referrer" onError={() => setPhotoOk(false)} />
            ) : (
              <Glyph category={b.category} />
            )}
          </span>
          <span className="shop__door">
            <span className="shop__transom">{offAve ? '' : n}</span>
          </span>
        </span>
        {umbrellas && <Umbrellas />}
      </button>
      {board && <span className={`ave__board${offAve ? ' ave__board--street' : ''}`} aria-hidden="true">{board}</span>}
    </li>
  );
}

/* The sign over our door, after the real one: a white enamel plaque with
   scrolled corners and a black keyline, carrying the actual wordmark, with
   COFFEE HOUSE underneath. */
function OurSign() {
  const plate = 'M15 3 H185 A11 11 0 0 0 197 15 V95 A11 11 0 0 0 185 107 H15 A11 11 0 0 0 3 95 V15 A11 11 0 0 0 15 3 Z';
  const inner = 'M18 9 H182 A8 8 0 0 0 191 18 V92 A8 8 0 0 0 182 101 H18 A8 8 0 0 0 9 92 V18 A8 8 0 0 0 18 9 Z';
  const curls = [[1, 1, 13, 13], [-1, 1, 187, 13], [-1, -1, 187, 97], [1, -1, 13, 97]];
  return (
    <svg className="tb__sign" viewBox="0 0 200 110" aria-hidden="true">
      <path d={plate} fill="#fbfaf6" stroke="#191512" strokeWidth="3.2" />
      <path d={inner} fill="none" stroke="#191512" strokeWidth="1" />
      {curls.map(([sx, sy, x, y]) => (
        <g key={`${x}-${y}`} fill="none" stroke="#191512" strokeWidth="1.5" strokeLinecap="round">
          <path d={`M${x + sx * 3} ${y} a${3.4} ${3.4} 0 1 ${sx * sy > 0 ? 1 : 0} ${sx * -3.4} ${sy * 3.4}`} />
        </g>
      ))}
      <image href={asset('images/brand/logo-primary.png')} x="22" y="10" width="156" height="78" preserveAspectRatio="xMidYMid slice" />
      <text x="100" y="96" textAnchor="middle" className="tb__sign-sub">COFFEE HOUSE</text>
    </svg>
  );
}

/* black bistro tables and chairs out on the sidewalk */
function Patio() {
  const chair = (x, flip) => (
    <g key={`c${x}`} transform={`translate(${x} 0) scale(${flip ? -1 : 1} 1)`} fill="#191512">
      <path d="M0 3 Q-1 10 0 17 L2 17 Q1.4 10 2.2 3 Z" />
      <rect x="0" y="16" width="10" height="2.4" rx="0.8" />
      <path d="M0.6 18 L-0.6 31 M9 18 L10.4 31 M1 25 H9.5" stroke="#191512" strokeWidth="1.4" fill="none" />
    </g>
  );
  const table = (x) => (
    <g key={`t${x}`}>
      <ellipse cx={x} cy="13" rx="8.5" ry="2" fill="#191512" />
      <path d={`M${x} 14 V29 M${x - 5.5} 31 Q${x} 26 ${x + 5.5} 31`} stroke="#191512" strokeWidth="1.6" fill="none" />
    </g>
  );
  return (
    <svg className="tb__patio" viewBox="0 0 240 32" aria-hidden="true">
      {chair(8, false)}{table(32)}{chair(56, true)}
      {chair(176, false)}{table(200)}{chair(224, true)}
    </svg>
  );
}

/* Our own storefront, drawn faithfully from the real 514 Station Ave: a
   three-storey red-brown brick building with teal-green framed windows (the
   tall middle one with a little iron rail), a charcoal shingled pent roof
   carrying the white TROUBLE BREWING plaque, a white soffit with round
   downlights, and a white board-and-batten shopfront with fluted pilasters,
   black-framed windows (string lights, a La Colombe card, a red OPEN sign),
   a black door with a glass panel and brass kick plate between two lantern
   sconces, "514" by the door, bistro sets and a black street lamp out front. */
function OurShop({ stop, index, selected, onSelect }) {
  const num = streetNumber(SITE.address);
  return (
    <li className={`ave__stop ave__stop--main ave__stop--us${selected ? ' is-selected' : ''}`} style={place(stop, { '--i': Math.min(index, 9) })}>
      <span className="ave__pin" aria-hidden="true"><span>You are here</span></span>
      <button
        type="button"
        className="shop tb"
        aria-pressed={selected}
        aria-controls="ave-detail"
        aria-label={`You are here: Trouble Brewing Coffee House, ${SITE.address.replace(/,.*$/, '')}`}
        data-stop="us"
        onClick={() => onSelect('us')}
      >
        <span className="tb__brick" aria-hidden="true">
          <span className="tb__floor"><i /><i /><i /></span>
          <span className="tb__floor"><i /><i className="tb__tall"><b /></i><i /></span>
        </span>
        <span className="tb__pent" aria-hidden="true"><OurSign /></span>
        <span className="tb__soffit" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <span className="tb__front" aria-hidden="true">
          <span className="tb__pil" />
          <span className="tb__win tb__win--lights"><span /></span>
          <span className="tb__pil" />
          <span className="tb__win"><span><em className="tb__colombe">La Colombe</em></span></span>
          <span className="tb__pil tb__pil--door"><i className="tb__sconce" /></span>
          <span className="tb__door"><span className="tb__glass" /><span className="tb__panels" /><span className="tb__kick" /></span>
          <span className="tb__pil tb__pil--door"><i className="tb__sconce" /><span className="tb__num">{num}</span></span>
          <span className="tb__win"><span><em className="tb__open">OPEN</em></span></span>
          <span className="tb__pil" />
          <span className="tb__win tb__win--lights"><span /></span>
          <span className="tb__pil" />
        </span>
      </button>
      <Patio />
      <span className="tb__lamp" aria-hidden="true"><span className="ave__lamp-head" /><span className="ave__pole" /></span>
    </li>
  );
}

function Filler({ stop }) {
  // an unnamed building on the other side, so both sides read as a street
  const tones = ['#cdbb9c', '#bfa98c', '#d3c4aa', '#b4a48e', '#c8ae93'];
  const h = [15, 17.5, 13.5, 16.5][stop.seed % 4];
  return (
    <li className={`ave__decor ave__filler ave__filler--${stop.side}`} aria-hidden="true" style={place(stop, { '--fw': tones[stop.seed % tones.length], '--fh': `${h}em` })}>
      <span className="ave__filler-body"><i /><i /><i /><i /></span>
    </li>
  );
}

function StreetSign({ stop }) {
  return (
    <li className="ave__decor ave__sign" aria-hidden="true" style={place(stop)}>
      <span className="ave__sign-blade">Station Ave</span>
      <span className="ave__sign-blade ave__sign-blade--cross">{stop.block ? `${stop.block} block` : 'Haddon Hts'}</span>
      <span className="ave__pole" />
    </li>
  );
}

function CrossStreet({ stop, across }) {
  return (
    <>
      <li className="ave__decor ave__cross" aria-hidden="true" style={place(stop)}>
        <span className="ave__sign-blade ave__sign-blade--small">{stop.block ? `${stop.block} block` : 'Around town'}</span>
        <span className="ave__pole ave__pole--short" />
      </li>
      <li className="ave__crossing" aria-hidden="true" style={{ gridColumn: stop.col, gridRow: across ? '2 / 6' : '2 / 4' }} />
    </>
  );
}

function Lamp({ stop }) {
  return (
    <li className={`ave__decor ave__lamp ave__lamp--${stop.side}`} aria-hidden="true" style={place(stop)}>
      <span className="ave__lamp-head" />
      <span className="ave__pole" />
    </li>
  );
}

/* the real passage between Anthony's and our door */
function Alley({ stop }) {
  return (
    <li className="ave__decor ave__alley" aria-hidden="true" style={place(stop)}>
      <span className="ave__alley-sign">{stop.name}</span>
      <span className="ave__pole ave__pole--short" />
    </li>
  );
}

function StreetTree({ stop }) {
  return (
    <li className="ave__decor ave__streettree" aria-hidden="true" style={place(stop)}>
      <span className="ave__tree" />
    </li>
  );
}

function EndCap({ stop }) {
  return (
    <li className="ave__decor ave__end" aria-hidden="true" style={place(stop)}>
      <span className="ave__tree" />
      <span className="ave__bench" />
    </li>
  );
}

/* ---- the details card ---------------------------------------------------- */

function Detail({ stop, onClose, onStep, hasPrev, hasNext }) {
  const [photoOk, setPhotoOk] = useState(true);
  const [logoOk, setLogoOk] = useState(true);
  if (stop.kind === 'us') {
    const address = SITE.address;
    return (
      <div className="ave-detail__card ave-detail__card--us">
        <div className="ave-detail__media ave-detail__media--us">
          <img src={asset('images/brand/logo-fox-cream.png')} alt="" />
        </div>
        <div className="ave-detail__body">
          <p className="ave-detail__eyebrow">You are here · {address.replace(/,.*$/, '')}</p>
          <h3 className="ave-detail__name">Trouble Brewing Coffee House</h3>
          <p className="ave-detail__blurb">Our own door, right in the middle of the block. Grab a coffee first, then go say hi to the neighbors.</p>
          <p className="ave-detail__links">
            <Link className="btn btn--primary btn--sm" to="/location">Hours &amp; location</Link>
            <a className="ave-detail__map" href={directionsUrl({ name: SITE.name, address })} target="_blank" rel="noopener noreferrer">Directions ↗</a>
          </p>
        </div>
        <DetailNav onClose={onClose} onStep={onStep} hasPrev={hasPrev} hasNext={hasNext} />
      </div>
    );
  }
  const { b } = stop;
  const mapsUrl = directionsUrl(b);
  const cat = categoryLabel(b.category);
  const photo = b.photo_url && photoOk;
  const side = stop.side === 'across' ? 'Across the street' : '';
  return (
    <div className="ave-detail__card">
      <div className={`ave-detail__media${photo ? '' : ' ave-detail__media--mono'}`} style={{ '--awn': awningFor(b.category)[0] }}>
        {photo ? (
          <img src={b.photo_url} alt="" referrerPolicy="no-referrer" onError={() => setPhotoOk(false)} />
        ) : b.logo_url && logoOk ? (
          <img className="ave-detail__logo" src={b.logo_url} alt={`${b.name} logo`} referrerPolicy="no-referrer" onError={() => setLogoOk(false)} />
        ) : (
          <span className="ave-detail__mono" aria-hidden="true">{initials(b.name)}</span>
        )}
      </div>
      <div className="ave-detail__body">
        <p className="ave-detail__eyebrow">
          {[cat, b.address, side].filter(Boolean).join(' · ') || 'Around town'}
        </p>
        <h3 className="ave-detail__name">{b.name}</h3>
        {b.blurb && <p className="ave-detail__blurb">{b.blurb}</p>}
        {b.we_love && (
          <p className="ave-detail__love">
            <span className="ave-detail__love-label">We send people for</span>
            {b.we_love}
          </p>
        )}
        {(b.url || mapsUrl) && (
          <p className="ave-detail__links">
            {b.url && (
              <a
                className="btn btn--primary btn--sm"
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('outbound_click', { dest: 'local_business', name: b.name })}
              >
                Visit their site ↗
              </a>
            )}
            {mapsUrl && (
              <a className="ave-detail__map" href={mapsUrl} target="_blank" rel="noopener noreferrer">Directions ↗</a>
            )}
          </p>
        )}
      </div>
      <DetailNav onClose={onClose} onStep={onStep} hasPrev={hasPrev} hasNext={hasNext} />
    </div>
  );
}

function DetailNav({ onClose, onStep, hasPrev, hasNext }) {
  return (
    <>
      <button type="button" className="ave-detail__close" onClick={onClose} aria-label="Close details">×</button>
      <div className="ave-detail__steps">
        <button type="button" className="ave-detail__step" onClick={() => onStep(-1)} disabled={!hasPrev}>← Previous door</button>
        <button type="button" className="ave-detail__step" onClick={() => onStep(1)} disabled={!hasNext}>Next door →</button>
      </div>
    </>
  );
}

/* ---- the strip ----------------------------------------------------------- */

export default function StationAveStrip({ ordered, showUs = true }) {
  const stops = useMemo(() => buildWalk(ordered, { showUs }), [ordered, showUs]);
  const doors = useMemo(() => stops.filter((s) => s.kind === 'shop' || s.kind === 'us'), [stops]);
  const [selectedId, setSelectedId] = useState(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [strolled, setStrolled] = useState(false);
  const scroller = useRef(null);
  const detailRef = useRef(null);
  const suppressClick = useRef(false);

  const selected = doors.find((d) => d.id === selectedId) || null;
  const selectedIndex = selected ? doors.indexOf(selected) : -1;

  /* which ends can still scroll — drives the arrow buttons and edge fades */
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges((prev) => {
      const next = { left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 };
      return prev.left === next.left && prev.right === next.right ? prev : next;
    });
    if (el.scrollLeft > 24) setStrolled(true);
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, stops]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onScroll);
      ro.observe(el);
    }
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro?.disconnect();
    };
  }, [measure]);

  /* vertical wheel → sideways, only while the street can still move that way.
     Eased toward a target so a notchy mouse wheel glides instead of jumping. */
  const glideStop = useRef(() => {});
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    let target = null;
    let frame = 0;
    glideStop.current = () => {
      cancelAnimationFrame(frame);
      target = null;
    };
    const glide = () => {
      const diff = target - el.scrollLeft;
      if (Math.abs(diff) < 1) {
        el.scrollLeft = target;
        target = null;
        return;
      }
      el.scrollLeft += diff * 0.22;
      frame = requestAnimationFrame(glide);
    };
    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // pinch / native sideways
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1);
      const max = el.scrollWidth - el.clientWidth;
      const from = target ?? el.scrollLeft;
      if ((dy > 0 && from >= max - 1) || (dy < 0 && from <= 1)) return; // at the end: let the page scroll
      e.preventDefault();
      target = Math.max(0, Math.min(max, from + dy));
      if (reduceMotion()) {
        el.scrollLeft = target;
        target = null;
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(glide);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frame);
    };
  }, []);

  /* mouse drag-to-scroll (touch already scrolls natively) */
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scroller.current;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    let moved = false;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) {
        moved = true;
        el.classList.add('is-dragging');
      }
      el.scrollLeft = startLeft - dx;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.classList.remove('is-dragging');
      if (moved) suppressClick.current = true;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const onClickCapture = (e) => {
    // the click that ends a drag shouldn't also open a storefront
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const page = (dir) => {
    const el = scroller.current;
    if (!el) return;
    glideStop.current();
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  /* Slide the street (sideways only) so a storefront sits in the middle of
     it — or as near as the ends allow. Done on the scroller itself rather than
     with scrollIntoView, so it can't fight the page scrolling the details card
     into view at the same moment (two smooth scrollIntoViews cancel). */
  const showDoor = useCallback((id, { focus = false } = {}) => {
    const el = scroller.current;
    const btn = el?.querySelector(`[data-stop="${id}"]`);
    if (!btn) return;
    if (focus) btn.focus({ preventScroll: true });
    const box = el.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    let left = el.scrollLeft + (r.left - box.left) - (el.clientWidth - r.width) / 2;
    const max = el.scrollWidth - el.clientWidth;
    left = Math.max(0, max > 0 ? Math.min(max, left) : left);
    glideStop.current();
    if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: reduceMotion() ? 'auto' : 'smooth' });
    else el.scrollLeft = left;
  }, []);

  /* On a phone the opening view only fits one storefront, so start the walk
     on our own door (instantly — no glide on page load) instead of the sign. */
  const openedOnUs = useRef(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    const us = el?.querySelector('[data-stop="us"]');
    if (openedOnUs.current || !el || !us || el.clientWidth >= 700) return;
    openedOnUs.current = true;
    const box = el.getBoundingClientRect();
    const r = us.getBoundingClientRect();
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + (r.left - box.left) - (el.clientWidth - r.width) / 2));
  }, [doors.length]);

  /* arrow keys / Home / End walk between storefronts */
  const onKeyDown = (e) => {
    const idx = doors.findIndex((d) => d.id === e.target?.dataset?.stop);
    if (idx < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = Math.min(doors.length - 1, idx + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, idx - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = doors.length - 1;
    if (next == null) return;
    e.preventDefault();
    if (selectedId) setSelectedId(doors[next].id); // an open card follows along
    showDoor(doors[next].id, { focus: true });
  };

  const select = (id) => {
    setSelectedId((cur) => (cur === id ? null : id));
    showDoor(id);
  };
  const step = (dir) => {
    const next = doors[selectedIndex + dir];
    if (!next) return;
    setSelectedId(next.id);
    showDoor(next.id);
  };

  /* once a card opens, make sure it's actually on screen (phones especially) */
  useEffect(() => {
    if (!selectedId) return;
    detailRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSelectedId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  let doorIndex = 0;
  const across = stops.across;
  return (
    <div className="ave">
      <div className="container ave__bar">
        <p className={`ave__hint${strolled ? ' is-gone' : ''}`} aria-hidden={strolled}>
          Stroll down Station Ave <span aria-hidden="true">→</span>
        </p>
        <div className="ave__arrows">
          <button type="button" className="ave__arrow" onClick={() => page(-1)} disabled={!edges.left} aria-label="Scroll the street left">‹</button>
          <button type="button" className="ave__arrow" onClick={() => page(1)} disabled={!edges.right} aria-label="Scroll the street right">›</button>
        </div>
      </div>

      <div
        ref={scroller}
        className={`ave__scroller${edges.left ? ' fade-l' : ''}${edges.right ? ' fade-r' : ''}`}
        role="region"
        aria-label="Station Ave, storefront by storefront"
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        <ol className={`ave__row${across ? ' has-across' : ''}`} onKeyDown={onKeyDown} style={{ '--cols': stops.cols }}>
          <li className="ave__walk" aria-hidden="true" style={{ gridRow: 2 }} />
          <li className="ave__road" aria-hidden="true" style={{ gridRow: 3 }}>
            {across && <span className="ave__road-label">↑ Even numbers · Station Ave · Odd numbers ↓</span>}
          </li>
          {across && <li className="ave__walk ave__walk--across" aria-hidden="true" style={{ gridRow: 5 }} />}
          {stops.map((s) => {
            if (s.kind === 'sign') return <StreetSign key={s.id} stop={s} />;
            if (s.kind === 'cross') return <CrossStreet key={s.id} stop={s} across={across} />;
            if (s.kind === 'lamp') return <Lamp key={s.id} stop={s} />;
            if (s.kind === 'alley') return <Alley key={s.id} stop={s} />;
            if (s.kind === 'tree') return <StreetTree key={s.id} stop={s} />;
            if (s.kind === 'filler') return <Filler key={s.id} stop={s} />;
            if (s.kind === 'end') return <EndCap key={s.id} stop={s} />;
            const i = doorIndex++;
            if (s.kind === 'us') return <OurShop key={s.id} stop={s} index={i} selected={selectedId === 'us'} onSelect={select} />;
            return <Storefront key={s.id} stop={s} index={i} selected={selectedId === s.id} onSelect={select} />;
          })}
        </ol>
      </div>

      <div className="container">
        <div id="ave-detail" ref={detailRef} className="ave-detail" aria-live="polite">
          {selected ? (
            <Detail
              key={selected.id}
              stop={selected}
              onClose={() => setSelectedId(null)}
              onStep={step}
              hasPrev={selectedIndex > 0}
              hasNext={selectedIndex < doors.length - 1}
            />
          ) : (
            <p className="ave-detail__empty">Tap a storefront to peek inside.</p>
          )}
        </div>
      </div>
    </div>
  );
}
