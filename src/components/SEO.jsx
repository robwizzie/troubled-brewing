import { useEffect } from 'react';
import { SITE_URL } from '../lib/config.js';
import { headTags, isPreviewSearch, resolveSeo } from '../lib/seo.js';
import { pageJsonLd } from '../lib/jsonld.js';

/* Lightweight head manager (no helmet dependency).

   Everything it writes comes from src/lib/seo.js + src/lib/jsonld.js — the same
   code the build uses to prerender each route's static HTML — so the tags a
   crawler sees without JS and the tags after React boots always agree. It
   upserts (never duplicates) the prerendered tags.

   title / description: CMS values (`pages` table); empty → the route defaults.
   image / imageAlt:    optional override of the route's branded OG card.
   menuItems / events:  feed the Menu / Event structured data on /menu, /events.
   noindex:             also forced on for admin previews (?preview=1, ?concept=, ?canvas). */
function upsert({ tag, key, attrs }) {
  let el = document.head.querySelector(key);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

const DIMENSION_KEYS = ['og:image:type', 'og:image:width', 'og:image:height'];

export default function SEO({ title, description, path = '/', image, imageAlt, noindex = false, menuItems, events }) {
  useEffect(() => {
    const preview = typeof window !== 'undefined' && isPreviewSearch(window.location.search);
    const meta = resolveSeo({ path, title, description, image, imageAlt, noindex: noindex || preview, siteUrl: SITE_URL });

    document.title = meta.title;
    headTags(meta).forEach(upsert);
    if (meta.imageCustom) {
      DIMENSION_KEYS.forEach((k) => document.head.querySelector(`meta[property="${k}"]`)?.remove());
    }

    document.head.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
    if (!meta.noindex) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', '');
      script.text = JSON.stringify(pageJsonLd(meta, { siteUrl: SITE_URL, menuItems, events }));
      document.head.appendChild(script);
    }
  }, [title, description, path, image, imageAlt, noindex, menuItems, events]);

  return null;
}
