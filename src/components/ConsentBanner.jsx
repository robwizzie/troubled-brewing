import { useEffect, useState } from 'react';
import { CONSENT_KEY, GA4_ID } from '../lib/config.js';
import { loadGA } from '../lib/analytics.js';

/* Lightweight cookie/analytics consent (§5.12). Analytics only loads after
   "Accept". If no GA id is configured there's nothing to consent to, so we hide. */
export default function ConsentBanner() {
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    try {
      setDecided(Boolean(localStorage.getItem(CONSENT_KEY)));
    } catch {
      setDecided(true);
    }
  }, []);

  if (decided || !GA4_ID) return null;

  function set(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* ignore */
    }
    setDecided(true);
    if (value === 'granted') loadGA();
  }

  return (
    <div className="consent" role="dialog" aria-label="Cookie consent">
      <strong>A quick note on cookies.</strong>
      <p style={{ margin: '0.5rem 0 0' }}>
        We use privacy-friendly Google Analytics to understand what's helpful on the site. No ads, no
        selling your data. See our <a href="/privacy" style={{ color: 'var(--color-accent-hover)' }}>privacy policy</a>.
      </p>
      <div className="consent__actions">
        <button className="btn btn--accent" onClick={() => set('granted')}>Accept</button>
        <button className="btn btn--ghost" style={{ color: '#f3ede1', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => set('denied')}>
          Decline
        </button>
      </div>
    </div>
  );
}
