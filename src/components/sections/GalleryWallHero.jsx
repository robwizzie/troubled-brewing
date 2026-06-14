import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';

/* THE signature landing concept (lead / client favorite).
   Recreates the in-shop Gallery Wall as the hero — a dense arrangement of
   mismatched vintage frames where each frame is a PRODUCT/FEATURE that links
   somewhere. Frames tilt gently and "settle" on load (CSS in sections.css,
   reduced-motion respected via tokens.css). See docs/DESIGN.md. */
export default function GalleryWallHero({ data = {} }) {
  const {
    heading = 'Welcome to Trouble Brewing',
    subheading = 'A whole wall of reasons to stop in.',
    frames = [],
  } = data;

  return (
    <section className="gw-hero">
      <div className="container">
        <div className="gw-hero__intro">
          <p className="eyebrow">Haddon Heights, NJ · La Colombe coffee</p>
          <h1>{heading}</h1>
          <p className="hero__sub">{subheading}</p>
          <p className="gw-hero__cta">
            <OrderButton label="Order Now" className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/menu">See the menu</Link>
          </p>
        </div>

        <div className="gw-wall" role="list">
          {frames.map((f, i) => {
            const style = f.frame_style || 'gold';
            const isInternal = f.link && f.link.startsWith('/');
            const inner = (
              <>
                <span className={`gw-frame__art gw-frame__art--${style}`}>
                  {f.image_url ? (
                    <img src={f.image_url} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
                  ) : (
                    <span className="gw-frame__placeholder" aria-hidden="true">{frameGlyph(style)}</span>
                  )}
                </span>
                <span className="gw-frame__label">{f.label}</span>
              </>
            );
            const className = `gw-frame gw-frame--${style}`;
            return isInternal ? (
              <Link key={i} to={f.link} className={className} role="listitem" style={tiltFor(i)}>
                {inner}
              </Link>
            ) : (
              <a key={i} href={f.link || '#'} className={className} role="listitem" style={tiltFor(i)} target={f.link ? '_blank' : undefined} rel="noopener noreferrer">
                {inner}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Deterministic small tilt per frame so the wall feels hand-hung, not gridded.
function tiltFor(i) {
  const tilts = [-3, 2, -1.5, 3, -2.5, 1.5, -2, 2.5];
  return { '--tilt': `${tilts[i % tilts.length]}deg` };
}

function frameGlyph(style) {
  switch (style) {
    case 'ornate': return '☕';
    case 'oval-gold': return '🥐';
    case 'black': return '✦';
    case 'wood': return '❀';
    default: return '✶';
  }
}
