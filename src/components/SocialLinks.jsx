import { useEffect, useState } from 'react';
import { getContentBlock } from '../lib/dataService.js';
import { track } from '../lib/analytics.js';

/* Owner-managed social links (content_blocks.social_links), surfaced in the
   footer on every page and on the contact/community pages. Only renders the
   networks that have a URL set. Handles/links are edited in admin Quick Blocks. */
const NETWORKS = [
  { key: 'instagram', label: 'Instagram', icon: 'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.2 1 .46 1.4.86.4.4.66.8.86 1.4.17.4.36 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.2.6-.46 1-.86 1.4-.4.4-.8.66-1.4.86-.4.17-1 .36-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.2-1-.46-1.4-.86-.4-.4-.66-.8-.86-1.4-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.2-.6.46-1 .86-1.4.4-.4.8-.66 1.4-.86.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2m0 5.4a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8m5.6-.4a1 1 0 100 2 1 1 0 000-2M12 9.4a2.6 2.6 0 110 5.2 2.6 2.6 0 010-5.2' },
  { key: 'facebook', label: 'Facebook', icon: 'M13.5 21v-8h2.6l.4-3h-3V8.1c0-.9.3-1.5 1.6-1.5H17V4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9V10H8.4v3h2.5v8z' },
  { key: 'tiktok', label: 'TikTok', icon: 'M16.5 3c.3 2 1.5 3.4 3.5 3.6v2.6c-1.2.1-2.4-.2-3.5-.8v5.7c0 3.3-2.4 5.9-5.6 5.9A5.5 5.5 0 015.5 14c0-3 2.3-5.4 5.4-5.4.3 0 .6 0 .9.05v2.8a2.7 2.7 0 00-.9-.15A2.6 2.6 0 008.3 14c0 1.5 1.1 2.7 2.6 2.7 1.6 0 2.8-1.3 2.8-3V3z' },
  { key: 'x', label: 'X', icon: 'M17.5 3h2.7l-5.9 6.7L21 21h-5.4l-4.2-5.5L6.5 21H3.8l6.3-7.2L3 3h5.5l3.8 5 4.2-5z' },
  { key: 'youtube', label: 'YouTube', icon: 'M22 8.2a2.6 2.6 0 00-1.8-1.8C18.6 6 12 6 12 6s-6.6 0-8.2.4A2.6 2.6 0 002 8.2 27 27 0 002 12a27 27 0 00.4 3.8 2.6 2.6 0 001.8 1.8C5.4 18 12 18 12 18s6.6 0 8.2-.4a2.6 2.6 0 001.8-1.8A27 27 0 0022 12a27 27 0 00-.4-3.8M10 15V9l5 3z' },
];

export default function SocialLinks({ band = false }) {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    let alive = true;
    getContentBlock('social_links').then((l) => alive && setLinks(l || {}));
    return () => { alive = false; };
  }, []);

  if (!links) return null;
  const active = NETWORKS.filter((n) => links[n.key]);
  if (active.length === 0) return null;

  return (
    <div className={`socials ${band ? 'socials--band' : ''}`}>
      {active.map((n) => (
        <a
          key={n.key}
          className="social-link"
          href={links[n.key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={n.label}
          title={n.label}
          onClick={() => track('outbound_click', { dest: `social_${n.key}` })}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={n.icon} />
          </svg>
        </a>
      ))}
    </div>
  );
}
