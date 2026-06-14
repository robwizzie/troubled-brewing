import Reveal from '../Reveal.jsx';
import { track } from '../../lib/analytics.js';

/* Instagram "feed" teaser. A true embedded feed needs Instagram's Basic Display
   API + a token broker (out of scope for a static v1), so this is a tasteful,
   on-brand callout linking to the live profile. Easy to upgrade later. */
export default function InstagramFeed({ data = {} }) {
  const handle = data.embed_handle || 'troublebrewingcoffee';
  return (
    <Reveal as="section" className="section section--alt">
      <div className="container" style={{ textAlign: 'center' }}>
        <p className="eyebrow">@{handle}</p>
        <h2>Follow the Trouble</h2>
        <p style={{ maxWidth: '46ch', margin: '0 auto var(--space-5)', color: 'var(--color-text-soft)' }}>
          Latte art, new drops, events, and the occasional dog behind the counter. Come say hi on Instagram.
        </p>
        <a
          className="btn btn--primary"
          href={`https://instagram.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('outbound_click', { dest: 'instagram' })}
        >
          See our Instagram
        </a>
      </div>
    </Reveal>
  );
}
