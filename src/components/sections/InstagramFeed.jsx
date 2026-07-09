import { useState } from 'react';
import Reveal from '../Reveal.jsx';
import { asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';

/* Instagram teaser. A true embedded feed needs Instagram's API + a token
   broker (out of scope for a static v1), so instead: a strip of real shop
   photos styled as taped-down polaroids, every one a link to the profile.
   Zero maintenance, no tokens, still feels like a feed. Photos reuse the
   gallery-wall set already shipped in public/images/wall/. */

const SNAPS = [
  { src: 'images/wall/troublemakers.jpg', caption: 'the pour' },
  { src: 'images/wall/whats-on.jpg', caption: 'dunk o’clock' },
  { src: 'images/wall/local-love.jpg', caption: 'cheers, neighbors' },
  { src: 'images/wall/our-story-so-far.jpg', caption: 'the room' },
];
const TILTS = ['-3deg', '2deg', '-1.5deg', '2.6deg'];

function Snap({ snap, tilt, href, onClick }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null; // a missing photo just leaves a smaller strip
  return (
    <a className="ig-snap" style={{ '--r': tilt }} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label={`See our Instagram — ${snap.caption}`}>
      <span className="ig-snap__photo">
        <img src={asset(snap.src)} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
      <span className="ig-snap__caption" aria-hidden="true">{snap.caption}</span>
    </a>
  );
}

export default function InstagramFeed({ data = {} }) {
  const handle = data.embed_handle || 'troublebrewingcoffee';
  const href = `https://instagram.com/${handle}`;
  const onClick = () => track('outbound_click', { dest: 'instagram' });
  return (
    <Reveal as="section" className="section section--alt">
      <div className="container" style={{ textAlign: 'center' }}>
        <p className="eyebrow">@{handle}</p>
        <h2>Follow the Trouble</h2>
        <p style={{ maxWidth: '46ch', margin: '0 auto', color: 'var(--color-text-soft)' }}>
          Latte art, new drops, events, and the occasional dog behind the counter. Come say hi on Instagram.
        </p>
        <div className="ig-strip">
          {SNAPS.map((s, i) => (
            <Snap key={s.src} snap={s} tilt={TILTS[i % TILTS.length]} href={href} onClick={onClick} />
          ))}
        </div>
        <a className="btn btn--primary" href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
          See our Instagram
        </a>
      </div>
    </Reveal>
  );
}
