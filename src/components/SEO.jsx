import { useEffect } from 'react';
import { SITE_URL } from '../lib/config.js';

/* Lightweight head manager (avoids an extra helmet dependency).
   Sets <title>, meta description, canonical, OG tags, optional noindex, and an
   optional JSON-LD block. Cleans up the JSON-LD on unmount. */
function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function SEO({ title, description, path = '', image, noindex = false, jsonLd }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    }
    if (title) upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });

    const url = SITE_URL.replace(/\/$/, '') + path;
    upsertLink('canonical', url);
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    if (image) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });

    upsertMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex,nofollow' : 'index,follow' });

    let script;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (script) document.head.removeChild(script);
    };
  }, [title, description, path, image, noindex, jsonLd]);

  return null;
}
