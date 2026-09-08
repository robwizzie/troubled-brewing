import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';
import { getGalleryPieces } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import {
  WALL_ART, WALL_IMAGE, WALL_STAGE_RATIO, REST_VIEW, mergeWallArt, viewFor,
} from '../../lib/galleryWall.js';

/* THE WALL ITSELF, not a grid of pictures of it.

   This section hangs the shop's own photograph of the green gallery wall and
   lays a hotspot over every piece in it (geometry: src/lib/galleryWall.js).
   Choose one and the room does what you would do standing in the shop: it
   walks up to that piece. The photograph pans and magnifies, the rest of the
   wall drops into shadow around it, and a brass-plated card comes up beside it
   with the title, the artist and the story.

   The whole move is ONE transform on ONE layer — `translate(x%, y%) scale(s)`
   on the photograph, with the hotspots riding along as its children — so every
   frame stays welded to the art at any zoom and the animation is a single
   compositor-friendly tween. Because CSS translate percentages resolve against
   the layer's own box, the math is pure percentages of the photograph and
   never needs a measured pixel (see viewFor()).

   The photograph is 934px wide, so viewFor() caps the zoom where an
   enlargement still looks like a photograph rather than porridge. The card
   carries the real detail instead: the owner's own straight-on shot of the
   piece when the collection has one, otherwise a native-resolution crop of the
   wall itself. */

const WALL_PHOTO = 'images/wall/gallery-wall.jpg';

/* Where a chosen piece lands in the stage, as a share of it. Wide screens hold
   the card over the right of the room, so the art sits left of center and takes
   a little under half the width; narrow screens drop the card out of the room
   entirely and into the page below it, so the piece gets the whole stage —
   which is the difference between a phone zooming in and a phone pretending
   to. */
const FIT_WIDE = { cx: 0.27, cy: 0.5, w: 0.46, h: 0.74 };
const FIT_NARROW = { cx: 0.5, cy: 0.5, w: 0.86, h: 0.86 };

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

/* A native-resolution crop of one piece out of the wall photograph — the card's
   close-up when the owner hasn't photographed that piece on its own.
   background-size blows the whole photograph up until this one box fills the
   element, which is the crop that stays sharp: the element is sized by the
   piece's real pixel footprint in the source. */
function WallCrop({ art, photo }) {
  return (
    <span
      className="gwr-card__crop"
      style={{
        aspectRatio: `${art.w * WALL_IMAGE.w} / ${art.h * WALL_IMAGE.h}`,
        backgroundImage: `url("${photo}")`,
        backgroundSize: `${(100 / art.w) * 100}% ${(100 / art.h) * 100}%`,
        backgroundPosition: `${(art.x / (100 - art.w)) * 100}% ${(art.y / (100 - art.h)) * 100}%`,
      }}
    />
  );
}

export default function GalleryWallRoom({ data = {} }) {
  const {
    heading = 'The Gallery Wall',
    intro = 'Every frame on this wall arrived some other way — found, gifted, or made by somebody who drinks here. Have a proper look at any of them.',
    hint = 'Pick something off the wall',
    image_url: imageOverride,
  } = data;

  const photo = imageOverride || asset(WALL_PHOTO);

  const [pieces, setPieces] = useState(null);
  const version = useDataVersion('gallery_pieces');
  useEffect(() => {
    let alive = true;
    getGalleryPieces().then((p) => alive && setPieces(p));
    return () => { alive = false; };
  }, [version]);

  /* The wall is complete from the first paint — the owner's catalogue only ever
     adds credits and stories to frames that are already hanging, so there is
     nothing to hold the room back for and no skeleton to flash. */
  const art = useMemo(() => mergeWallArt(pieces), [pieces]);

  const [openId, setOpenId] = useState(null);
  const openIndex = art.findIndex((a) => a.id === openId);
  const open = openIndex >= 0 ? art[openIndex] : null;

  const wide = useMediaQuery('(min-width: 860px)');
  const view = open ? viewFor(open, wide ? FIT_WIDE : FIT_NARROW) : REST_VIEW;

  const closeRef = useRef(null);
  const returnRef = useRef(null);
  const cardRef = useRef(null);

  const openPiece = useCallback((id, trigger) => {
    returnRef.current = trigger || null;
    setOpenId(id);
    const piece = WALL_ART.find((a) => a.id === id);
    track('gallery_piece_open', { piece: id, title: piece?.title || id });
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    const back = returnRef.current;
    returnRef.current = null;
    if (back && typeof back.focus === 'function') back.focus();
  }, []);

  const step = useCallback((delta) => {
    if (openIndex < 0) return;
    const next = art[(openIndex + delta + art.length) % art.length];
    returnRef.current = null;
    setOpenId(next.id);
    track('gallery_piece_open', { piece: next.id, title: next.title, via: 'step' });
  }, [art, openIndex]);

  // Escape closes and the arrows walk the wall — bound only while a piece is
  // up, so the page never swallows a key the visitor meant for the browser.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, step]);

  /* Focus follows the art: a keyboard visitor lands on the story rather than
     carrying on through the other eighteen hotspots. `preventScroll` because
     the card decides its own scrolling on the next line — on a phone it hangs
     below the room, and `block: 'nearest'` brings it up only when it isn't
     already on screen. */
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    if (typeof cardRef.current?.scrollIntoView === 'function') {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [openIndex, open]);

  /* Bigger pieces are painted first so the small ones layered over them stay
     clickable — the brass hare overlaps the butterfly oval on the real wall,
     and the daisies overlap the grey room. `order` keeps reading order for the
     arrows and the index below. */
  const stacked = useMemo(
    () => art.map((a, i) => ({ ...a, order: i })).sort((a, b) => b.w * b.h - a.w * a.h),
    [art]
  );

  return (
    <Reveal as="section" className={`section gwr${open ? ' gwr--open' : ''}`}>
      <div className="container">
        <header className="gwr__head">
          <h2 className="section-heading">{heading}</h2>
          {intro && <p className="section-sub">{intro}</p>}
        </header>

        <div className="gwr__body" style={{ '--gwr-ratio': WALL_STAGE_RATIO }}>
          <div className="gwr__room">
            <div className="gwr__stage">
              <div
                className="gwr__art"
                style={{
                  '--gwr-scale': view.scale,
                  transform: `translate(${view.x}%, ${view.y}%) scale(${view.scale})`,
                }}
              >
                <img
                  className="gwr__photo"
                  src={photo}
                  alt="The gallery wall at Trouble Brewing — dozens of framed pictures hung together on a green wall"
                  width={WALL_IMAGE.w}
                  height={WALL_IMAGE.h}
                  decoding="async"
                />

                {/* The spotlight IS the dimming: one box on the chosen piece with a
                    shadow big enough to swallow the rest of the room. It lives in
                    the art layer, so it tracks the frame through the whole move
                    instead of chasing it. */}
                {open && (
                  <span
                    className={`gwr__spotlight${open.shape === 'oval' ? ' gwr__spotlight--oval' : ''}`}
                    style={{ left: `${open.x}%`, top: `${open.y}%`, width: `${open.w}%`, height: `${open.h}%` }}
                    aria-hidden="true"
                  />
                )}

                {stacked.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`gwr__spot${a.shape === 'oval' ? ' gwr__spot--oval' : ''}${openId === a.id ? ' is-open' : ''}`}
                    style={{
                      left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%`,
                      zIndex: a.order + 2,
                    }}
                    aria-label={`Look closer at ${a.title}`}
                    aria-expanded={openId === a.id}
                    onClick={(e) => (openId === a.id ? close() : openPiece(a.id, e.currentTarget))}
                  >
                    {/* The nameplate counter-scales, so a frame's label is the
                        same size whether the room is at rest or magnified — and
                        it flips above a piece hung near the bottom of the wall,
                        or right-aligns on one near the edge, because the stage
                        clips its own overflow and a label outside it is a label
                        nobody reads. */}
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

              {/* Anywhere else in the room puts the piece back on the wall. It sits
                  over the art and under the card, so it also stops a stray click
                  landing on a hotspot that is halfway off the stage. */}
              {open && (
                <button type="button" className="gwr__dismiss" onClick={close}>
                  <span className="sr-only">Back to the wall</span>
                </button>
              )}

              {!open && <p className="gwr__hint" aria-hidden="true">{hint}</p>}
            </div>

            {/* Named, because an <aside> nested in sectioning content is only a
                landmark when it carries an accessible name — and this one is the
                label beside the picture, which is what a landmark is for. */}
            {open && (
              <aside className="gwr-card" ref={cardRef} aria-label={`About ${open.title}`}>
                <div className="gwr-card__media">
                  {open.photo ? (
                    <img className="gwr-card__photo" src={open.photo} alt={open.title} decoding="async" />
                  ) : (
                    <WallCrop art={open} photo={photo} />
                  )}
                </div>

                <div className="gwr-card__body">
                  <p className="gwr-card__eyebrow">
                    {open.kind === 'object' ? 'Not a picture' : 'On the wall'}
                    <span aria-hidden="true"> · </span>
                    {openIndex + 1} of {art.length}
                  </p>
                  <h3 className="gwr-card__title">{open.title}</h3>

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

                  <p className="gwr-card__blurb">{open.blurb}</p>
                  {open.story ? (
                    <p className="gwr-card__story">{open.story}</p>
                  ) : (
                    /* Honest rather than blank: the line above says what is in the
                       frame, and this says the rest is a conversation the website
                       hasn't had yet. */
                    <p className="gwr-card__untold">
                      The story behind this one isn&rsquo;t written down yet &mdash; ask a Troublemaker.
                    </p>
                  )}
                  {open.forSale && <p className="gwr-card__sale">Ask us &mdash; this one&rsquo;s for sale</p>}
                </div>

                <div className="gwr-card__nav">
                  <button type="button" className="gwr-card__step" onClick={() => step(-1)} aria-label="Previous piece">
                    <span aria-hidden="true">←</span>
                  </button>
                  <button type="button" className="gwr-card__back" ref={closeRef} onClick={close}>
                    Back to the wall
                  </button>
                  <button type="button" className="gwr-card__step" onClick={() => step(1)} aria-label="Next piece">
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </aside>
            )}
          </div>

          {/* The wall's contents as plain text, always in the document. A screen
              reader — or a crawler — gets the whole collection without operating
              a zooming photograph, and every hotspot above is a shortcut into
              this same list. */}
          <ul className="gwr__index">
            {art.map((a) => (
              <li key={a.id} className="gwr__index-item">
                <button
                  type="button"
                  className={`gwr__index-link${openId === a.id ? ' is-open' : ''}`}
                  onClick={(e) => openPiece(a.id, e.currentTarget)}
                >
                  {a.title}
                </button>
                {a.artist && <span className="gwr__index-artist">{a.artist}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
