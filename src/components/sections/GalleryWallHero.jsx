import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import { FoxEmblem, Hare, Flourish } from '../Motifs.jsx';

/* THE signature landing concept. Recreates the in-shop Gallery Wall as a dense,
   eclectic "salon hang": mismatched frame sizes, oval and portrait and wide
   frames, slight rotations and overlaps, mounted on the sage-green wall under a
   pressed-tin moulding — with the brass fox + hare tucked in among the art, just
   like the real wall. Each frame is a product/feature that links somewhere.
   Deliberately NOT a uniform grid. See docs/DESIGN.md. */

// Mismatched footprints (col x row spans) cycled across frames for the salon look.
const FOOTPRINTS = [
  { c: 3, r: 4 }, // big portrait
  { c: 2, r: 2 }, // small square
  { c: 4, r: 3 }, // wide landscape
  { c: 2, r: 3 }, // tall
  { c: 3, r: 3 }, // medium (good for ovals)
  { c: 2, r: 2 }, // small
  { c: 3, r: 4 }, // big
  { c: 4, r: 2 }, // wide short
  { c: 2, r: 3 }, // tall
  { c: 3, r: 3 },
];
const TILTS = [-4, 3, -2, 4, -3, 2, -5, 3, -2, 5, -3, 2];
const TINTS = ['var(--color-paper)', 'var(--color-pink-soft)', 'var(--color-yellow-soft)', 'var(--color-green-soft)', '#efe7d3'];
const GLYPHS = { ornate: '☕', 'oval-gold': '🥐', black: '✦', wood: '❀', green: '🌿', pink: '✿', gold: '✶' };

export default function GalleryWallHero({ data = {} }) {
  const {
    heading = 'Welcome to Trouble Brewing',
    subheading = 'A whole wall of reasons to stop in.',
    frames = [],
  } = data;

  // Weave the brass objects into the wall at stable spots (like the shop).
  const objects = {
    2: { kind: 'fox', c: 2, r: 3 },
    5: { kind: 'hare', c: 2, r: 2 },
  };

  const tiles = [];
  frames.forEach((f, i) => {
    if (objects[i]) tiles.push({ object: objects[i], key: `obj-${i}` });
    const fp = FOOTPRINTS[i % FOOTPRINTS.length];
    tiles.push({ frame: f, fp, tilt: TILTS[i % TILTS.length], tint: TINTS[i % TINTS.length], i, key: `f-${i}` });
  });

  return (
    <section className="gw-hero">
      <div className="gw-hero__moulding" aria-hidden="true" />
      <div className="container gw-hero__inner">
        <div className="gw-hero__placard">
          <p className="eyebrow">Haddon Heights, NJ · La Colombe coffee</p>
          <h1>{heading}</h1>
          <Flourish className="gw-hero__flourish" width={240} color="var(--color-yellow)" />
          <p className="hero__sub">{subheading}</p>
          <p className="gw-hero__cta">
            <OrderButton label="Order Now" className="btn btn--accent btn--lg btn--wiggle" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/menu">See the menu</Link>
          </p>
        </div>

        <div className="gw-wall" role="list" aria-label="Explore Trouble Brewing">
          {tiles.map((t) =>
            t.object ? (
              <div
                key={t.key}
                className={`gw-object gw-object--${t.object.kind}`}
                style={{ gridColumn: `span ${t.object.c}`, gridRow: `span ${t.object.r}` }}
                aria-hidden="true"
              >
                {t.object.kind === 'fox' ? <FoxEmblem size={92} /> : <Hare size={72} />}
              </div>
            ) : (
              <FrameTile key={t.key} {...t} />
            )
          )}
        </div>
      </div>
      <div className="gw-hero__rail" aria-hidden="true" />
    </section>
  );
}

function FrameTile({ frame, fp, tilt, tint, i }) {
  const style = frame.frame_style || 'gold';
  const isInternal = frame.link && frame.link.startsWith('/');
  const css = {
    gridColumn: `span ${fp.c}`,
    gridRow: `span ${fp.r}`,
    '--tilt': `${tilt}deg`,
    '--tint': tint,
    '--i': i,
  };
  const inner = (
    <>
      <span className={`gw-frame__art gw-frame__art--${style}`}>
        {frame.image_url ? (
          <img src={frame.image_url} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
        ) : (
          <span className="gw-frame__glyph" aria-hidden="true">{GLYPHS[style] || '✶'}</span>
        )}
      </span>
      <span className="gw-frame__plate">{frame.label}</span>
    </>
  );
  const className = `gw-frame gw-frame--${style}`;
  return isInternal ? (
    <Link to={frame.link} className={className} role="listitem" style={css}>{inner}</Link>
  ) : (
    <a href={frame.link || '#'} className={className} role="listitem" style={css} target={frame.link ? '_blank' : undefined} rel="noopener noreferrer">{inner}</a>
  );
}
