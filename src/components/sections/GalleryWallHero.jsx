import { useState } from 'react';
import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import BrandImg from '../BrandImg.jsx';
import HoursToday from '../HoursToday.jsx';
import { FoxEmblem, Hare, Flourish, CoffeeCup, Beans } from '../Motifs.jsx';
import { BRAND, asset } from '../../lib/config.js';
import { normalizeFrameStyle } from '../../lib/frameStyles.js';
import { track } from '../../lib/analytics.js';
import { useGsapEntrance } from '../../lib/useGsapEntrance.js';

/* THE signature landing concept: the in-shop Gallery Wall recreated as an
   eclectic salon hang on the sage-green wall. Each frame is a legible "poster"
   (its label in display serif) until the owner adds a photo, then it shows the
   photo with a label ribbon. The real brass fox-head sculpture and a hare are
   tucked among the frames. Masonry columns keep it readable on every screen.
   See docs/DESIGN.md. */

/* Mixed shapes + sizes so the hang feels collected-over-time, like the real
   shop wall: tall portraits, wide landscapes, squares, and slightly smaller
   pieces. SIZES stay ≥88% — dipping lower leaves green pockets in the
   masonry columns instead of "breathing room". */
const ASPECTS = ['4 / 5', '1 / 1', '5 / 6', '3 / 4', '4 / 3', '1 / 1', '7 / 5', '5 / 4', '4 / 5', '5 / 4'];
const TILTS = [-4, 3, -2, 4.5, -3, 2.5, -4.5, 2, -2.5, 3.5];
const SIZES = ['100%', '94%', '100%', '88%', '92%', '100%', '100%', '94%', '92%', '88%'];
/* mats are white/cream like the real wall — warm paper neutrals, never a color */
const TINTS = ['var(--color-paper)', '#f6efdd', '#efe7d3', '#fbf7ec', '#f3ecdb'];
const GLYPHS = {
  'gilt-grand': '☕', 'gilt-thin': '✶', 'gold-botanical': '❀', 'gold-tapestry': '❖',
  'bronze-carved': '❦', 'brass-chain': '✦', 'black-flat': '✧', 'black-mat': '❈',
  'black-stacked': '✧', 'oval-gilt': '🦋', 'oval-black': '✦',
};

/* Gold sculptures tucked among the frames like the real wall — the fox-head and
   the rabbit-head. Each shows the owner's asset once it's dropped into BRAND,
   with a graceful motif fallback until then. `before` = the frame index the
   object is slotted in front of, so they distribute across the masonry. */
const WALL_OBJECTS = [
  { before: 2, mod: 'fox', src: BRAND.foxHead, fallback: <FoxEmblem size={104} /> },
  { before: 4, mod: 'rabbit', src: BRAND.rabbitHead, fallback: <Hare size={104} /> },
];

/* The entrance: the museum sign drops in and settles onto its nail, its lettering
   cascades, the flanking pieces fade up, then the wall gets "hung" — each framed
   piece drops and settles into place with a little overshoot, scattered across
   the salon like the collection came together over time. Module-level so the
   reference is stable (the hook re-runs only on real change, never per render).
   `.from()` tweens on the tiles clearProps at the end, handing the resting tilt +
   hover back to CSS. Gated + lazy-loaded by useGsapEntrance (reduced-motion safe). */
function buildHeroTimeline(gsap) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.gw-hero__placard', { autoAlpha: 0, y: -30, scale: 0.94, rotate: -3, duration: 0.7, ease: 'back.out(1.4)' })
    .from(
      ['.gw-hero__eyebrow', '.gw-hero__placard h1', '.gw-hero__flourish', '.gw-hero__placard .hero__sub', '.gw-hero__cta', '.gw-hero__meta'],
      { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.08 },
      '-=0.35'
    )
    .from('.gw-hero__flank', { autoAlpha: 0, duration: 0.5, stagger: 0.12 }, '-=0.3')
    .from(
      '.gw-tile',
      {
        autoAlpha: 0,
        y: 40,
        scale: 0.86,
        transformOrigin: '50% 0%',
        duration: 0.55,
        ease: 'back.out(1.5)',
        stagger: { each: 0.045, from: 'random' },
        // Clear ONLY what GSAP animated so the resting tilt + hover transitions go
        // back to CSS. NB: never 'all' here — that wipes the inline --tilt/--ar/--w/
        // --tint the tiles rely on for their varied, collected-over-time hang.
        clearProps: 'transform,transformOrigin,opacity,visibility',
      },
      '-=0.15'
    );
  return tl;
}

export default function GalleryWallHero({ data = {} }) {
  const scope = useGsapEntrance(buildHeroTimeline);
  const {
    heading = 'Welcome to Trouble Brewing',
    subheading = 'A whole wall of reasons to stop in.',
    specials_label: specialsLabel = 'Current Drink Specials',
    specials_link: specialsLink = '/menu#specials',
    frames = [],
  } = data;

  // Tuck the gold sculptures (fox, rabbit) in among the frames, like the real
  // wall. A `before` beyond the last frame appends the object at the very end.
  const objectsBefore = {};
  WALL_OBJECTS.forEach((o) => { (objectsBefore[Math.min(o.before, frames.length)] ||= []).push(o); });

  const pushObjects = (i) =>
    (objectsBefore[i] || []).forEach((o, k) => {
      tiles.push({ object: o, tilt: TILTS[(i + 1 + k) % TILTS.length], key: `obj-${i}-${k}` });
    });

  const tiles = [];
  frames.forEach((f, i) => {
    pushObjects(i);
    tiles.push({
      frame: f, i, key: `f-${i}`,
      ar: ASPECTS[i % ASPECTS.length],
      tilt: TILTS[i % TILTS.length],
      size: SIZES[i % SIZES.length],
      tint: TINTS[i % TINTS.length],
    });
  });
  pushObjects(frames.length); // trailing sculptures (e.g. the rabbit) close out the wall

  return (
    <section className="gw-hero gw-hero--gsap" ref={scope}>
      <div className="container gw-hero__inner">
        <div className="gw-hero__masthead">
          {/* small framed photos hung either side of the sign — they fill the
              desktop margins so the centerpiece reads as a curated cluster, like
              the real wall. Purely decorative (no label, not clickable). */}
          <span className="gw-hero__flank gw-hero__flank--l" aria-hidden="true">
            <span className="gw-frame__art gw-frame__art--gilt-thin gw-hero__flank-art">
              <BrandImg src={asset('images/wall/flank-coffee.jpg')} alt="" loading="lazy" className="gw-frame__img" fallback={<CoffeeCup size={56} color="var(--color-green-deep)" steam={false} />} />
            </span>
          </span>

        <div className="gw-hero__placard">
          <p className="gw-hero__eyebrow">
            <span className="gw-hero__star" aria-hidden="true">✦</span>
            Haddon Heights, NJ · Coffee &amp; Kitchen
            <span className="gw-hero__star" aria-hidden="true">✦</span>
          </p>
          <h1>{heading}</h1>
          <Flourish className="gw-hero__flourish" width={240} color="var(--color-yellow)" />
          <p className="hero__sub">{subheading}</p>
          <p className="gw-hero__cta">
            <OrderButton label="Order Now" className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/menu">See the menu</Link>
          </p>

          {/* the sign's small print: live open/closed status + the way to
              today's specials — like the hours lettered under a shop sign */}
          <div className="gw-hero__meta">
            <HoursToday />
            {specialsLink && specialsLabel && (
              <>
                <span className="gw-hero__meta-star" aria-hidden="true">✦</span>
                {specialsLink.startsWith('/') ? (
                  <Link className="gw-hero__specials" to={specialsLink} onClick={() => track('specials_click', { location: 'hero' })}>
                    {specialsLabel}
                  </Link>
                ) : (
                  <a className="gw-hero__specials" href={specialsLink} target="_blank" rel="noopener noreferrer" onClick={() => track('specials_click', { location: 'hero' })}>
                    {specialsLabel}
                  </a>
                )}
              </>
            )}
          </div>
        </div>

          <span className="gw-hero__flank gw-hero__flank--r" aria-hidden="true">
            <span className="gw-frame__art gw-frame__art--black-mat gw-hero__flank-art">
              <BrandImg src={asset('images/wall/flank-food.jpg')} alt="" loading="lazy" className="gw-frame__img" fallback={<Beans size={52} color="var(--color-green-deep)" />} />
            </span>
          </span>
        </div>

        <div className="gw-wall">
          {tiles.map((t) =>
            t.object ? (
              <div key={t.key} className={`gw-tile gw-tile--object gw-tile--${t.object.mod}`} aria-hidden="true">
                <BrandImg src={t.object.src} alt="" loading="lazy" className="gw-object-img" fallback={t.object.fallback} />
              </div>
            ) : (
              <FrameTile key={t.key} {...t} />
            )
          )}
        </div>
      </div>
    </section>
  );
}

function FrameTile({ frame, ar, tilt, size, tint, i }) {
  // Show the photo once it exists; until the file is added (or if it fails to
  // load) fall back to the legible "poster" so the wall never shows a broken img.
  const [imgFailed, setImgFailed] = useState(false);
  const style = normalizeFrameStyle(frame.frame_style);
  const showImg = frame.image_url && !imgFailed;
  // absolute URLs (admin uploads, seeds run through asset()) pass untouched;
  // bare repo paths from the DB get the deploy base prefixed
  const imgSrc = showImg && (/^(https?:)?\/\//i.test(frame.image_url) || frame.image_url.startsWith('/')
    ? frame.image_url
    : asset(frame.image_url));
  const isInternal = frame.link && frame.link.startsWith('/');
  const tileStyle = { '--tilt': `${tilt}deg`, '--ar': ar, '--w': size, '--tint': tint };
  const art = (
    <span className={`gw-frame__art gw-frame__art--${style}`}>
      {showImg ? (
        <>
          <img className="gw-frame__img" src={imgSrc} alt="" loading={i < 3 ? 'eager' : 'lazy'} onError={() => setImgFailed(true)} />
          <span className="gw-frame__plaque">{frame.label}</span>
        </>
      ) : (
        <span className="gw-frame__poster">
          <span className="gw-frame__glyph" aria-hidden="true">{GLYPHS[style] || '✶'}</span>
          <span className="gw-frame__poster-label">{frame.label}</span>
        </span>
      )}
    </span>
  );
  return (
    /* gw-tile--fs-* lets a style dress the TILE too — the chain + nail and the
       layered second frame have to live outside the art's overflow clip */
    <div className={`gw-tile gw-tile--fs-${style}`} style={tileStyle}>
      {isInternal ? (
        <Link to={frame.link} className="gw-frame" aria-label={frame.label}>{art}</Link>
      ) : (
        <a href={frame.link || '#'} className="gw-frame" aria-label={frame.label} target={frame.link ? '_blank' : undefined} rel="noopener noreferrer">{art}</a>
      )}
    </div>
  );
}
