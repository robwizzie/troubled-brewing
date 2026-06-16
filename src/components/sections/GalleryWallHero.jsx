import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import BrandImg from '../BrandImg.jsx';
import { FoxEmblem, Flourish } from '../Motifs.jsx';
import { BRAND } from '../../lib/config.js';

/* THE signature landing concept: the in-shop Gallery Wall recreated as an
   eclectic salon hang on the sage-green wall. Each frame is a legible "poster"
   (its label in display serif) until the owner adds a photo, then it shows the
   photo with a label ribbon. The real brass fox-head sculpture and a hare are
   tucked among the frames. Masonry columns keep it readable on every screen.
   See docs/DESIGN.md. */

const ASPECTS = ['3 / 4', '4 / 3', '1 / 1', '3 / 4', '4 / 5', '4 / 3', '1 / 1', '5 / 4', '3 / 4', '4 / 3'];
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 2, -3.5, 1.5, -2, 3];
const TINTS = ['var(--color-paper)', 'var(--color-pink-soft)', 'var(--color-yellow-soft)', 'var(--color-green-soft)', '#efe7d3'];
const GLYPHS = { ornate: '☕', 'oval-gold': '🥐', black: '✦', wood: '❀', green: '🌿', pink: '✿', gold: '✶' };

export default function GalleryWallHero({ data = {} }) {
  const {
    heading = 'Welcome to Trouble Brewing',
    subheading = 'A whole wall of reasons to stop in.',
    frames = [],
  } = data;

  // Tuck the gold fox-head sculpture in among the frames, like the real wall.
  const objects = { 2: 'fox' };

  const tiles = [];
  frames.forEach((f, i) => {
    if (objects[i]) tiles.push({ object: objects[i], tilt: TILTS[(i + 1) % TILTS.length], key: `obj-${i}` });
    tiles.push({
      frame: f, i, key: `f-${i}`,
      ar: ASPECTS[i % ASPECTS.length],
      tilt: TILTS[i % TILTS.length],
      tint: TINTS[i % TINTS.length],
    });
  });

  return (
    <section className="gw-hero">
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

        <div className="gw-wall">
          {tiles.map((t) =>
            t.object ? (
              <div key={t.key} className="gw-tile gw-tile--object gw-tile--fox" aria-hidden="true">
                <BrandImg src={BRAND.foxHead} alt="" loading="lazy" className="gw-object-img" fallback={<FoxEmblem size={104} />} />
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

function FrameTile({ frame, ar, tilt, tint, i }) {
  const style = frame.frame_style || 'gold';
  const isInternal = frame.link && frame.link.startsWith('/');
  const tileStyle = { '--tilt': `${tilt}deg`, '--ar': ar, '--tint': tint };
  const art = (
    <span className={`gw-frame__art gw-frame__art--${style}`}>
      {frame.image_url ? (
        <>
          <img className="gw-frame__img" src={frame.image_url} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
          <span className="gw-frame__ribbon">{frame.label}</span>
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
    <div className="gw-tile" style={tileStyle}>
      {isInternal ? (
        <Link to={frame.link} className="gw-frame" aria-label={frame.label}>{art}</Link>
      ) : (
        <a href={frame.link || '#'} className="gw-frame" aria-label={frame.label} target={frame.link ? '_blank' : undefined} rel="noopener noreferrer">{art}</a>
      )}
    </div>
  );
}
