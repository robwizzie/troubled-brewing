import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reveal from '../Reveal.jsx';
import {
  WALL_PHOTO, WALL_PHOTO_LARGE, wallPhotoProps, wallZoomPhoto, preloadImage,
} from '../../lib/wallPhoto.js';
import { track } from '../../lib/analytics.js';
import { getGalleryPieces } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import {
  WALL_IMAGE, REST_VIEW, resolveWall, ownWallPieces, stageRatioFor, viewFor, rotatedBounds,
  spatialOrder, mergeWallArt, stepIndex, pieceAt, toFocusBox, fromFocusPoint, visibleBox,
  readPieceParam, withPieceParam,
} from '../../lib/galleryWall.js';

/* THE WALL ITSELF, not a grid of pictures of it.

   This section hangs the shop's own photograph of the green gallery wall and
   lays a hotspot over every piece in it (geometry: src/lib/galleryWall.js).
   Choose one and the room walks up to it: the photograph pans and magnifies,
   the rest of the wall drops into shadow, and the panel beside it (below it,
   on a phone) tells you what you're looking at.

   The room is built so a visitor can't get lost in it:

     • ONE FOCUS AT A TIME. The room is the photograph plus a panel that is
       always there — beside the art on a wide screen, under it on a phone —
       and the two together are sized to fit the window. Choosing, stepping
       or going back changes what's IN them, never their size, so nothing on
       the page moves and the art and its story are always on screen together.
     • OBVIOUS WAYS ROUND. Prev / Next (and the arrow keys, and a swipe) walk
       the wall in a fixed spatial order — see spatialOrder() — with an
       "N of M" counter, a mini-map of the whole wall showing where you are,
       and one plain "Back to the whole wall" button (Esc does the same).
       Tapping the dimmed room does nothing: nothing is lost by a stray tap.
     • CALM MOTION. The move is ONE transform on ONE layer —
       `translate(x%, y%) scale(s)` on the photograph, hotspots riding along —
       eased over ~450ms, instant under reduced motion. The photograph never
       changes underneath it: the full-resolution copy is fetched and decoded
       off-screen first, then laid over the top, so a close-up sharpens but
       is never blank.

   Because CSS translate percentages resolve against the layer's own box, the
   pan math is pure percentages of the photograph (see viewFor()). */

/* Where a chosen piece lands in the stage, as a share of it. The panel never
   overlaps the stage any more, so the piece simply takes the middle. */
const FIT_WIDE = { cx: 0.5, cy: 0.5, w: 0.84, h: 0.84 };
const FIT_NARROW = { cx: 0.5, cy: 0.5, w: 0.9, h: 0.9 };

/* The resting photograph is never larger than this on screen (px) — mirrors
   the stage sizing in gallery-room.css, so the `sizes` hint matches. Zooming
   doesn't touch this image (the close-up copy is a separate layer), so the
   browser never swaps it mid-move. */
const BASE_SIZES = '(min-width: 860px) 760px, 100vw';

const SWIPE_MIN = 40; // px of horizontal travel before a swipe counts
const HINT_KEY = 'tb:gallery-wall:hint-seen';

function readHintSeen() {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}
function writeHintSeen() {
  try {
    window.localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* private window: the hint just comes back next visit */
  }
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** How far down the window the sticky site header reaches (px). */
function headerOffset() {
  if (typeof document === 'undefined') return 0;
  const nav = document.querySelector('.nav');
  if (nav) return Math.max(0, nav.getBoundingClientRect().bottom);
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
  return Number.isFinite(v) ? v : 0;
}

/* A native-resolution crop of one piece out of the wall photograph — the
   panel's close-up when the owner hasn't photographed that piece on its own. */
function WallCrop({ art: piece, photo, imageRatio }) {
  // a tilted piece is cut out by the level box around it
  const art = rotatedBounds(piece, imageRatio);
  return (
    <span
      className="gwr-card__crop"
      style={{
        aspectRatio: `${art.w * imageRatio} / ${art.h}`,
        backgroundImage: `url("${photo}")`,
        backgroundSize: `${(100 / art.w) * 100}% ${(100 / art.h) * 100}%`,
        backgroundPosition: `${(art.x / (100 - art.w)) * 100}% ${(art.y / (100 - art.h)) * 100}%`,
      }}
    />
  );
}

/* The whole wall in miniature: a dot per piece, the current one lit, and a
   box for the part of the wall the room is showing. A tap jumps to the piece
   under (or nearest) the tap. It's a pointer shortcut — keyboard and screen
   reader visitors have Prev / Next and the index, so it stays out of the
   accessibility tree rather than adding nineteen more tab stops. */
function MiniMap({ art, openId, view, photo, stageRatio, aspect, onPick }) {
  const here = toFocusBox(visibleBox(view));
  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const p = fromFocusPoint(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    const hit = pieceAt(art, p.x, p.y, aspect);
    if (hit) onPick(hit.id);
  };
  return (
    <div
      className="gwr-map"
      style={{ '--gwr-ratio': stageRatio }}
      onClick={onClick}
      aria-hidden="true"
      title="Wall map — tap to jump to a piece"
    >
      <img
        className="gwr-map__photo"
        src={photo}
        alt=""
        decoding="async"
        style={{ transform: `translate(${REST_VIEW.x}%, ${REST_VIEW.y}%)` }}
      />
      {art.map((a) => {
        const f = toFocusBox(a);
        return (
          <span
            key={a.id}
            className={`gwr-map__dot${a.id === openId ? ' is-here' : ''}`}
            style={{ left: `${f.x + f.w / 2}%`, top: `${f.y + f.h / 2}%` }}
          />
        );
      })}
      <span
        className="gwr-map__view"
        style={{ left: `${here.x}%`, top: `${here.y}%`, width: `${here.w}%`, height: `${here.h}%` }}
      />
    </div>
  );
}

export default function GalleryWallRoom({ data = {} }) {
  const {
    heading = 'The Gallery Wall',
    intro = 'Every frame on this wall arrived some other way — found, gifted, or made by somebody who drinks here. Have a proper look at any of them.',
    hint = 'Tap a frame to look closer',
    image_url: imageOverride,
    image_ratio: storedRatio,
  } = data;

  /* The photograph's shape. Ours is 934 x 1400; an owner's replacement
     records its own when it's chosen in the wall editor, so the room frames
     the same slice of whatever photo hangs. Hotspots are % of the photo
     either way, so they ride along. */
  const imageRatio = imageOverride && Number(storedRatio) > 0 ? Number(storedRatio) : WALL_IMAGE.w / WALL_IMAGE.h;
  const stageRatio = stageRatioFor(imageRatio);

  const photo = imageOverride || WALL_PHOTO;
  const cropPhoto = imageOverride || WALL_PHOTO_LARGE;

  const [pieces, setPieces] = useState(null);
  const version = useDataVersion('gallery_pieces');
  useEffect(() => {
    let alive = true;
    getGalleryPieces().then((p) => alive && setPieces(p));
    return () => { alive = false; };
  }, [version]);

  /* The wall is complete from the first paint — the owner's catalogue only
     adds credits and stories to frames already hanging — and it is always in
     walking order, so the counter, Prev / Next and the index agree. */
  const ownPieces = data.pieces;
  const art = useMemo(() => resolveWall({ pieces: ownPieces }, pieces), [ownPieces, pieces]);

  /* ?piece=<id> opens the room on that piece. Read once, synchronously, so the
     first paint is already the right view rather than a jump to it. */
  const [openId, setOpenId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const own = ownWallPieces(data);
    const ids = (own || spatialOrder(mergeWallArt(null))).map((a) => a.id);
    return readPieceParam(window.location.search, ids);
  });
  const openIndex = art.findIndex((a) => a.id === openId);
  const open = openIndex >= 0 ? art[openIndex] : null;

  const wide = useMediaQuery('(min-width: 860px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const view = open ? viewFor(open, wide ? FIT_WIDE : FIT_NARROW, imageRatio) : REST_VIEW;

  const [hintSeen, setHintSeen] = useState(readHintSeen);

  const roomRef = useRef(null);
  const titleRef = useRef(null);
  const returnRef = useRef(null);
  /* what to do once the next render lands: focus the story, or hand focus
     back to whatever opened it */
  const pendingFocus = useRef(null);

  /* ---- the close-up copy ------------------------------------------------
     Fetched and decoded off-screen — early, when the browser is idle, and
     again (a no-op if it's done) the moment a piece opens — and only laid
     over the wall once it can paint whole. Until then the room zooms the copy
     it already has, so the picture is never lost mid-move. */
  const zoomSrc = imageOverride ? null : wallZoomPhoto(wide);
  const [hiRes, setHiRes] = useState(null);
  const [everOpened, setEverOpened] = useState(Boolean(openId));
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // (StrictMode re-mounts: set it again, not just once)
    return () => { alive.current = false; };
  }, []);
  const requestHiRes = useCallback(() => {
    if (!zoomSrc) return;
    preloadImage(zoomSrc).then((u) => { if (alive.current) setHiRes(u); }, () => {});
  }, [zoomSrc]);
  useEffect(() => {
    if (!zoomSrc || typeof window === 'undefined') return undefined;
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(requestHiRes, { timeout: 4000 })
      : window.setTimeout(requestHiRes, 1500);
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(idle) : window.clearTimeout(idle));
  }, [zoomSrc, requestHiRes]);

  /* Bring the whole room — photograph AND panel — onto the screen, under the
     sticky header, but only when some of it is off screen: stepping round a
     room that is already in view never scrolls the page. */
  const ensureInView = useCallback(() => {
    const el = roomRef.current;
    if (!el || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    const top = headerOffset();
    const vh = window.innerHeight;
    if (r.top >= top - 1 && r.bottom <= vh + 1) return;
    const slack = Math.max(0, (vh - top - r.height) / 2);
    /* Aim at where the room is laid out, not where it is drawn this instant:
       the section fades up into place on first sight (Reveal), and a target
       taken mid-fade would land the room under the header once it settles.
       offsetTop ignores transforms; the rect is the fallback without layout. */
    let laidOut = 0;
    for (let n = el; n; n = n.offsetParent) laidOut += n.offsetTop;
    const pageTop = laidOut || window.scrollY + r.top;
    window.scrollTo({ top: pageTop - top - slack, behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced]);

  const openPiece = useCallback((id, { trigger = null, via = 'wall' } = {}) => {
    if (trigger) returnRef.current = trigger;
    if (id === openId) {
      // already up (e.g. picked again from the index): just bring it back
      ensureInView();
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    pendingFocus.current = 'story';
    setOpenId(id);
    setEverOpened(true);
    setHintSeen(true);
    writeHintSeen();
    requestHiRes();
    const piece = art.find((a) => a.id === id);
    track('gallery_piece_open', { piece: id, title: piece?.title || id, via });
  }, [openId, ensureInView, requestHiRes, art]);

  const close = useCallback(() => {
    pendingFocus.current = 'return';
    setOpenId(null);
  }, []);

  const step = useCallback((delta) => {
    if (openIndex < 0 || !art.length) return;
    const next = art[stepIndex(openIndex, delta, art.length, true)];
    pendingFocus.current = null; // focus stays on the button that was pressed
    setOpenId(next.id);
    track('gallery_piece_open', { piece: next.id, title: next.title, via: 'step' });
  }, [art, openIndex]);

  /* After each change of piece: keep the room on screen, then put focus
     where it belongs — on the story for a fresh look, back on the frame (or
     the index entry) that opened it when the visitor returns to the wall. */
  useEffect(() => {
    const want = pendingFocus.current;
    pendingFocus.current = null;
    if (openId) {
      ensureInView();
      if (want === 'story') titleRef.current?.focus({ preventScroll: true });
      return;
    }
    if (want !== 'return') return;
    let back = returnRef.current;
    returnRef.current = null;
    if (!back || !back.isConnected) back = null;
    if (back && typeof back.focus === 'function') back.focus({ preventScroll: true });
  }, [openId, ensureInView]);

  // When closing without a trigger to return to, land on the frame just left.
  const lastOpen = useRef(openId);
  useEffect(() => {
    if (openId) { lastOpen.current = openId; return; }
    if (returnRef.current || !lastOpen.current || !roomRef.current) return;
    const spot = roomRef.current.querySelector(`[data-piece="${lastOpen.current}"]`);
    lastOpen.current = null;
    if (spot && document.activeElement === document.body) spot.focus({ preventScroll: true });
  }, [openId]);

  /* A deep-linked piece: fetch the close-up straight away and bring the room
     into view once the page has finished laying itself out (fonts and images
     above it can still move it until `load`). */
  useEffect(() => {
    if (!openId) return undefined;
    requestHiRes();
    let t = 0;
    const go = () => { t = window.setTimeout(ensureInView, 50); };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    return () => {
      window.removeEventListener('load', go);
      window.clearTimeout(t);
    };
    // first render only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The address bar follows the visitor (replace, not push: Back leaves the page).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const next = withPieceParam(window.location.href, openId);
    const now = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== now) window.history.replaceState(window.history.state, '', next);
  }, [openId]);

  // Esc goes back to the wall; the arrows walk it — bound only while a piece is up.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, step]);

  // A sideways swipe across the zoomed photograph steps to the next piece.
  const touch = useRef(null);
  const onTouchStart = (e) => {
    touch.current = open && e.touches.length === 1
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
  };
  const onTouchEnd = (e) => {
    const s = touch.current;
    touch.current = null;
    if (!s || !open || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > 1.4 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  };

  /* Bigger pieces are painted first so the small ones layered over them stay
     clickable — the brass hare overlaps the butterfly oval on the real wall. */
  const stacked = useMemo(
    () => art.map((a, i) => ({ ...a, order: i })).sort((a, b) => b.w * b.h - a.w * a.h),
    [art]
  );

  const first = art[0];

  return (
    <Reveal as="section" className={`section gwr${open ? ' gwr--open' : ''}`}>
      <div className="container">
        <header className="gwr__head">
          <h2 className="section-heading">{heading}</h2>
          {intro && <p className="section-sub">{intro}</p>}
        </header>
      </div>

      <div className="gwr__band" style={{ '--gwr-ambient': `url("${photo}")`, '--gwr-ratio': stageRatio }}>
        <div className="gwr__room" ref={roomRef}>
          <div className="gwr__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div
              className="gwr__art"
              style={{
                '--gwr-scale': view.scale,
                transform: `translate(${view.x}%, ${view.y}%) scale(${view.scale})`,
              }}
            >
              <img
                className="gwr__photo"
                {...wallPhotoProps(imageOverride, BASE_SIZES)}
                fetchpriority="high"
                alt="The gallery wall at Trouble Brewing — dozens of framed pictures hung together on a green wall"
                width={imageOverride ? undefined : WALL_IMAGE.w}
                height={imageOverride ? undefined : WALL_IMAGE.h}
                decoding="async"
              />
              {hiRes && hiRes === zoomSrc && everOpened && (
                <img className="gwr__photo gwr__photo--hi" src={hiRes} alt="" aria-hidden="true" />
              )}

              {/* The spotlight IS the dimming: one box on the chosen piece with
                  a shadow big enough to swallow the rest of the room. */}
              {open && (
                <span
                  className={`gwr__spotlight${open.shape === 'oval' ? ' gwr__spotlight--oval' : ''}`}
                  style={{
                    left: `${open.x}%`, top: `${open.y}%`, width: `${open.w}%`, height: `${open.h}%`,
                    transform: open.r ? `rotate(${open.r}deg)` : undefined,
                  }}
                  aria-hidden="true"
                />
              )}

              {stacked.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  data-piece={a.id}
                  data-tb-piece={a.id}
                  data-tb-piece-label={a.title}
                  className={`gwr__spot${a.shape === 'oval' ? ' gwr__spot--oval' : ''}${openId === a.id ? ' is-open' : ''}`}
                  style={{
                    left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%`,
                    /* tilted frames: the box (and so its outline, its tap
                       area and the nameplate riding on it) turns with them */
                    transform: a.r ? `rotate(${a.r}deg)` : undefined,
                    zIndex: i + 2,
                    /* past a gentle tilt the nameplate turns back level, so it always reads */
                    '--plate-unrot': Math.abs(a.r || 0) > 15 ? `${-a.r}deg` : '0deg',
                  }}
                  aria-label={`Look closer at ${a.title}`}
                  tabIndex={open ? -1 : 0}
                  onClick={(e) => openPiece(a.id, { trigger: e.currentTarget, via: 'wall' })}
                >
                  {/* nameplate: whole-wall view only, on hover / focus */}
                  <span
                    className={`gwr__plate${a.y + a.h > 56 ? ' gwr__plate--above' : ''}${
                      a.x + a.w / 2 > 86 ? ' gwr__plate--right' : ''
                    }`}
                  >
                    {a.title}
                  </span>
                </button>
              ))}
            </div>

            {/* While a piece is up, the rest of the room is shadow and does
                nothing when tapped — a stray tap never loses the picture. The
                veil also keeps half-visible hotspots from catching taps. */}
            {open && <div className="gwr__veil" aria-hidden="true" />}

            {!open && !hintSeen && <p className="gwr__hint" aria-hidden="true">{hint}</p>}
          </div>

          {/* The panel is always here, so choosing a piece changes its words,
              never the page's layout. Named, because an <aside> nested in
              sectioning content is only a landmark with an accessible name. */}
          <aside className="gwr-panel" aria-label={open ? `About ${open.title}` : 'About the gallery wall'}>
            <div className="gwr-panel__inner">
              {open ? (
                <>
                  <div className="gwr-panel__bar">
                    <button type="button" className="gwr-btn gwr-btn--step" onClick={() => step(-1)} aria-label="Previous piece">
                      <span aria-hidden="true">‹</span> <span className="gwr-btn__word">Prev</span>
                    </button>
                    <p className="gwr-panel__count">
                      {openIndex + 1} of {art.length}
                    </p>
                    <button type="button" className="gwr-btn gwr-btn--step" onClick={() => step(1)} aria-label="Next piece">
                      <span className="gwr-btn__word">Next</span> <span aria-hidden="true">›</span>
                    </button>
                  </div>

                  <div className="gwr-panel__body">
                    <div className="gwr-card__media">
                      {open.photo ? (
                        <img className="gwr-card__photo" src={open.photo} alt={open.title} decoding="async" />
                      ) : (
                        <WallCrop art={open} photo={cropPhoto} imageRatio={imageRatio} />
                      )}
                    </div>
                    <p className="gwr-card__eyebrow">{open.kind === 'object' ? 'Not a picture' : 'On the wall'}</p>
                    <h3 className="gwr-card__title" ref={titleRef} tabIndex={-1}>{open.title}</h3>

                    {open.artist && (
                      <p className="gwr-card__artist">
                        {open.artistUrl ? (
                          <a
                            href={open.artistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => track('outbound_click', { dest: 'gallery_artist', name: open.artist })}
                          >
                            {open.artist}
                          </a>
                        ) : open.artist}
                      </p>
                    )}

                    {(open.medium || open.yearLabel) && (
                      <p className="gwr-card__credits">
                        {[open.medium, open.yearLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {open.blurb && <p className="gwr-card__blurb">{open.blurb}</p>}
                    {/* no story yet → nothing at all, not a placeholder */}
                    {open.story && <p className="gwr-card__story">{open.story}</p>}
                    {open.forSale && <p className="gwr-card__sale">Ask us &mdash; this one&rsquo;s for sale</p>}
                  </div>

                  <div className="gwr-panel__foot">
                    <MiniMap
                      art={art}
                      openId={openId}
                      view={view}
                      photo={photo}
                      stageRatio={stageRatio}
                      aspect={imageRatio}
                      onPick={(id) => id !== openId && openPiece(id, { via: 'map' })}
                    />
                    <button type="button" className="gwr-btn gwr-btn--back" onClick={close}>
                      Back to the whole wall
                    </button>
                  </div>
                </>
              ) : (
                <div className="gwr-panel__rest">
                  <p className="gwr-card__eyebrow">The whole wall &middot; {art.length} pieces</p>
                  <h3 className="gwr-card__title">Have a proper look</h3>
                  <p className="gwr-panel__lede">
                    Tap any frame to walk up to it. Then use Prev and Next to go round the wall piece by
                    piece &mdash; you can always come back to the whole wall.
                  </p>
                  {first && (
                    <button
                      type="button"
                      className="gwr-btn gwr-btn--back"
                      onClick={() => openPiece(first.id, { via: 'start' })}
                    >
                      Start with {first.title}
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* said once per change, for anyone not looking at the counter */}
          <p className="sr-only" aria-live="polite">
            {open ? `${openIndex + 1} of ${art.length}: ${open.title}` : ''}
          </p>
        </div>
      </div>

      <div className="container">
        {/* The wall's contents as plain text, always in the document and in
            the same walking order as Prev / Next. Choosing one here brings the
            room into view on that piece. */}
        <ol className="gwr__index">
          {art.map((a) => (
            <li key={a.id} className="gwr__index-item">
              <button
                type="button"
                className={`gwr__index-link${openId === a.id ? ' is-open' : ''}`}
                aria-current={openId === a.id ? 'true' : undefined}
                onClick={(e) => openPiece(a.id, { trigger: e.currentTarget, via: 'index' })}
              >
                {a.title}
              </button>
              {a.artist && <span className="gwr__index-artist">{a.artist}</span>}
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
