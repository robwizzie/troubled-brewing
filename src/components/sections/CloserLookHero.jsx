import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import RealWallPhoto from '../RealWallPhoto.jsx';
import { WALL_PHOTO_LARGE } from '../../lib/wallPhoto.js';
import { getGalleryPieces } from '../../lib/dataService.js';
import { WALL_ART, WALL_FOCUS, WALL_IMAGE, mergeWallArt } from '../../lib/galleryWall.js';
import { stageBox, stageXY } from '../../lib/realWall.js';

/* "Closer Look" landing concept — the shop's REAL gallery-wall photograph with
   a brass magnifying glass over it. Move the glass (mouse, finger, or Tab
   through the pieces) and it magnifies whatever it's over, while a museum
   label beside the wall reads out what that piece is. The labels come from the
   same data as the /gallery-wall page: the plain description of what's in the
   frame, or — once the owner has pinned a catalogued piece to that spot — its
   real title and artist.

   The lens is a background-image of the same photograph, positioned in px
   from the pointer (no per-frame React state: the pointer writes styles on
   the lens directly, and React only re-renders when the piece under it
   changes). With no pointer — first paint, touch, keyboard — the lens parks
   over the selected piece. */

const ZOOM = 2.2;
const TOUR_MS = 4200;

/* A different piece leads every day — a small reason to come back and see
   what the glass has picked. Counted in the shop's own days (local date). */
function todaysPick() {
  const d = new Date();
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return WALL_ART[day % WALL_ART.length].id;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function hitTest(xPct, yPct) {
  // smallest box wins, so the little pieces tucked inside bigger ones
  // (the fox head beside the snow scene) are reachable
  let best = null;
  WALL_ART.forEach((a) => {
    const b = stageBox(a);
    const l = parseFloat(b.left); const t = parseFloat(b.top);
    const w = parseFloat(b.width); const h = parseFloat(b.height);
    if (xPct >= l && xPct <= l + w && yPct >= t && yPct <= t + h && (!best || w * h < best.area)) {
      best = { id: a.id, area: w * h };
    }
  });
  return best?.id || null;
}

export default function CloserLookHero({ data = {} }) {
  const {
    clh_eyebrow: eyebrow = 'Haddon Heights, NJ',
    clh_title: title = 'Have a closer look',
    clh_sub: sub = 'Good coffee, scratch-made food, and a wall that rewards nosy people. Drag the glass over anything that catches your eye.',
    clh_photo_url: photo,
    order_label: orderLabel = 'Order Now',
    clh_menu_label: menuLabel = 'See the menu',
  } = data;

  const [pieces, setPieces] = useState([]);
  const [pickId] = useState(todaysPick);
  const [activeId, setActiveId] = useState(pickId);
  // Until someone takes the glass, it wanders the wall on its own.
  const [touring, setTouring] = useState(true);
  const stage = useRef(null);
  const lens = useRef(null);
  const hovering = useRef(false);

  useEffect(() => {
    let alive = true;
    getGalleryPieces().then((p) => alive && setPieces(p || [])).catch(() => {});
    return () => { alive = false; };
  }, []);

  const art = useMemo(() => mergeWallArt(pieces), [pieces]);
  const active = art.find((a) => a.id === activeId) || art[0];
  const index = art.indexOf(active);
  // the lens magnifies 2.2× — it reads from the full-resolution copy
  const src = photo || WALL_PHOTO_LARGE;

  // Put the lens at a stage-% point and aim its magnified copy there.
  const placeLens = (xPct, yPct) => {
    const el = stage.current; const l = lens.current;
    if (!el || !l) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    const fullH = W * (WALL_IMAGE.h / WALL_IMAGE.w);
    const px = (xPct / 100) * W;
    const py = (yPct / 100) * H;
    const offY = (WALL_FOCUS.y / 100) * fullH;
    const R = l.offsetWidth / 2;
    l.style.transform = `translate(${px - R}px, ${py - R}px)`;
    l.style.backgroundSize = `${W * ZOOM}px ${fullH * ZOOM}px`;
    l.style.backgroundPosition = `${R - px * ZOOM}px ${R - (py + offY) * ZOOM}px`;
  };

  const parkOn = (piece) => {
    const p = stageXY(piece, 0.5, 0.5);
    placeLens(p.x, p.y);
  };

  // park the lens on the active piece whenever it changes without a pointer,
  // and again on resize (the px maths is width-dependent)
  useEffect(() => {
    if (!hovering.current) parkOn(active);
    const onResize = () => !hovering.current && parkOn(active);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  useEffect(() => {
    if (!touring || reducedMotion()) return undefined;
    const id = setInterval(() => {
      if (hovering.current || document.hidden) return;
      setActiveId((cur) => {
        const i = WALL_ART.findIndex((a) => a.id === cur);
        return WALL_ART[(i + 1) % WALL_ART.length].id;
      });
    }, TOUR_MS);
    return () => clearInterval(id);
  }, [touring]);

  const take = () => { if (touring) setTouring(false); };

  const onMove = (e) => {
    // Fingers tap the pieces (the buttons below) instead of dragging — dragging
    // over the photo has to keep scrolling the page.
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const r = stage.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    hovering.current = true;
    take();
    placeLens(x, y);
    const hit = hitTest(x, y);
    if (hit && hit !== activeId) setActiveId(hit);
  };
  const onLeave = () => { hovering.current = false; parkOn(active); };

  const step = (d) => {
    hovering.current = false;
    take();
    setActiveId(art[(index + d + art.length) % art.length].id);
  };

  return (
    <section className="clh">
      <div className="clh__cornice" aria-hidden="true" />
      <div className="container clh__inner">
        <div className="clh__copy">
          <p className="clh__eyebrow">✦ {eyebrow} ✦</p>
          <h1 className="clh__title">{title}</h1>
          <p className="clh__sub">{sub}</p>
          <div className="clh__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--lg clh__ghost" to="/menu">{menuLabel}</Link>
          </div>
          <div className="clh__hours"><HoursToday /></div>
        </div>

        <div className="clh__wall">
          <div
            className="clh__stage"
            ref={stage}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
          >
            <RealWallPhoto src={photo} className="clh__photo">
              {art.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`clh__spot ${a.id === active.id ? 'is-active' : ''} ${a.shape === 'oval' ? 'is-oval' : ''}`}
                  style={stageBox(a)}
                  aria-label={a.title}
                  aria-pressed={a.id === active.id}
                  onFocus={() => { hovering.current = false; take(); setActiveId(a.id); }}
                  onClick={() => { hovering.current = false; take(); setActiveId(a.id); }}
                />
              ))}
            </RealWallPhoto>
            <div className="clh__lens" ref={lens} aria-hidden="true" style={{ backgroundImage: `url(${src})` }}>
              <span className="clh__lens-handle" />
            </div>
          </div>
        </div>

        {/* polite only once someone is driving: the self-guided tour must not
            read a new label aloud every few seconds */}
        <aside className="clh__label" aria-live={touring ? 'off' : 'polite'}>
          <p className="clh__label-no">
            {active.id === pickId && <span className="clh__label-pick">Today’s pick</span>}
            No. {String(index + 1).padStart(2, '0')} of {art.length}
          </p>
          <h2 className="clh__label-title">{active.title}</h2>
          {active.artist && <p className="clh__label-artist">{active.artist}{active.yearLabel ? `, ${active.yearLabel}` : ''}</p>}
          <p className="clh__label-blurb" key={active.id}>{active.blurb}</p>
          <div className="clh__label-nav">
            <button type="button" className="clh__arrow" onClick={() => step(-1)} aria-label="Previous piece">←</button>
            <Link className="clh__label-link" to="/gallery-wall">Walk the whole wall</Link>
            <button type="button" className="clh__arrow" onClick={() => step(1)} aria-label="Next piece">→</button>
          </div>
        </aside>
      </div>
    </section>
  );
}
