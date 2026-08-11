import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import HoursToday from '../HoursToday.jsx';
import { asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';
import { TopHat, Star, Bunting, OpenBook, Envelope } from '../Motifs.jsx';

/* "Immersive Gallery" landing concept — the unbranded café scene artwork is
   the canvas (public/images/wall/immersive-scene.jpg, 1536×1024), and every
   piece of branding is live HTML laid over it: the welcome lettering on the
   dappled wall, hand-placed labels on the frames (each one a link mirroring
   the navbar), a chalkboard with the real live hours, the taped specials
   note, and the Stay-in-the-Know signup. Overlay geometry is % of the scene
   and type is sized in cqw, so everything scales as one piece of art.
   Under 1020px the wall RE-HANGS ITSELF for phones: the scene becomes a
   backdrop banner, and every destination becomes a little FRAMED SIGN hung
   from a nail and wire — a distinct vintage molding (the Gallery Wall frame
   vocabulary, no two alike), a tinted sign board, a gold line-drawn
   pictogram, and painted lettering. All vector + CSS, so the phone wall is
   pin-sharp and shares one material language with the chalkboard, the taped
   note, and the gold fox. No HTML top bar: the site nav is the navbar. */

const SCENE = 'images/wall/immersive-scene.jpg';

/* Frame hotspots: % boxes of the 1536×1024 artwork. Every destination in the
   navbar (primary + More) hangs somewhere on the wall. Boxes are tuned to hug
   each frame's molding — the label renders as a brass nameplate centered on
   the frame's bottom edge, so box centers/bottoms must be exact.
   `sign` is the destination's PHONE incarnation: the SIX headline pages hang
   as photos set INSIDE real painted frames cropped from this same artwork
   (public/images/wall/frames/* — the identical moldings desktop visitors
   see), each with an engraved brass nameplate; the rest become small brass
   chips under the wall (`chip: true`) so the phone hero stays SHORT.
   `frame` = the molding crop, `par` = its true aspect, `inset` = the photo
   opening inside the crop (top right bottom left), `pos` = object-position. */
const FRAME_LINKS = [
  { label: 'Menu', to: '/menu', x: 18.4, y: 9.0, w: 19.9, h: 17.1, sign: { frame: 'gold-portrait', par: '241 / 339', inset: '4.8% 5.4% 7.5% 6.6%', photo: 'images/wall/order-menu.jpg', pos: '50% 42%' } },
  { label: 'About Us', to: '/about', x: 39.7, y: 6.6, w: 17.6, h: 17.8, sign: { frame: 'gold-landscape', par: '261 / 177', inset: '8.5% 6% 11.5% 6%', photo: 'images/wall/our-story.jpg', pos: '50% 58%' } },
  { label: 'Events', to: '/events', x: 59.2, y: 5.9, w: 10.0, h: 19.3, round: true, sign: { frame: 'oval-gilt', par: '147 / 194', inset: '8.5% 11% 8.5% 11%', oval: true, photo: 'images/wall/whats-on.jpg', pos: '50% 42%' } },
  { label: 'Gallery Wall', to: '/gallery-wall', x: 20.7, y: 30.3, w: 16.4, h: 33.7, sign: { frame: 'gold-patterned', par: '149 / 251', inset: '4.6% 8% 5.8% 8%', photo: 'images/wall/gallery-wall.jpg', pos: '50% 32%' } },
  { label: 'Local Love', to: '/neighborhood', x: 39.3, y: 33.7, w: 7.0, h: 16.3, sign: { frame: 'black-mat', par: '298 / 171', inset: '15.5% 9.6% 17.5% 9.6%', photo: 'images/wall/local-love.jpg', pos: '50% 45%' } },
  { label: 'Troublemakers', to: '/troublemakers', x: 54.6, y: 27.6, w: 7.3, h: 14.4, chip: true, sign: { Motif: TopHat } },
  { label: 'Reviews', to: '/reviews', x: 70.3, y: 20.8, w: 9.0, h: 13.6, chip: true, sign: { Motif: Star } },
  { label: 'Community', to: '/community', x: 39.7, y: 54.4, w: 10.7, h: 17.9, chip: true, sign: { Motif: Bunting } },
  { label: 'Visit Us', to: '/location', x: 52.1, y: 57.8, w: 6.0, h: 13.0, sign: { frame: 'black-small', par: '108 / 144', inset: '6.5% 8% 7% 8%', photo: 'images/wall/our-story-so-far.jpg', pos: '42% 55%' } },
  { label: 'Our Story', to: '/timeline', x: 65.4, y: 45.1, w: 10.2, h: 25.0, chip: true, sign: { Motif: OpenBook } },
  { label: 'Contact', to: '/contact', x: 77.9, y: 50.8, w: 4.2, h: 14.0, chip: true, sign: { Motif: Envelope } },
];
const WALL_LINKS = FRAME_LINKS.filter((f) => !f.chip);
const CHIP_LINKS = FRAME_LINKS.filter((f) => f.chip);

/* 'top right bottom left' opening → explicit absolute box for the photo */
function opening(inset) {
  const [t, r, b, l] = inset.split(/\s+/).map(parseFloat);
  return { top: `${t}%`, left: `${l}%`, width: `${(100 - l - r).toFixed(2)}%`, height: `${(100 - t - b).toFixed(2)}%` };
}

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
          // phone wall: the snapshots settle onto the wall one after the
          // other, then the fox takes its perch (display:none no-ops ≥1020px)
          .from('.ig2-shot__hang', {
            autoAlpha: 0, y: 20, scale: 0.94, transformOrigin: '50% 20%',
            duration: 0.5, ease: 'back.out(1.5)',
            stagger: { each: 0.055, from: 'start' },
            clearProps: 'transform,opacity,visibility',
          }, '-=0.35')
          .from('.ig2-mobile__fox', {
            autoAlpha: 0, y: 14, rotation: -8, transformOrigin: '50% 100%',
            duration: 0.5, ease: 'back.out(2)',
            clearProps: 'transform,opacity,visibility',
          }, '-=0.3')
          .from('.ig2-chip', {
            autoAlpha: 0, y: 8, duration: 0.35, stagger: 0.05,
            clearProps: 'transform,opacity,visibility',
          }, '-=0.3')
          .from('.ig2-chalk, .ig2-note, .ig2-know', {
            autoAlpha: 0, y: 18, duration: 0.55, ease: 'back.out(1.4)', stagger: 0.12,
            clearProps: 'transform,opacity,visibility',
          }, '-=0.35');
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
          <img
            className="ig2-scene__img"
            src={asset(SCENE)}
            alt="The Trouble Brewing gallery wall over the coffee counter"
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

      {/* ---- under 1020px the wall re-hangs itself: every destination is a
              framed SIGN — vintage molding, tinted board, gold pictogram,
              painted lettering — on a nail + wire. All vector, all crisp ---- */}
      <div className="ig2-mobile">
        <nav className="ig2-wall" aria-label="Explore Trouble Brewing">
          {WALL_LINKS.map((f, i) => {
            const { frame, par, inset, oval, photo, pos } = f.sign;
            return (
              <Link
                key={f.to}
                className="ig2-shot"
                to={f.to}
                style={{ '--r': `${MINI_TILTS[i % MINI_TILTS.length]}deg` }}
              >
                {/* inner hanger so the entrance tween never fights the tilt */}
                <span className="ig2-shot__hang">
                  <span
                    className={`ig2-fr${oval ? ' ig2-fr--oval' : ''}`}
                    style={{ '--par': par, backgroundImage: `url(${asset(`images/wall/frames/${frame}.jpg`)})` }}
                  >
                    <img
                      className="ig2-fr__photo"
                      src={asset(photo)}
                      alt=""
                      loading="lazy"
                      style={{ ...opening(inset), ...(pos ? { objectPosition: pos } : {}) }}
                    />
                    <span className="ig2-fr__plate">{f.label}&nbsp;<b aria-hidden="true">→</b></span>
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* everything else hangs as small engraved brass plates, the gold fox
            keeping watch above them */}
        <div className="ig2-more">
          <img
            className="ig2-mobile__fox"
            src={asset('images/brand/fox-head.webp')}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width="82"
            height="120"
          />
          <nav className="ig2-chips" aria-label="More at Trouble Brewing">
            {CHIP_LINKS.map((f) => {
              const { Motif } = f.sign;
              return (
                <Link key={f.to} className="ig2-chip" to={f.to}>
                  <Motif className="ig2-chip__motif" size={17} />
                  {f.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ig2-mobile__boards">
          {chalk}
          {note}
        </div>
        {mailchimpUrl && <KnowForm idSuffix="mobile" action={mailchimpUrl} />}
      </div>
    </section>
  );
}
