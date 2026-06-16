import { useEffect, useState } from 'react';
import { FaInstagram, FaFacebookF, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { FaEnvelope } from 'react-icons/fa6';
import { getContentBlock } from '../lib/dataService.js';
import { track } from '../lib/analytics.js';
import { SITE } from '../lib/seed.js';

/* Owner-managed social links (content_blocks.social_links) rendered as proper
   brand icons (react-icons). Email is always shown. Only networks with a URL
   set appear. Edited in admin Quick Blocks. */
const NETWORKS = [
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
  { key: 'facebook', label: 'Facebook', Icon: FaFacebookF },
  { key: 'tiktok', label: 'TikTok', Icon: FaTiktok },
  { key: 'x', label: 'X', Icon: FaXTwitter },
  { key: 'youtube', label: 'YouTube', Icon: FaYoutube },
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

  return (
    <div className={`socials ${band ? 'socials--band' : ''}`}>
      {active.map(({ key, label, Icon }) => (
        <a
          key={key}
          className="social-link"
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          onClick={() => track('outbound_click', { dest: `social_${key}` })}
        >
          <Icon aria-hidden="true" />
        </a>
      ))}
      <a className="social-link" href={`mailto:${SITE.email}`} aria-label="Email us" title="Email us">
        <FaEnvelope aria-hidden="true" />
      </a>
    </div>
  );
}
