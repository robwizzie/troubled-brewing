import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getGoogleProfile } from '../../lib/dataService.js';
import { track } from '../../lib/analytics.js';

/* "Leave a review on Google" — links to the shop's Google Business Profile
   (google_profile.maps_url). */
export default function ReviewCTA({ data = {} }) {
  const { heading = 'Been in lately?', body, button_label = 'Leave a review on Google' } = data;
  const [url, setUrl] = useState('');

  useEffect(() => {
    let alive = true;
    getGoogleProfile().then((p) => alive && setUrl(p?.maps_url || ''));
    return () => { alive = false; };
  }, []);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <div className="cta-band">
          <div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>{heading}</h2>
            {body && <p style={{ margin: 0, color: 'var(--color-text-soft)' }}>{body}</p>}
          </div>
          <div className="cta-band__action">
            <a
              className="btn btn--accent btn--lg"
              href={url || 'https://www.google.com/maps'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('outbound_click', { dest: 'google_review' })}
            >
              {button_label}
            </a>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
