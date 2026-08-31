import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HoursToday from '../HoursToday.jsx';
import OrderButton from '../OrderButton.jsx';
import { asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';
import {
  CoffeeCup, FoxFace, Balloon, FramedScene, Heart, TopHat, Star, Bunting,
  MapPin, OpenBook, Envelope,
} from '../Motifs.jsx';

/* "Immersive Gallery" landing concept — the unbranded café scene artwork is
   the canvas (public/images/wall/immersive-scene.jpg, 1536×1024), and every
   piece of branding is live HTML laid over it: the welcome lettering on the
   dappled wall, hand-placed labels on the frames (each one a link mirroring
   the navbar), a chalkboard with the real live hours, the taped specials
   note, and the Stay-in-the-Know signup. Overlay geometry is % of the scene
   and type is sized in cqw, so everything scales as one piece of art.

   Under 1020px the wall RE-HANGS ITSELF for phones — not as a menu of
   plaques, but as a real salon hang: the scene becomes a banner and every
   destination becomes an actual FRAMED PHOTOGRAPH from the shop
   (public/images/wall/*.jpg — the same photographs the Gallery Wall concept
   hangs) in its own vintage molding, hung flush on the paint and tilted by
   hand, with
   the SAME engraved brass nameplate the desktop wall uses. Two masonry
   columns let tall portraits and wide landscapes nest the way a collected
   wall really does. The gold fox and the brass hare keep watch among them.
   No HTML top bar: the site nav is the navbar. */

const SCENE = 'images/wall/immersive-scene.jpg';

/* Frame hotspots: % boxes of the 1536×1024 artwork. Every destination in the
   navbar (primary + More) hangs somewhere on the wall. Boxes are tuned to hug
   each frame's molding — the label renders as a brass nameplate centered on
   the frame's bottom edge, so box centers/bottoms must be exact.

   `piece` is the destination's PHONE incarnation — a real framed picture on
   the re-hung wall:
     frame  a vintage molding from the shared vocabulary (frameStyles.js /
            `.gw-frame__art--*`) — all 11 recipes used once, no two alike
     ar     the piece's shape, so the hang mixes portraits, landscapes,
            squares and ovals like a wall collected over years
     img    the PHOTOGRAPH inside it (public/images/wall/ — the shop's own
            pictures, the same ones the Gallery Wall concept hangs).
            Swap a file there and the phone wall re-hangs itself.
     Motif  fallback line drawing for the one piece with no photograph
            (Visit Us hangs as a little painted address sign) and for any
            photo that fails to load. */
const FRAME_LINKS = [
  { label: 'Menu', to: '/menu', x: 18.4, y: 9.0, w: 19.9, h: 17.1, piece: { frame: 'gilt-grand', ar: '4 / 5', img: 'images/wall/order-menu.jpg', Motif: CoffeeCup } },
  { label: 'About Us', to: '/about', x: 39.7, y: 6.6, w: 17.6, h: 17.8, piece: { frame: 'brass-chain', ar: '4 / 3', img: 'images/wall/our-story.jpg', Motif: FoxFace } },
  { label: 'Events', to: '/events', x: 59.2, y: 5.9, w: 10.0, h: 19.3, round: true, piece: { frame: 'oval-black', ar: '1 / 1.1', img: 'images/wall/whats-on.jpg', Motif: Balloon } },
  { label: 'Gallery Wall', to: '/gallery-wall', x: 20.7, y: 30.3, w: 16.4, h: 33.7, piece: { frame: 'gold-tapestry', ar: '3 / 4', img: 'images/wall/gallery-wall.jpg', Motif: FramedScene } },
  { label: 'Local Love', to: '/neighborhood', x: 39.3, y: 33.7, w: 7.0, h: 16.3, piece: { frame: 'gold-botanical', ar: '7 / 5', img: 'images/wall/local-love.jpg', Motif: Heart } },
  { label: 'Troublemakers', to: '/troublemakers', x: 54.6, y: 27.6, w: 7.3, h: 14.4, piece: { frame: 'black-stacked', ar: '1 / 1', img: 'images/wall/troublemakers.jpg', Motif: TopHat } },
  { label: 'Reviews', to: '/reviews', x: 70.3, y: 20.8, w: 9.0, h: 13.6, piece: { frame: 'oval-gilt', ar: '1 / 1', img: 'images/wall/reviews.jpg', Motif: Star } },
  { label: 'Community', to: '/community', x: 39.7, y: 54.4, w: 10.7, h: 17.9, piece: { frame: 'black-mat', ar: '4 / 3.4', img: 'images/wall/flank-coffee.jpg', Motif: Bunting } },
  { label: 'Visit Us', to: '/location', x: 52.1, y: 57.8, w: 6.0, h: 13.0, piece: { frame: 'black-flat', ar: '4 / 3', tint: 'chalk', Motif: MapPin } },
  { label: 'Our Story', to: '/timeline', x: 65.4, y: 45.1, w: 10.2, h: 25.0, piece: { frame: 'bronze-carved', ar: '7 / 5', img: 'images/wall/our-story-so-far.jpg', Motif: OpenBook } },
  { label: 'Contact', to: '/contact', x: 77.9, y: 50.8, w: 4.2, h: 14.0, piece: { frame: 'gilt-thin', ar: '3 / 4', img: 'images/wall/flank-food.jpg', Motif: Envelope } },
];

/* The two gold sculptures from the real wall, hung among the pictures. Each
   is keyed to the piece it hangs UNDER, so the masonry carries them into
   different columns instead of stacking them in whichever column has room —
   which is exactly how they sit on the real wall, tucked between frames. */
const WALL_OBJECTS = [
  { after: 3, mod: 'fox', src: 'images/brand/fox-head.webp' },
  { after: 7, mod: 'hare', src: 'images/brand/rabbit-head.webp' },
];

const box = ({ x, y, w, h }) => ({ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });

/* alternating hand-hung tilts for the phone wall */
const MINI_TILTS = [-1.2, 0.9, -0.7, 1.3, -1.0, 0.8];

function KnowForm({ idSuffix, action }) {
  return (
    <form
      className="ig2-know"
      action={action}
      method="post"
      target="_blank"
      onSubmit={() => track('newsletter_signup', { location: 'immersive-hero' })}
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

/* One piece on the phone wall: a real photograph in a real vintage molding,
   hung flush on the paint and knocked a degree off true. The molding, the
   engraved brass nameplate and the hover sweep are the SHARED `.gw-frame__*`
   recipes — the same ones the desktop Gallery Wall hangs — so the phone wall
   is the same wall, not a phone-shaped imitation of it. If a photograph is
   missing (or fails), the piece falls back to a painted board with the
   destination's gold line drawing, which is a legitimate small wall piece
   rather than a hole in the hang. */
function WallPiece({ link, index }) {
  const { frame, ar, tint, img, Motif } = link.piece;
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(img) && !failed;

  return (
    <Link
      className="ig2-mini"
      to={link.to}
      style={{ '--tilt': `${MINI_TILTS[index % MINI_TILTS.length]}deg` }}
    >
      {/* inner hanger so the entrance tween never fights the resting tilt */}
      <span className="ig2-mini__hang">
        <span
          className={`gw-frame__art ig2-mini__frame gw-frame__art--${frame}${
            tint ? ` ig2-mini__frame--${tint}` : ''
          }${showPhoto ? '' : ' ig2-mini__frame--drawn'}`}
          style={{ '--ar': ar }}
        >
          {showPhoto ? (
            <img
              className="gw-frame__img"
              src={asset(img)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            <span className="ig2-mini__drawn" aria-hidden="true">
              <Motif className="ig2-mini__motif" size={44} />
            </span>
          )}
          <span className="gw-frame__plaque">{link.label}</span>
        </span>
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
    specials_link: specialsLink = '/menu#specials',
  } = data;

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
    // One settled entrance, then everything holds perfectly still — fades
    // only, so nothing ever drifts off its painted anchor.
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
        // One-time choreography, then everything holds still (no ambient sway):
        // the room settles in from a gentle zoom (image + overlays as one, so
        // nothing drifts off its frame), the logo drops onto the wall, the
        // brass plates pop on across the hang, and the counter signs land last.
        tl.fromTo(
          '.ig2-stage',
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
          .from('.ig2-frame__label', {
            autoAlpha: 0, y: 14, scale: 0.7, transformOrigin: '50% 100%',
            duration: 0.5, ease: 'back.out(1.7)',
            stagger: { each: 0.05, from: 'random' },
            clearProps: 'transform,opacity,visibility',
          }, '-=0.25')
          // the props settle onto the counter (both the scene's copies and the
          // phone's — whichever the breakpoint is showing)
          .from('.ig2-chalk, .ig2-note, .ig2-know', {
            autoAlpha: 0, y: 18, duration: 0.55, ease: 'back.out(1.4)', stagger: 0.12,
            clearProps: 'transform,opacity,visibility',
          }, '-=0.3')
          // phone wall: the pictures settle onto the paint one after the other,
          // then the gold sculptures take their hooks (no-ops ≥1020px, where
          // the whole .ig2-mobile block is display:none)
          .from('.ig2-mini__hang', {
            autoAlpha: 0, y: 20, scale: 0.92, transformOrigin: '50% 0%',
            duration: 0.5, ease: 'back.out(1.5)',
            stagger: { each: 0.05, from: 'start' },
            clearProps: 'transform,opacity,visibility',
          }, '-=0.35')
          .from('.ig2-mobile__object', {
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

  const brand = (
    <div className="ig2-brand">
      <p className="ig2-brand__eyebrow"><span aria-hidden="true">—❧</span> {eyebrow} <span aria-hidden="true">❧—</span></p>
      {/* the real brand lockup, remastered cream so it reads as painted-on-the-
          wall signage (fox + wordmark + Haddon Heights ribbon) */}
      <h1 className="ig2-brand__logo">
        <img src={asset('images/brand/logo-fox-cream.png')} alt={heading} />
      </h1>
      <p className="ig2-brand__descriptor"><span aria-hidden="true">◆</span> {descriptor} <span aria-hidden="true">◆</span></p>
    </div>
  );

  // the chalkboard address breaks on '·' so it letters like a painted sign
  const addressLines = addressLine ? addressLine.split('·').map((s) => s.trim()).filter(Boolean) : [];
  const chalk = (
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
          onClick={() => track('directions_click', { location: 'immersive-hero' })}
        >
          {addressLines.map((l) => <span key={l}>{l}</span>)}
        </a>
      )}
    </div>
  );

  const note = specialText ? (
    <Link
      className="ig2-note"
      to={specialsLink || '/menu'}
      onClick={() => track('specials_click', { location: 'immersive-hero' })}
    >
      <p className="ig2-note__title">{specialsLabel}</p>
      <p className="ig2-note__special">{specialText}</p>
      <span className="ig2-note__cta">{menuLabel} <b aria-hidden="true">→</b></span>
    </Link>
  ) : null;

  return (
    <section className="ig2-hero" ref={root}>
      {/* ---- the scene: full art ≥820px, backdrop banner below ---- */}
      <div className="ig2-scene">
        <div className="ig2-stage">
          {/* the page's LCP element on every screen size — never lazy, and
              flagged high so it isn't queued behind the wall's photographs */}
          <img
            className="ig2-scene__img"
            src={asset(SCENE)}
            alt="The Trouble Brewing gallery wall over the coffee counter"
            fetchpriority="high"
            decoding="async"
          />

          {brand}

          <nav className="ig2-links" aria-label="Explore Trouble Brewing">
            {FRAME_LINKS.map((f) => (
              <Link
                key={f.to}
                className={`ig2-frame${f.round ? ' ig2-frame--round' : ''}`}
                to={f.to}
                style={box(f)}
              >
                <span className="ig2-frame__label">{f.label}&nbsp;<b aria-hidden="true">→</b></span>
              </Link>
            ))}
            {/* the artwork's own painted menu board gets a silent hotspot */}
            <Link className="ig2-frame" to="/menu" style={box({ x: 80.3, y: 33.0, w: 5.1, h: 11.1 })} aria-label="Menu — coffee, pastries, sandwiches" />
          </nav>

          {chalk}
          {note}

          {mailchimpUrl && <KnowForm idSuffix="scene" action={mailchimpUrl} />}
        </div>
      </div>

      {/* ---- under 1020px the wall re-hangs itself as a real salon hang:
              every destination is an actual PHOTOGRAPH from the shop in its
              own vintage molding, with the same engraved
              brass nameplate the desktop wall uses ---- */}
      <div className="ig2-mobile">
        {/* the counter, brought down off the scene: today's hours and the
            taped special sit ABOVE the wall on phones, so the two things a
            thumb actually came for are the first things under the banner */}
        <div className="ig2-mobile__counter">
          {chalk}
          {note}
        </div>

        {/* A CSS multi-column masonry, not a grid of equal cells: pieces of
            different shapes nest under each other and the browser balances the
            column heights itself, so the hang stays composed at every width and
            simply gains a column on a tablet. Column-major fill means the
            visual order and the tab order are the same order. */}
        <nav className="ig2-wall" aria-label="Explore Trouble Brewing">
          {FRAME_LINKS.map((link, i) => {
            const object = WALL_OBJECTS.find((o) => o.after === i);
            return (
              <Fragment key={link.to}>
                <WallPiece link={link} index={i} />
                {object && (
                  <img
                    className={`ig2-mobile__object ig2-mobile__object--${object.mod}`}
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

        {/* The wall closes on the one thing a phone visitor most often wants:
            ordering. It hangs as the widest piece on the wall — a brass sign
            over both columns — so the hang finishes on a straight bottom edge
            instead of two ragged columns, and the primary conversion is never
            more than a scroll away on the screen most people arrive on. */}
        <div className="ig2-wall__closer">
          <OrderButton className="btn btn--accent ig2-mobile__order" location="immersive-hero-mobile" />
          <p className="ig2-wall__closer-note">Order ahead on SpotOn — we&rsquo;ll have it ready.</p>
        </div>

        {mailchimpUrl && <KnowForm idSuffix="mobile" action={mailchimpUrl} />}
      </div>
    </section>
  );
}
