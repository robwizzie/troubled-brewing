import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import * as seo from '../src/lib/seo.js';
import * as jsonld from '../src/lib/jsonld.js';
import * as seed from '../src/lib/seed.js';
import { buildSeoFiles } from '../scripts/seo-build-plugin.mjs';

/* SEO plumbing: per-route head tags, structured data, sitemap/robots and the
   build-time prerender. Runs on the seed path (no Supabase), which is also
   exactly what the build prerenders from. */

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://troublebrewingcoffeehouse.com';
const PUBLIC_PATHS = [
  '/', '/menu', '/about', '/events', '/location', '/contact', '/timeline', '/reviews',
  '/gallery-wall', '/troublemakers', '/neighborhood', '/privacy', '/accessibility',
];

const head = (sel) => document.head.querySelector(sel);
const metaContent = (sel) => head(sel)?.getAttribute('content');
const readJsonLd = () => {
  const scripts = document.head.querySelectorAll('script[data-seo-jsonld]');
  expect(scripts.length).toBe(1); // upserted, never duplicated
  return JSON.parse(scripts[0].textContent);
};
const nodeOf = (graph, type) => graph['@graph'].find((n) => n['@type'] === type);

/** Width/height from a baseline or progressive JPEG's SOF marker. */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function renderRoute(p) {
  return render(
    <MemoryRouter initialEntries={[p]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('route metadata (src/lib/seo.js)', () => {
  it('covers every public route', () => {
    expect(seo.SEO_ROUTES.map((r) => r.path).sort()).toEqual([...PUBLIC_PATHS].sort());
  });

  it.each(seo.SEO_ROUTES.map((r) => [r.path, r]))('%s: title ≤ 60, description 70–155', (_, r) => {
    expect(r.title.length).toBeLessThanOrEqual(60);
    expect(r.description.length).toBeLessThanOrEqual(155);
    expect(r.description.length).toBeGreaterThanOrEqual(70);
    expect(r.title).toMatch(/Trouble Brewing/);
    expect(r.ogAlt.length).toBeGreaterThan(10);
  });

  it('titles and descriptions are unique', () => {
    const titles = seo.SEO_ROUTES.map((r) => r.title);
    const descs = seo.SEO_ROUTES.map((r) => r.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it('every OG card exists as an optimised 1200×630 JPEG', () => {
    for (const key of new Set(seo.SEO_ROUTES.map((r) => r.og))) {
      const file = path.join(ROOT, 'public/og', `${key}.jpg`);
      expect(fs.existsSync(file), file).toBe(true);
      const buf = fs.readFileSync(file);
      expect(jpegSize(buf)).toEqual({ width: 1200, height: 630 });
      expect(buf.length).toBeLessThan(300 * 1024);
    }
  });

  it('canonical URLs: custom domain, no trailing slash except the root', () => {
    expect(seo.absoluteUrl(SITE, '/')).toBe(`${SITE}/`);
    expect(seo.absoluteUrl(`${SITE}/`, '/menu/')).toBe(`${SITE}/menu`);
    expect(seo.absoluteUrl(SITE, '/menu?preview=1#x')).toBe(`${SITE}/menu`);
    expect(seo.absoluteUrl(SITE, 'home')).toBe(`${SITE}/`);
  });

  it('CMS values win; blanks fall back to the route defaults', () => {
    const menu = seo.routeForPath('/menu');
    expect(seo.resolveSeo({ path: '/menu', siteUrl: SITE }).title).toBe(menu.title);
    expect(seo.resolveSeo({ path: '/menu', title: '  ', description: '', siteUrl: SITE }).description).toBe(menu.description);
    const cms = seo.resolveSeo({ path: '/menu', title: 'Owner title', description: 'Owner description', siteUrl: SITE });
    expect(cms.title).toBe('Owner title');
    expect(cms.description).toBe('Owner description');
  });

  it('flags admin preview URLs', () => {
    expect(seo.isPreviewSearch('?preview=1')).toBe(true);
    expect(seo.isPreviewSearch('?concept=warm_storefront')).toBe(true);
    expect(seo.isPreviewSearch('?canvas=1')).toBe(true);
    expect(seo.isPreviewSearch('?utm_source=ig')).toBe(false);
  });

  it('a custom image drops the 1200×630 dimension tags', () => {
    const own = seo.headTags(seo.resolveSeo({ path: '/', siteUrl: SITE }));
    const custom = seo.headTags(seo.resolveSeo({ path: '/', image: 'https://x.test/a.png', siteUrl: SITE }));
    expect(own.some((t) => t.attrs.property === 'og:image:width')).toBe(true);
    expect(custom.some((t) => t.attrs.property === 'og:image:width')).toBe(false);
  });
});

describe('<SEO/> output per route', () => {
  it.each(PUBLIC_PATHS)('%s sets title, description, canonical, OG/Twitter and JSON-LD', async (p) => {
    const route = seo.routeForPath(p);
    renderRoute(p);
    await waitFor(() => expect(document.title).toBe(route.title));

    const url = seo.absoluteUrl(SITE, p);
    expect(metaContent('meta[name="description"]')).toBe(route.description);
    expect(head('link[rel="canonical"]').getAttribute('href')).toBe(url);
    expect(metaContent('meta[name="robots"]')).toMatch(/^index,follow/);
    expect(metaContent('meta[property="og:title"]')).toBe(route.title);
    expect(metaContent('meta[property="og:url"]')).toBe(url);
    expect(metaContent('meta[property="og:image"]')).toBe(`${SITE}/og/${route.og}.jpg`);
    expect(metaContent('meta[property="og:image:width"]')).toBe('1200');
    expect(metaContent('meta[property="og:image:height"]')).toBe('630');
    expect(metaContent('meta[property="og:image:alt"]')).toBe(route.ogAlt);
    expect(metaContent('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(metaContent('meta[name="twitter:image"]')).toBe(`${SITE}/og/${route.og}.jpg`);

    const graph = readJsonLd();
    const biz = nodeOf(graph, 'CafeOrCoffeeShop');
    expect(biz.name).toBe('Trouble Brewing Coffee House');
    expect(biz.address.streetAddress).toBe('514 Station Ave');
    const crumbs = nodeOf(graph, 'BreadcrumbList');
    if (p === '/') {
      expect(nodeOf(graph, 'WebSite')).toBeTruthy();
      expect(crumbs).toBeUndefined();
    } else {
      expect(crumbs.itemListElement.at(-1).item).toBe(url);
    }
  });

  it('/menu carries Menu structured data from the menu', async () => {
    renderRoute('/menu');
    await waitFor(() => expect(nodeOf(readJsonLd(), 'Menu')).toBeTruthy());
    const menu = nodeOf(readJsonLd(), 'Menu');
    const names = menu.hasMenuSection.flatMap((s) => s.hasMenuItem.map((i) => i.name));
    expect(names).toContain('Cappuccino');
    // unavailable items stay out
    expect(names).not.toContain('Banana Split Coffee');
  });

  it('the 404 page is noindex and has no structured data', async () => {
    renderRoute('/no-such-page');
    await waitFor(() => expect(metaContent('meta[name="robots"]')).toBe('noindex,nofollow'));
    expect(document.head.querySelectorAll('script[data-seo-jsonld]').length).toBe(0);
  });

  it('admin preview URLs are noindex', async () => {
    const prev = window.location.href;
    window.history.replaceState(null, '', '/menu?preview=1');
    try {
      renderRoute('/menu?preview=1');
      await waitFor(() => expect(metaContent('meta[name="robots"]')).toBe('noindex,nofollow'));
    } finally {
      window.history.replaceState(null, '', prev);
    }
  });
});

describe('structured data (src/lib/jsonld.js)', () => {
  const meta = (p) => seo.resolveSeo({ path: p, siteUrl: SITE });

  it.each(PUBLIC_PATHS)('%s graph is valid JSON with the required LocalBusiness fields', (p) => {
    const g = JSON.parse(JSON.stringify(jsonld.pageJsonLd(meta(p), { siteUrl: SITE, menuItems: seed.MENU_ITEMS })));
    expect(g['@context']).toBe('https://schema.org');
    const biz = nodeOf(g, 'CafeOrCoffeeShop');
    for (const k of ['@id', 'name', 'url', 'telephone', 'image', 'priceRange', 'servesCuisine', 'address', 'geo', 'openingHoursSpecification', 'sameAs', 'hasMenu']) {
      expect(biz[k], k).toBeTruthy();
    }
    expect(biz.telephone).toBe('+1-856-617-6638');
    expect(biz.acceptsReservations).toBe(false);
    expect(biz.hasMenu).toBe(`${SITE}/menu`);
    expect(biz.aggregateRating).toBeUndefined();
    expect(nodeOf(g, 'WebPage').url).toBe(seo.absoluteUrl(SITE, p));
  });

  it('opening hours match the hours data, grouped by identical days', () => {
    const spec = jsonld.openingHoursSpecification(seed.HOURS);
    const byDay = {};
    for (const s of spec) for (const d of [].concat(s.dayOfWeek)) byDay[d] = `${s.opens}-${s.closes}`;
    expect(byDay).toEqual({
      Monday: '07:30-19:00', Tuesday: '07:30-19:00', Wednesday: '07:30-19:00', Thursday: '07:30-19:00',
      Friday: '07:30-17:00', Saturday: '07:30-17:00', Sunday: '08:00-15:00',
    });
  });

  it('menu items get USD offers and diet tags', () => {
    const menu = jsonld.menuNode(
      [
        { name: 'Cappuccino', price: 4, category: 'espresso', spoton_category: 'Coffee & Espresso Drinks' },
        { name: 'GF Brownie', price: 6.29, category: 'pastry', dietary_flags: ['gluten-free'] },
        { name: 'Pup Cup!', price: null, category: 'espresso' },
        { name: 'Gone', price: 3, available: false },
      ],
      { siteUrl: SITE }
    );
    const items = menu.hasMenuSection.flatMap((s) => s.hasMenuItem);
    expect(items.map((i) => i.name)).toEqual(['Cappuccino', 'GF Brownie', 'Pup Cup!']);
    expect(items[0].offers).toEqual({ '@type': 'Offer', price: '4.00', priceCurrency: 'USD' });
    expect(items[1].suitableForDiet).toBe('https://schema.org/GlutenFreeDiet');
    expect(items[2].offers).toBeUndefined();
  });

  it('events become Event nodes at the shop, with a start time when one is given', () => {
    const g = jsonld.pageJsonLd(meta('/events'), {
      siteUrl: SITE,
      events: [
        { title: 'Open Mic', event_date: '2026-11-07', event_time: '7–9 PM', description: 'Bring a song.', image_url: '/images/x.jpg', status: 'published' },
        { title: 'Pup Party', event_date: '2026-11-14', event_time: 'all morning' },
        { title: 'Draft', event_date: '2026-11-20', status: 'draft' },
        { title: 'Bad date', event_date: 'soon' },
      ],
    });
    const events = g['@graph'].filter((n) => n['@type'] === 'Event');
    expect(events.map((e) => e.name)).toEqual(['Open Mic', 'Pup Party']);
    expect(events[0].startDate).toBe('2026-11-07T19:00');
    expect(events[1].startDate).toBe('2026-11-14');
    expect(events[0].location.address.postalCode).toBe('08035');
    expect(events[0].image).toBe(`${SITE}/images/x.jpg`);
    expect(events[0].eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode');
  });

  it('parses event times', () => {
    expect(jsonld.eventStartTime('7:00 PM')).toBe('19:00');
    expect(jsonld.eventStartTime('6:30-8:30 p.m.')).toBe('18:30');
    expect(jsonld.eventStartTime('10am')).toBe('10:00');
    expect(jsonld.eventStartTime('12 PM')).toBe('12:00');
    expect(jsonld.eventStartTime('7')).toBeNull();
    expect(jsonld.eventStartTime('')).toBeNull();
  });
});

describe('sitemap.xml + robots.txt', () => {
  it('sitemap lists every public route once, with lastmod, and never /admin', () => {
    const xml = seo.sitemapXml(SITE, { lastmod: '2026-10-19' });
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(PUBLIC_PATHS.map((p) => seo.absoluteUrl(SITE, p)));
    expect(xml.match(/<lastmod>2026-10-19<\/lastmod>/g)).toHaveLength(PUBLIC_PATHS.length);
    expect(xml).not.toMatch(/admin/);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('robots allows all, blocks /admin and points at the sitemap', () => {
    expect(seo.robotsTxt(SITE)).toBe(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE}/sitemap.xml\n`);
    expect(seo.robotsTxt('https://robwiscount.org/troubled-brewing/')).toMatch(/Disallow: \/troubled-brewing\/admin/);
  });
});

describe('build-time prerender', () => {
  const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = buildSeoFiles({ template, seo, jsonld, seed, siteUrl: SITE, base: '/', lastmod: '2026-10-19' });

  it('writes a page per public route, plus the sitemap, robots and redirects', () => {
    const expected = PUBLIC_PATHS.map((p) => (p === '/' ? 'index.html' : `${p.slice(1)}.html`));
    for (const f of [...expected, 'sitemap.xml', 'robots.txt', 'community.html']) expect(files[f], f).toBeTruthy();
  });

  it('every prerendered page has its own title, description, canonical, OG and parseable JSON-LD', () => {
    const titles = new Set();
    for (const p of PUBLIC_PATHS) {
      const html = files[p === '/' ? 'index.html' : `${p.slice(1)}.html`];
      const route = seo.routeForPath(p);
      const title = html.match(/<title>([^<]*)<\/title>/g);
      expect(title).toHaveLength(1);
      titles.add(title[0]);
      expect(html).toContain(`<meta name="description" content="${seo.escapeHtml(route.description)}" />`);
      expect(html).toContain(`<link rel="canonical" href="${seo.absoluteUrl(SITE, p)}" />`);
      expect(html).toContain(`<meta property="og:image" content="${SITE}/og/${route.og}.jpg" />`);
      expect(html.match(/name="description"/g)).toHaveLength(1);
      const ld = JSON.parse(html.match(/<script type="application\/ld\+json" data-seo-jsonld>(.*?)<\/script>/)[1]);
      expect(nodeOf(ld, 'CafeOrCoffeeShop')).toBeTruthy();
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<div id="root"></div>');
      expect(html).toMatch(/<noscript>[\s\S]*<a href="\/menu">Menu<\/a>/);
    }
    expect(titles.size).toBe(PUBLIC_PATHS.length);
    expect(files['menu.html']).toMatch(/"@type":"Menu"/);
  });

  it('retired /community points crawlers at /events', () => {
    expect(files['community.html']).toContain(`<link rel="canonical" href="${SITE}/events" />`);
    expect(files['community.html']).toContain('content="0; url=/events"');
  });

  it('refuses a template without the markers', () => {
    expect(() => seo.prerenderHtml('<html><head></head></html>', seo.resolveSeo({ path: '/' }), null)).toThrow(/markers/);
  });
});
