import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import BrandImg from '../BrandImg.jsx';
import StarRating from '../StarRating.jsx';
import { asset } from '../../lib/config.js';
import { WALL_PHOTO, wallPhotoProps } from '../../lib/wallPhoto.js';
import { WALL_ART, WALL_IMAGE, WALL_FOCUS } from '../../lib/galleryWall.js';
import { getMenu, pickProducts } from '../../lib/menuService.js';
import { loadReviews } from '../../lib/reviews.js';
import { useShopStatus } from '../../lib/useShopStatus.js';
import { openFrame, pieceAt, frameRect, doorFor } from '../../lib/framePortal.js';

/* "Step Inside" landing concept — the homepage as a walk along the real wall.

   The shop's own photograph of its gallery wall fills the screen and stays
   put (sticky) while the page scrolls past it. Each screen of scrolling is a
   chapter: the photograph glides and magnifies into one real frame, and that
   frame opens a door into the site, carrying LIVE content — real drinks and
   prices from the SpotOn menu, the real Google rating with a real review, the
   real opening date, the real neighbours. It opens on the whole wall and
   closes on it, with the address and the way in.

   The room follows the shop's hours (useShopStatus): open, the wall is lit
   and a pink neon OPEN sign hums in the corner; after closing the lights go
   down and the sign says when they come back on. ?lights=on|off previews
   either.

   Geometry: the photo is laid out at "cover" width and moved with ONE
   translate+scale, computed in px from the stage's measured size, so a frame
   lands where the chapter wants it at any aspect ratio — a tall phone shows
   the wall almost whole, a wide laptop shows a lit window onto it with the
   rest of the wall blurred behind. Reduced motion: no glide, the views still
   change chapter by chapter. */

const BY_ID = new Map(WALL_ART.map((a) => [a.id, a]));
const R = WALL_IMAGE.h / WALL_IMAGE.w;
const MAX_UPSCALE = 3.1; // past ~3× the 934px original, the photo turns soft

const HOUSE_SIPS = ['Banana Split Coffee', 'Hot Chai Latte', 'Hot Matcha Latte', 'Frozen Coffee'];

const CHAPTERS = [
  { id: 'intro', rect: WALL_FOCUS },
  { id: 'menu', piece: 'ducks', label: 'The menu' },
  { id: 'story', piece: 'balloon-fox', label: 'Our story' },
  { id: 'reviews', piece: 'butterflies', label: 'Reviews' },
  { id: 'team', piece: 'fox-head', label: 'Troublemakers' },
  { id: 'local', piece: 'bicycle-fox', label: 'Local love' },
  { id: 'visit', rect: WALL_FOCUS, label: 'Visit' },
];

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Where to put the photo so `rect` (a % box of the whole photo) sits at
   (cx, cy) of the stage, filling at most `fill` of it. */
function placement(rect, W, H, { cx, cy, fill }) {
  const coverW = Math.max(W, H / R);
  const want = Math.min((fill * W) / (rect.w / 100), (fill * H) / ((rect.h / 100) * R));
  const imgW = Math.min(want, WALL_IMAGE.w * MAX_UPSCALE);
  const imgH = imgW * R;
  let x = cx * W - ((rect.x + rect.w / 2) / 100) * imgW;
  let y = cy * H - ((rect.y + rect.h / 2) / 100) * imgH;
  // never open a gap at an edge the photo is big enough to cover
  if (imgW >= W) x = Math.min(0, Math.max(W - imgW, x));
  if (imgH >= H) y = Math.min(0, Math.max(H - imgH, y));
  return { x, y, s: imgW / coverW, coverW };
}

/* A link that walks into a frame on the way: the chapter's own piece. Plain
   <Link> semantics (href, middle-click, new-tab, keyboard) stay intact. */
function Door({ photoRef, piece, to, children }) {
  const navigate = useNavigate();
  return (
    <Link
      className="btn sih__ghost"
      to={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openFrame(photoRef.current, piece, navigate, to);
      }}
    >
      {children}
    </Link>
  );
}

export default function StepInsideHero({ data = {} }) {
  const {
    sih_title: title = 'Step inside',
    sih_sub: sub = 'Coffee, kitchen and the friendliest wall in Haddon Heights. Scroll and we’ll show you around.',
    order_label: orderLabel = 'Order Now',
    sih_photo_url: photo,
  } = data;

  const section = useRef(null);
  const stage = useRef(null);
  const photoRef = useRef(null);
  const navigate = useNavigate();
  // the frame under the pointer: outlined, with its door's name on a tag
  const [hover, setHover] = useState(null);
  const [chapter, setChapter] = useState(0);
  const [box, setBox] = useState({ W: 0, H: 0, narrow: false });
  const [drinks, setDrinks] = useState([]);
  const [reviews, setReviews] = useState(null);
  const status = useShopStatus();
  const lit = status ? status.open : true;

  useEffect(() => {
    let alive = true;
    getMenu().then((all) => {
      if (!alive) return;
      const named = HOUSE_SIPS.map((n) => all.find((m) => m.name === n)).filter(Boolean);
      setDrinks([...named, ...pickProducts(all, { category: 'specialty', count: 4 })].filter((d, i, a) => a.indexOf(d) === i).slice(0, 3));
    });
    loadReviews({ minLength: 60 }).then((r) => alive && setReviews(r));
    return () => { alive = false; };
  }, []);

  // stage size (the sticky viewport under the nav)
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return undefined;
    const measure = () => {
      // the sticky stage sits just under the (sticky) site nav
      const nav = document.querySelector('.nav');
      section.current?.style.setProperty('--nav-h', `${nav ? nav.offsetHeight : 0}px`);
      setBox({ W: el.clientWidth, H: el.clientHeight, narrow: el.clientWidth < 760 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // scroll → chapter
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = section.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const span = el.offsetHeight - window.innerHeight;
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        setChapter(Math.min(CHAPTERS.length - 1, Math.round(p * (CHAPTERS.length - 1))));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  const goTo = (i) => {
    const el = section.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + (span * i) / (CHAPTERS.length - 1);
    window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  const ch = CHAPTERS[chapter];
  const rect = ch.rect || BY_ID.get(ch.piece);
  const bookend = Boolean(ch.rect);
  // the frame sits beside the card on a laptop, above it on a phone
  const fit = box.narrow
    ? (bookend ? { cx: 0.5, cy: 0.42, fill: 0.98 } : { cx: 0.5, cy: 0.3, fill: 0.62 })
    : (bookend ? { cx: 0.68, cy: 0.5, fill: 0.94 } : { cx: 0.66, cy: 0.5, fill: 0.62 });
  const pos = box.W ? placement(rect, box.W, box.H, fit) : null;
  const imgStyle = pos
    ? { width: `${pos.coverW}px`, transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.s})` }
    : undefined;
  const src = photo || WALL_PHOTO;
  /* rendered width of the photo after the close-up scale — picks a copy of
     the wall sharp enough for the zoom (src/lib/wallPhoto.js) */
  const photoSizes = pos ? `${Math.ceil(pos.coverW * pos.s)}px` : '100vw';
  const quote = reviews?.reviews?.[0];
  const backAt = status && !status.open
    ? (status.label.startsWith('Closed — opens') ? status.label.replace('Closed — opens', 'Back at') : 'Back tomorrow')
    : '';

  const card = (i) => {
    const props = { className: `sih__card sih__card--${CHAPTERS[i].id} ${i === chapter ? 'is-on' : ''}`, 'aria-hidden': i !== chapter, inert: i !== chapter ? '' : undefined };
    switch (CHAPTERS[i].id) {
      case 'intro':
        return (
          <div key="intro" {...props}>
            <BrandImg src={asset('images/brand/logo-fox-cream.png')} alt="Trouble Brewing Coffee House" className="sih__logo" fallback={null} />
            <h1 className="sih__title">{title}</h1>
            <p className="sih__sub">{lit ? sub : `We’re closed right now (${backAt.toLowerCase()}), but the wall’s still up. Have a look around.`}</p>
            <div className="sih__cta">
              <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
              <button type="button" className="btn btn--lg sih__ghost" onClick={() => goTo(1)}>Show me around ↓</button>
            </div>
          </div>
        );
      case 'menu':
        return (
          <div key="menu" {...props}>
            <p className="sih__kicker">The menu</p>
            <h2 className="sih__h">Ducks at sea, drinks on the house list</h2>
            <ul className="sih__menu">
              {drinks.map((d) => (
                <li key={d.id || d.name}><span>{d.name}</span><span className="sih__dots" aria-hidden="true" /><span>{d.price != null ? `$${Number(d.price).toFixed(2)}` : ''}</span></li>
              ))}
            </ul>
            <div className="sih__cta">
              <OrderButton label={orderLabel} className="btn btn--accent" location="hero-menu" />
              <Door photoRef={photoRef} piece="ducks" to="/menu">Full menu</Door>
            </div>
          </div>
        );
      case 'story':
        return (
          <div key="story" {...props}>
            <p className="sih__kicker">Our story</p>
            <h2 className="sih__h">Opened on Friday the 13th</h2>
            <p className="sih__p">October 2017, 514 Station Ave. Tom and Cat, Haddon Heights locals, opened a coffee house and called it Trouble. Nine years of La Colombe, breakfast all day and a wall that keeps filling up.</p>
            <div className="sih__cta"><Door photoRef={photoRef} piece="balloon-fox" to="/timeline">The story so far →</Door></div>
          </div>
        );
      case 'reviews':
        return (
          <div key="reviews" {...props}>
            <p className="sih__kicker">Reviews</p>
            <h2 className="sih__h sih__h--num">
              {reviews ? Number(reviews.rating).toFixed(1) : '—'} <StarRating value={reviews?.rating || 0} size={22} />
            </h2>
            {reviews?.count > 0 && <p className="sih__meta">from {reviews.count} Google reviews</p>}
            {quote && (
              <figure className="sih__quote">
                <blockquote>“{quote.quote.length > 190 ? `${quote.quote.slice(0, 190).replace(/\s+\S*$/, '')}…` : quote.quote}”</blockquote>
                <figcaption>
                  {quote.avatar && <img src={quote.avatar} alt="" referrerPolicy="no-referrer" loading="lazy" />}
                  {quote.author}
                </figcaption>
              </figure>
            )}
            <div className="sih__cta"><Door photoRef={photoRef} piece="butterflies" to="/reviews">Read them all →</Door></div>
          </div>
        );
      case 'team':
        return (
          <div key="team" {...props}>
            <p className="sih__kicker">The Troublemakers</p>
            <h2 className="sih__h">The gold fox wears glasses. The team wears aprons.</h2>
            <p className="sih__p">The people behind the counter, who’ll know your order by the third visit.</p>
            <div className="sih__cta"><Door photoRef={photoRef} piece="fox-head" to="/troublemakers">Meet them →</Door></div>
          </div>
        );
      case 'local':
        return (
          <div key="local" {...props}>
            <p className="sih__kicker">Local love</p>
            <h2 className="sih__h">A fox on a bike, a street full of neighbours</h2>
            <p className="sih__p">Anthony’s next door, Lula’s Empanadas, Ralph’s Pizza, South Jersey Special and the rest of Station Ave. Station Ave only works because all of it works.</p>
            <div className="sih__cta"><Door photoRef={photoRef} piece="bicycle-fox" to="/neighborhood">Walk the block →</Door></div>
          </div>
        );
      default:
        return (
          <div key="visit" {...props}>
            <p className="sih__kicker">Come see it in person</p>
            <h2 className="sih__h">514 Station Ave, Haddon Heights</h2>
            <p className="sih__p">{status ? status.label : 'Open daily'}. Street parking out front and a lot behind the shop.</p>
            <div className="sih__cta">
              <OrderButton label={orderLabel} className="btn btn--accent" location="hero-visit" />
              <Door photoRef={photoRef} piece="town-hall" to="/location">Directions</Door>
              <Link className="btn sih__ghost" to="/gallery-wall">Every frame →</Link>
            </div>
          </div>
        );
    }
  };

  // Frames are doors: point at one to see where it goes, click to walk in.
  // Clicks that land on a card, a button or the rail are theirs, not the wall's.
  const isUi = (t) => t.closest('.sih__cards, .sih__rail, .sih__neon, a, button');
  function onPoint(e) {
    if (e.pointerType !== 'mouse' || isUi(e.target) || !photoRef.current) { setHover(null); return; }
    const art = pieceAt(photoRef.current, e.clientX, e.clientY);
    if (!art) { setHover(null); return; }
    if (hover && hover.id === art.id) return;
    const f = frameRect(photoRef.current, art);
    const st = stage.current.getBoundingClientRect();
    setHover({
      id: art.id,
      label: doorFor(art.id).label,
      box: { left: `${f.left - st.left}px`, top: `${f.top - st.top}px`, width: `${f.width}px`, height: `${f.height}px` },
    });
  }
  function onStageClick(e) {
    if (isUi(e.target) || !photoRef.current) return;
    const art = pieceAt(photoRef.current, e.clientX, e.clientY);
    if (art) { setHover(null); openFrame(photoRef.current, art.id, navigate); }
  }

  return (
    <section ref={section} className={`sih ${lit ? 'is-lit' : 'is-dark'}`} style={{ '--chapters': CHAPTERS.length }}>
      <div className="sih__sticky">
        <div
          ref={stage}
          className={`sih__stage ${bookend ? 'is-whole' : 'is-close'} ${hover ? 'is-pointing' : ''}`}
          onPointerMove={onPoint}
          onPointerLeave={() => setHover(null)}
          onClick={onStageClick}
        >
          <img className="sih__blur" src={src} alt="" aria-hidden="true" />
          <img
            ref={photoRef}
            className="sih__photo"
            {...wallPhotoProps(photo, photoSizes)}
            alt="The gallery wall at Trouble Brewing: a sage-green wall hung with mismatched vintage frames, a gold fox head in spectacles and a brass hare."
            style={imgStyle}
            fetchpriority="high"
            decoding="async"
          />
          <div className="sih__shade" aria-hidden="true" />

          <div className={`sih__neon ${lit ? 'is-on' : 'is-off'}`} role="status">
            <span className="sih__neon-word">{lit ? 'Open' : 'Closed'}</span>
            {!lit && backAt && <span className="sih__neon-sub">{backAt}</span>}
          </div>

          {hover && (
            <div className="sih__door" style={hover.box} aria-hidden="true">
              <span className="sih__door-tag">{hover.label} →</span>
            </div>
          )}

          <div className="sih__cards">{CHAPTERS.map((_, i) => card(i))}</div>

          <nav className="sih__rail" aria-label="Walk the wall">
            {CHAPTERS.map((c, i) => (
              <button key={c.id} type="button" className={i === chapter ? 'is-on' : ''} aria-current={i === chapter ? 'step' : undefined} onClick={() => goTo(i)}>
                <span>{c.label || 'Welcome'}</span>
              </button>
            ))}
          </nav>
          {chapter === 0 && <p className="sih__scroll" aria-hidden="true">scroll</p>}
        </div>
      </div>
    </section>
  );
}
