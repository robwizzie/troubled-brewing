import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HoursToday from '../HoursToday.jsx';
import OrderButton from '../OrderButton.jsx';
import { asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';
import { mergeWallPieces, WALL_OBJECTS } from '../../lib/wallPieces.js';
import {
  CoffeeCup, FoxFace, Balloon, FramedScene, Heart, TopHat, Star, Bunting,
  MapPin, OpenBook, Envelope,
} from '../Motifs.jsx';

/* "Gallery Wall" landing concept — the shop's own room, rebuilt.

   EVERY PICTURE ON THIS PAGE IS A REAL PHOTOGRAPH OF THE SHOP. The hero used
   to be composed over a generated café scene, with generated paintings hanging
   in its frames; the room is now drawn in CSS — the olive paint, the window
   light, the picture rail, the counter — and the wall is hung with the shop's
   own photographs in the shared vintage moldings. Nothing on this page stands
   in for the work of the artists whose pieces hang in the real room. It is
   also about 2.4 MB lighter on every phone that loads it.

   The composition, top to bottom, is the room as you meet it walking in:
     · a photograph of the actual room, with the brand lettered over it
     · the counter — today's live hours on the chalkboard, the taped special
     · the salon hang: every destination as a framed picture with a brass
       nameplate, the gold fox and the brass hare tucked among them
     · the way to order, and the signup

   It is one layout at every width — the columns and the type scale, the
   composition doesn't change — so what the owner edits on a laptop is exactly
   what a visitor gets on a phone. */

/* Drawn stand-ins for a piece whose photograph doesn't exist yet. They're
   components, so they can't live in the plain data module with the rest of
   the wall (src/lib/wallPieces.js). */
const MOTIFS = {
  cup: CoffeeCup, fox: FoxFace, balloon: Balloon, scene: FramedScene,
  heart: Heart, hat: TopHat, star: Star, bunting: Bunting,
  pin: MapPin, book: OpenBook, envelope: Envelope,
};

/* The room photograph behind the lettering. A real wide shot of the shop —
   owner-swappable from the editor. */
const DEFAULT_BANNER = 'images/wall/our-story-so-far.jpg';

/* alternating hand-hung tilts */
const TILTS = [-1.2, 0.9, -0.7, 1.3, -1.0, 0.8];

function KnowForm({ idSuffix, action }) {
  return (
    <form
      className="ig2-know"
      action={action}
      method="post"
      target="_blank"
      onSubmit={() => track('newsletter_signup', { location: 'gallery-hero' })}
    >
      <p className="ig2-know__title">Stay in the Know</p>
      <p className="ig2-know__body">Specials, new menu items, and local events.</p>
      <div className="ig2-know__row">
        <label className="sr-only" htmlFor={`igh-email-${idSuffix}`}>Email address</label>
        <input id={`igh-email-${idSuffix}`} type="email" name="EMAIL" required placeholder="your email" />
        <div aria-hidden="true" className="honeypot"><input type="text" name="b_honeypot" tabIndex={-1} defaultValue="" /></div>
        <button type="submit" aria-label="Subscribe">→</button>
      </div>
    </form>
  );
}

/* One piece on the wall: a real photograph in a real vintage molding, hung
   flush on the paint and knocked a degree off true. The molding, the engraved
   nameplate and the hover sweep are the shared `.gw-frame__*` recipes, so this
   wall and the Gallery Wall page are visibly the same wall. */
function WallPiece({ piece, index, eager }) {
  const { label, to, frame, ar, tint, img, small, motif, caption } = piece;
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(img) && !failed;
  const Motif = MOTIFS[motif] || CoffeeCup;

  return (
    <Link
      className={`ig2-mini${small ? ' ig2-mini--small' : ''}`}
      to={to}
      style={{ '--tilt': `${TILTS[index % TILTS.length]}deg` }}
    >
      {/* inner hanger so the entrance tween never fights the resting tilt */}
      <span className="ig2-mini__hang">
        <span
          className={`gw-frame__art ig2-mini__frame gw-frame__art--${frame}${
            tint && !showPhoto ? ` ig2-mini__frame--${tint}` : ''
          }${showPhoto ? '' : ' ig2-mini__frame--drawn'}`}
          style={{ '--ar': ar }}
        >
          {showPhoto ? (
            <img
              className="gw-frame__img"
              src={asset(img)}
              alt=""
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            /* Hand-lettered sign, not an empty board: the glyph alone read as
               a photograph that failed to load. */
            <span className="ig2-mini__drawn" aria-hidden="true">
              <Motif className="ig2-mini__motif" size={52} />
              {caption && (
                <span className="ig2-mini__caption">
                  {caption.split('\n').map((line) => <span key={line}>{line}</span>)}
                </span>
              )}
            </span>
          )}
        </span>
        {/* The nameplate is a SIBLING of the frame, not a child: inside it, the
            plate covered a real share of a thumb-sized picture, and the frame
            clips its own overflow so it could not be pushed out. Out here it
            rides the bottom molding the way a museum label does. */}
        <span className="gw-frame__plaque ig2-mini__plate">{label}</span>
      </span>
    </Link>
  );
}

export default function ImmersiveGalleryHero({ data = {} }) {
  const root = useRef(null);

  // igh_* namespace: all homepage looks share the one home hero row's data
  // object, so look-specific copy is prefixed to keep the looks from bleeding
  // into each other (docs/CMS.md). specials_link and ticker_items stay shared.
  const {
    igh_heading: heading = 'Trouble Brewing',
    igh_eyebrow: eyebrow = 'Welcome to',
    igh_descriptor: descriptor = 'Coffee House & Bakery',
    igh_menu_label: menuLabel = 'View menu',
    igh_hours_label: hoursLabel = 'Open Daily',
    igh_address: addressLine = '514 Station Ave · Haddon Heights, NJ 08035',
    igh_special_label: specialsLabel = "Today's Special",
    igh_special_text: specialText = 'Honey Almond Latte',
    igh_mailchimp_action_url: mailchimpUrl,
    igh_banner_image_url: bannerImage,
    igh_wall_heading: wallHeading = 'Have a look around',
    igh_pieces: pieceOverrides,
    specials_link: specialsLink = '/menu#specials',
  } = data;

  // the wall the owner actually configured (built-in hang + their labels,
  // links, photographs and moldings)
  const pieces = mergeWallPieces(pieceOverrides);
  const banner = bannerImage || asset(DEFAULT_BANNER);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    // same skip as useGsapEntrance: the editor canvas iframe must show
    // everything instantly, without entrance tweens racing live re-renders
    const editorCanvas = window.self !== window.top && new URLSearchParams(window.location.search).has('canvas');
    if (media.matches || editorCanvas || !root.current) return undefined;

    const hero = root.current;
    hero.classList.add('is-entering');

    // gsap stays a lazy chunk (same as useGsapEntrance) so this look never
    // weighs down first paint on pages — or homepage concepts — that skip it.
    // One settled entrance, then everything holds perfectly still.
    let ctx;
    let cancelled = false;
    const reveal = () => hero.classList.remove('is-entering');
    const fallback = window.setTimeout(() => {
      cancelled = true;
      reveal();
    }, 1400);
    import('gsap').then(({ gsap }) => {
      window.clearTimeout(fallback);
      if (cancelled || !root.current) return;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        // the room settles in from a gentle zoom, the lettering lands on the
        // wall, the counter props are set down, then the pictures are hung one
        // after another and the gold sculptures take their hooks
        tl.fromTo(
          '.ig2-banner',
          { autoAlpha: 0, scale: 1.05, transformOrigin: '50% 42%' },
          { autoAlpha: 1, scale: 1, duration: 1.15, ease: 'power2.out', clearProps: 'transform,opacity,visibility' }
        )
          .from('.ig2-brand__eyebrow', { autoAlpha: 0, y: -12, duration: 0.4 }, '-=0.65')
          .from('.ig2-brand__logo', {
            autoAlpha: 0, y: -22, scale: 0.92, transformOrigin: '50% 0%',
            duration: 0.6, ease: 'back.out(1.5)',
            clearProps: 'transform,opacity,visibility',
          }, '-=0.25')
          .from('.ig2-brand__descriptor', { autoAlpha: 0, y: 10, duration: 0.4 }, '-=0.3')
          .from('.ig2-chalk, .ig2-note', {
            autoAlpha: 0, y: 18, duration: 0.55, ease: 'back.out(1.4)', stagger: 0.12,
            clearProps: 'transform,opacity,visibility',
          }, '-=0.3')
          .from('.ig2-mini__hang', {
            autoAlpha: 0, y: 20, scale: 0.92, transformOrigin: '50% 0%',
            duration: 0.5, ease: 'back.out(1.5)',
            stagger: { each: 0.05, from: 'start' },
            clearProps: 'transform,opacity,visibility',
          }, '-=0.2')
          .from('.ig2-wall__object', {
            autoAlpha: 0, y: 14, rotation: -8, transformOrigin: '50% 100%',
            duration: 0.5, ease: 'back.out(2)', stagger: 0.1,
            clearProps: 'transform,opacity,visibility',
          }, '-=0.3');
      }, root);
      reveal();
    }).catch(() => {
      window.clearTimeout(fallback);
      reveal();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      ctx?.revert();
      reveal();
    };
  }, []);

  // the chalkboard address breaks on '·' so it letters like a painted sign
  const addressLines = addressLine ? addressLine.split('·').map((s) => s.trim()).filter(Boolean) : [];

  return (
    <section className="ig2-hero" ref={root}>
      {/* ---- the room: a real photograph of the shop, brand lettered over it ---- */}
      <div className="ig2-banner">
        <img
          className="ig2-banner__img"
          src={banner}
          alt="Inside Trouble Brewing Coffee House"
          fetchpriority="high"
          decoding="async"
        />
        <div className="ig2-brand">
          <p className="ig2-brand__eyebrow"><span aria-hidden="true">—❧</span> {eyebrow} <span aria-hidden="true">❧—</span></p>
          {/* the real brand lockup, remastered cream so it reads as painted-on-
              the-wall signage (fox + wordmark + Haddon Heights ribbon) */}
          <h1 className="ig2-brand__logo">
            <img src={asset('images/brand/logo-fox-cream.png')} alt={heading} />
          </h1>
          <p className="ig2-brand__descriptor"><span aria-hidden="true">◆</span> {descriptor} <span aria-hidden="true">◆</span></p>
        </div>
      </div>

      {/* ---- the painted wall the pictures hang on ---- */}
      <div className="ig2-room">
        {/* the counter: today's hours and the taped special, the two things
            most visitors actually came for, right under the banner */}
        <div className="ig2-counter">
          <div className="ig2-chalk">
            <p className="ig2-chalk__title"><span aria-hidden="true">✦</span> {hoursLabel} <span aria-hidden="true">✦</span></p>
            <div className="ig2-chalk__hours"><HoursToday variant="sign" /></div>
            {addressLines.length > 0 && (
              <a
                className="ig2-chalk__note"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Get directions to ${addressLine}`}
                onClick={() => track('directions_click', { location: 'gallery-hero' })}
              >
                {addressLines.map((l) => <span key={l}>{l}</span>)}
              </a>
            )}
          </div>

          {specialText && (
            <Link
              className="ig2-note"
              to={specialsLink || '/menu'}
              onClick={() => track('specials_click', { location: 'gallery-hero' })}
            >
              <p className="ig2-note__title">{specialsLabel}</p>
              <p className="ig2-note__special">{specialText}</p>
              <span className="ig2-note__cta">{menuLabel} <b aria-hidden="true">→</b></span>
            </Link>
          )}
        </div>

        {/* A CSS multi-column masonry, not a grid of equal cells: pieces of
            different shapes nest under each other and the browser balances the
            column heights itself, so the hang stays composed at every width and
            simply gains a column on a wider screen. Column-major fill means the
            visual order and the tab order are the same order. */}
        {wallHeading && <p className="ig2-wall__heading">{wallHeading}</p>}
        <nav className="ig2-wall" aria-label="Explore Trouble Brewing">
          {pieces.map((piece, i) => {
            const object = WALL_OBJECTS.find((o) => o.after === piece.id);
            return (
              <Fragment key={piece.id}>
                <WallPiece piece={piece} index={i} eager={i < 4} />
                {object && (
                  <img
                    className={`ig2-wall__object ig2-wall__object--${object.mod}`}
                    src={asset(object.src)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    width="82"
                    height="120"
                  />
                )}
              </Fragment>
            );
          })}
        </nav>

        {/* The wall closes on the thing most visitors want next: ordering. It
            hangs as the widest piece — a brass sign across the columns — so the
            hang finishes on a straight bottom edge instead of a ragged one. */}
        <div className="ig2-wall__closer">
          <OrderButton className="btn btn--accent ig2-order" location="gallery-hero" />
          <p className="ig2-wall__closer-note">Order ahead on SpotOn — we&rsquo;ll have it ready.</p>
        </div>

        {mailchimpUrl && <KnowForm idSuffix="hero" action={mailchimpUrl} />}
      </div>
    </section>
  );
}
