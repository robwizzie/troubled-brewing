/* =============================================================================
   SEO source of truth: per-route defaults + the head tags they become.

   Pure (no imports, no DOM) so the SAME data drives three places:
     · <SEO/> at runtime (src/components/SEO.jsx) — upserts these tags,
     · the build-time prerender (scripts/seo-build-plugin.mjs) — writes a real
       dist/<route>.html per public route with these tags already in <head>,
       so crawlers and link previewers that don't run JS still see them,
     · sitemap.xml / robots.txt (same plugin).

   CMS values from the `pages` table (title, meta_description) still win at
   runtime when the owner has set them; these are the defaults/fallbacks and
   what the static HTML ships with.

   Copy rules: titles ≤ 60 chars, descriptions ≤ 155, facts only (test/seo.test.js
   enforces the lengths and uniqueness).
   ============================================================================= */

export const SITE_NAME = 'Trouble Brewing Coffee House';
export const DEFAULT_SITE_URL = 'https://troublebrewingcoffeehouse.com';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const THEME_COLOR = '#f7f1e4';

/* og: the branded 1200×630 card in public/og/ (scripts/generate-og-images.py)
   ogAlt: describes that card for screen readers / platforms that show alt. */
export const SEO_ROUTES = [
  {
    path: '/',
    slug: 'home',
    label: 'Home',
    title: 'Trouble Brewing Coffee House | Haddon Heights NJ Coffee Shop',
    description:
      'Independent coffee shop on Station Ave in Haddon Heights, NJ. La Colombe coffee, Metolius teas, breakfast all day, gluten-free sweets and a Pup Cup.',
    og: 'home',
    ogAlt: 'The pastry case and coffee counter inside Trouble Brewing Coffee House, Haddon Heights, NJ',
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    path: '/menu',
    slug: 'menu',
    label: 'Menu',
    title: 'Menu | Trouble Brewing Coffee House, Haddon Heights NJ',
    description:
      'La Colombe espresso drinks, Metolius teas, breakfast sandwiches served all day, lunch melts, fresh bakery and gluten-free sweets. Order ahead online.',
    og: 'menu',
    ogAlt: 'An iced mocha topped with whipped cream at Trouble Brewing Coffee House',
    changefreq: 'weekly',
    priority: '0.9',
  },
  {
    path: '/about',
    slug: 'about',
    label: 'Our Story',
    title: 'Our Story | Trouble Brewing Coffee House, Haddon Heights',
    description:
      'Haddon Heights locals Tom and Cat opened Trouble Brewing on Station Ave on Friday the 13th, October 2017. Serious coffee, breakfast all day, good Trouble.',
    og: 'about',
    ogAlt: 'A fox planter on the counter at Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/events',
    slug: 'events',
    label: 'Events',
    title: 'Events | Trouble Brewing Coffee House, Haddon Heights NJ',
    description:
      "Upcoming events and community gatherings at Trouble Brewing Coffee House, 514 Station Ave in Haddon Heights, NJ. See what's on, then come say hi.",
    og: 'events',
    ogAlt: 'A cookie dipped into a latte at Trouble Brewing Coffee House',
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    path: '/location',
    slug: 'location',
    label: 'Hours & Location',
    title: 'Hours & Directions | Trouble Brewing Coffee House',
    description:
      'Find Trouble Brewing Coffee House at 514 Station Ave, Haddon Heights, NJ 08035, open seven days a week. Hours, parking, directions: (856) 617-6638.',
    og: 'location',
    ogAlt: 'A latte with rosetta art in a honeycomb mug at Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/contact',
    slug: 'contact',
    label: 'Contact',
    title: 'Contact & Catering | Trouble Brewing Coffee House',
    description:
      'Call (856) 617-6638 or send a message to Trouble Brewing Coffee House in Haddon Heights, NJ: questions, feedback and catering inquiries.',
    og: 'contact',
    ogAlt: 'Ricotta toasts on plates at Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/timeline',
    slug: 'timeline',
    label: 'Our Story So Far',
    title: 'Our Story So Far | Trouble Brewing Coffee House Timeline',
    description:
      'From opening day on Friday the 13th, October 2017, to nine years on Station Ave: the milestones of Trouble Brewing Coffee House in Haddon Heights, NJ.',
    og: 'timeline',
    ogAlt: 'The counter and pastry case at Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/reviews',
    slug: 'reviews',
    label: 'Reviews',
    title: 'Reviews | Trouble Brewing Coffee House, Haddon Heights NJ',
    description:
      'What neighbors say about Trouble Brewing Coffee House in Haddon Heights, NJ: real Google reviews of our coffee, breakfast and crew. Leave your own.',
    og: 'reviews',
    ogAlt: 'A B.L.T. sandwich and chips at Trouble Brewing Coffee House',
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    path: '/gallery-wall',
    slug: 'gallery-wall',
    label: 'The Gallery Wall',
    title: 'The Gallery Wall | Trouble Brewing Coffee House',
    description:
      'The green gallery wall at Trouble Brewing Coffee House: framed art, a gold fox and the curiosities that make our Haddon Heights café feel like home.',
    og: 'gallery-wall',
    ogAlt: 'The green gallery wall of framed art inside Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/troublemakers',
    slug: 'troublemakers',
    label: 'The Troublemakers',
    title: 'Meet the Troublemakers | Trouble Brewing Coffee House',
    description:
      'Meet the Troublemakers, the crew pouring La Colombe coffee and making breakfast all day at Trouble Brewing Coffee House in Haddon Heights, NJ.',
    og: 'troublemakers',
    ogAlt: 'A barista pouring latte art at Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/neighborhood',
    slug: 'neighborhood',
    label: 'Local Love',
    title: 'Local Love: Station Ave Neighbors | Trouble Brewing',
    description:
      'Our favorite Haddon Heights neighbors on Station Ave: Italian, empanadas, pizza, afternoon tea, flowers and local gifts. Shop small with Trouble Brewing.',
    og: 'neighborhood',
    ogAlt: 'Two friends sharing coffee in Trouble Brewing mugs',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/gift-cards',
    slug: 'gift-cards',
    label: 'Gift Cards',
    title: 'Gift Cards | Trouble Brewing Coffee House, Haddon Heights',
    description:
      'Give someone Trouble: send an e-gift card for Trouble Brewing Coffee House in Haddon Heights, NJ. Pick an amount, add a note, and it goes by email.',
    og: 'gift-cards',
    ogAlt: 'Iced coffee in a glass printed with the Trouble Brewing fox, with a bamboo lid and a glass straw',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/chalkboard',
    slug: 'chalkboard',
    label: 'Past Boards',
    title: 'Past Chalkboards | Trouble Brewing Coffee House',
    description:
      'Flip through the chalkboards from behind the counter at Trouble Brewing Coffee House in Haddon Heights, NJ: past specials and seasonal drinks.',
    og: 'home',
    ogAlt: 'The pastry case and coffee counter inside Trouble Brewing Coffee House, Haddon Heights, NJ',
    changefreq: 'weekly',
    priority: '0.5',
  },
  {
    path: '/wish',
    slug: 'wish',
    label: 'Make a Wish',
    title: 'Make a Wish for the Menu | Trouble Brewing Coffee House',
    description:
      'Wish for a drink, pastry or dish you’d love to see at Trouble Brewing Coffee House in Haddon Heights, NJ. Tom and Cat read every wish.',
    og: 'menu',
    ogAlt: 'An iced mocha topped with whipped cream at Trouble Brewing Coffee House',
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/privacy',
    slug: 'privacy',
    label: 'Privacy Policy',
    title: 'Privacy Policy | Trouble Brewing Coffee House',
    description: 'How Trouble Brewing Coffee House collects and uses information from our website, and the choices you have.',
    og: 'home',
    ogAlt: 'The pastry case and coffee counter inside Trouble Brewing Coffee House, Haddon Heights, NJ',
    changefreq: 'yearly',
    priority: '0.2',
  },
  {
    path: '/accessibility',
    slug: 'accessibility',
    label: 'Accessibility',
    title: 'Accessibility | Trouble Brewing Coffee House',
    description: 'Our commitment to an accessible website for everyone, and how to reach Trouble Brewing Coffee House about accessibility.',
    og: 'home',
    ogAlt: 'The pastry case and coffee counter inside Trouble Brewing Coffee House, Haddon Heights, NJ',
    changefreq: 'yearly',
    priority: '0.2',
  },
];

/* Retired URLs that should hand their search equity to a live page. */
export const SEO_REDIRECTS = [{ from: '/community', to: '/events' }];

export const HOME_ROUTE = SEO_ROUTES[0];

export function normalizePath(path) {
  const p = `/${String(path || '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')}`;
  return p === '/home' ? '/' : p;
}

export function routeForPath(path) {
  const p = normalizePath(path);
  return SEO_ROUTES.find((r) => r.path === p) || null;
}

export function routeForSlug(slug) {
  return SEO_ROUTES.find((r) => r.slug === slug) || null;
}

/** Site root with no trailing slash ("https://example.com" or "https://x.io/sub"). */
export function siteRoot(siteUrl) {
  return String(siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/** Absolute, canonical URL for a route: home → "https://…/", others → "https://…/menu" (no trailing slash). */
export function absoluteUrl(siteUrl, path = '/') {
  const p = normalizePath(path);
  return p === '/' ? `${siteRoot(siteUrl)}/` : `${siteRoot(siteUrl)}${p}`;
}

export function ogImageUrl(siteUrl, key = 'home') {
  return `${siteRoot(siteUrl)}/og/${key}.jpg`;
}

/* Query strings that mean "not the public page": admin draft preview, the
   homepage concept switcher, the editor canvas. */
export function isPreviewSearch(search) {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  return q.get('preview') === '1' || q.has('concept') || q.has('previewConcept') || q.has('canvas');
}

/**
 * Resolve everything a page's <head> needs.
 * `title` / `description` (CMS) win when non-empty; otherwise route defaults.
 */
export function resolveSeo({ path = '/', title, description, image, imageAlt, noindex = false, siteUrl } = {}) {
  const route = routeForPath(path);
  const clean = (s) => (typeof s === 'string' && s.trim() ? s.trim() : '');
  const t = clean(title) || route?.title || HOME_ROUTE.title;
  const d = clean(description) || route?.description || HOME_ROUTE.description;
  const ogKey = route?.og || 'home';
  return {
    path: route ? route.path : normalizePath(path),
    title: t,
    description: d,
    url: absoluteUrl(siteUrl, route ? route.path : path),
    image: clean(image) || ogImageUrl(siteUrl, ogKey),
    imageAlt: clean(imageAlt) || (clean(image) ? t : route?.ogAlt || HOME_ROUTE.ogAlt),
    imageCustom: Boolean(clean(image)),
    noindex: Boolean(noindex),
    ogType: 'website',
  };
}

/**
 * The managed head tags, as plain data. `key` is a CSS selector that finds the
 * tag in a document (runtime upsert); `tag` + `attrs` render it (prerender).
 */
export function headTags(meta) {
  const m = (attr, name, content) => ({
    tag: 'meta',
    key: `meta[${attr}="${name}"]`,
    attrs: { [attr]: name, content },
  });
  const tags = [
    m('name', 'description', meta.description),
    m('name', 'robots', meta.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'),
    { tag: 'link', key: 'link[rel="canonical"]', attrs: { rel: 'canonical', href: meta.url } },
    m('property', 'og:type', meta.ogType),
    m('property', 'og:site_name', SITE_NAME),
    m('property', 'og:locale', 'en_US'),
    m('property', 'og:title', meta.title),
    m('property', 'og:description', meta.description),
    m('property', 'og:url', meta.url),
    m('property', 'og:image', meta.image),
    m('property', 'og:image:alt', meta.imageAlt),
    m('name', 'twitter:card', 'summary_large_image'),
    m('name', 'twitter:title', meta.title),
    m('name', 'twitter:description', meta.description),
    m('name', 'twitter:image', meta.image),
    m('name', 'twitter:image:alt', meta.imageAlt),
  ];
  // Dimensions only describe our own 1200×630 cards; an owner-supplied image
  // could be any size, so those tags are dropped rather than lying.
  if (!meta.imageCustom) {
    tags.push(
      m('property', 'og:image:type', 'image/jpeg'),
      m('property', 'og:image:width', String(OG_IMAGE_WIDTH)),
      m('property', 'og:image:height', String(OG_IMAGE_HEIGHT))
    );
  }
  return tags;
}

/* ---------- static HTML rendering (build-time prerender) ------------------ */

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON for inside <script type="application/ld+json"> — `<` escaped so no string can close the tag. */
export function jsonLdScript(data) {
  return `<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function renderHeadTags(meta, jsonLd) {
  const lines = [`<title>${escapeHtml(meta.title)}</title>`];
  for (const t of headTags(meta)) {
    const attrs = Object.entries(t.attrs)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(' ');
    lines.push(`<${t.tag} ${attrs} />`);
  }
  if (jsonLd) lines.push(jsonLdScript(jsonLd));
  return lines.map((l) => `    ${l}`).join('\n');
}

export const SEO_START = '<!--seo:start-->';
export const SEO_END = '<!--seo:end-->';

/* A no-JS fallback inside <noscript>: the page's name, what it is, the
   address/phone, and links to every public page (so crawlers that don't run
   JavaScript still discover the whole site). React never touches <noscript>. */
export function renderNoscript(meta, { base = '/' } = {}) {
  const href = (p) => `${base.replace(/\/$/, '')}${p === '/' ? '/' : p}`;
  const links = SEO_ROUTES.map((r) => `<a href="${escapeHtml(href(r.path))}">${escapeHtml(r.label)}</a>`).join(' · ');
  return [
    '<noscript>',
    `      <h1>${escapeHtml(meta.title)}</h1>`,
    `      <p>${escapeHtml(meta.description)}</p>`,
    `      <p>${SITE_NAME} · 514 Station Ave, Haddon Heights, NJ 08035 · <a href="tel:+18566176638">(856) 617-6638</a></p>`,
    `      <nav>${links}</nav>`,
    '    </noscript>',
  ].join('\n');
}

/**
 * Turn the built index.html into a route's own page: swaps the region between
 * the seo:start/end markers for this route's tags and adds the <noscript>
 * fallback before #root. Throws if the markers are missing so a template
 * change can't silently ship pages without metadata.
 */
export function prerenderHtml(template, meta, jsonLd, { base = '/' } = {}) {
  const start = template.indexOf(SEO_START);
  const end = template.indexOf(SEO_END);
  if (start < 0 || end < start) throw new Error('index.html is missing the <!--seo:start--> / <!--seo:end--> markers');
  let html = `${template.slice(0, start + SEO_START.length)}\n${renderHeadTags(meta, jsonLd)}\n    ${template.slice(end)}`;
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/i, '');
  html = html.replace('<div id="root"></div>', `${renderNoscript(meta, { base })}\n    <div id="root"></div>`);
  return html;
}

/** Static page for a retired URL: meta-refresh (to `href`, relative so it stays
    on whatever host served it) + canonical to the new page's absolute URL. */
export function redirectHtml(toUrl, href = toUrl) {
  const u = escapeHtml(toUrl);
  const h = escapeHtml(href);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Moved — ${SITE_NAME}</title>
    <link rel="canonical" href="${u}" />
    <meta name="robots" content="noindex,follow" />
    <meta http-equiv="refresh" content="0; url=${h}" />
  </head>
  <body><p>This page has moved to <a href="${h}">${u}</a>.</p></body>
</html>
`;
}

/* ---------- sitemap / robots ---------------------------------------------- */

export function sitemapXml(siteUrl, { lastmod } = {}) {
  const urls = SEO_ROUTES.map(
    (r) =>
      `  <url><loc>${escapeHtml(absoluteUrl(siteUrl, r.path))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(siteUrl) {
  // Paths are relative to the site root the URL names, so the admin rule
  // follows the base path (e.g. /troubled-brewing/admin on a project page).
  const basePath = new URL(`${siteRoot(siteUrl)}/`).pathname;
  return [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${basePath}admin`,
    '',
    `Sitemap: ${siteRoot(siteUrl)}/sitemap.xml`,
    '',
  ].join('\n');
}
