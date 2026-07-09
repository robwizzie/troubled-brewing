import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getInstagramFeed } from '../../lib/dataService.js';
import { asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';

/* Instagram strip: the shop's REAL last-4 posts, cached into Supabase by the
   `instagram-feed` edge function (see docs/INTEGRATIONS.md §Instagram), each
   rendered as a taped-down polaroid linking to its post. Until the cache has
   posts (or with no Supabase at all), the strip falls back to these static
   shop photos linking to the profile — so it always looks alive. Instagram's
   CDN image links expire; a post whose image dies simply leaves a smaller
   strip until the next 12h refresh. */

const SNAPS = [
  { src: 'images/wall/troublemakers.jpg', caption: 'the pour' },
  { src: 'images/wall/whats-on.jpg', caption: 'dunk o’clock' },
  { src: 'images/wall/local-love.jpg', caption: 'cheers, neighbors' },
  { src: 'images/wall/our-story-so-far.jpg', caption: 'the room' },
];
const TILTS = ['-3deg', '2deg', '-1.5deg', '2.6deg'];

const trunc = (s, n = 34) => {
  const t = String(s || '').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

function Snap({ image, caption, tilt, href, label, onClick }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null; // a dead image just leaves a smaller strip
  return (
    <a className="ig-snap" style={{ '--r': tilt }} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label={label}>
      <span className="ig-snap__photo">
        <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      </span>
      {caption && <span className="ig-snap__caption" aria-hidden="true">{caption}</span>}
    </a>
  );
}

export default function InstagramFeed({ data = {} }) {
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    let alive = true;
    getInstagramFeed().then((f) => alive && setFeed(f));
    return () => { alive = false; };
  }, []);

  const posts = (feed?.posts || []).slice(0, 4);
  const handle = feed?.handle || data.embed_handle || 'troublebrewingcoffee';
  const profileHref = `https://instagram.com/${handle}`;
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
          {posts.length >= 1
            ? posts.map((p, i) => (
                <Snap
                  key={p.id || i}
                  image={p.image}
                  caption={trunc(p.caption)}
                  tilt={TILTS[i % TILTS.length]}
                  href={p.permalink || profileHref}
                  label={`See this post on Instagram${p.caption ? ` — ${trunc(p.caption, 60)}` : ''}`}
                  onClick={onClick}
                />
              ))
            : SNAPS.map((s, i) => (
                <Snap
                  key={s.src}
                  image={asset(s.src)}
                  caption={s.caption}
                  tilt={TILTS[i % TILTS.length]}
                  href={profileHref}
                  label={`See our Instagram — ${s.caption}`}
                  onClick={onClick}
                />
              ))}
        </div>
        <a className="btn btn--primary" href={profileHref} target="_blank" rel="noopener noreferrer" onClick={onClick}>
          See our Instagram
        </a>
      </div>
    </Reveal>
  );
}
