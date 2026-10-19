import { SITE_URL } from './config.js';
import { SITE, HOURS, GOOGLE_PROFILE, CONTENT_BLOCKS } from './seed.js';
import { HOME_ROUTE, SITE_NAME, absoluteUrl, normalizePath, ogImageUrl, routeForPath, siteRoot } from './seo.js';

/* =============================================================================
   Structured data (schema.org JSON-LD).

   Every public page gets one @graph: the café (CafeOrCoffeeShop), the page
   (WebPage) and its BreadcrumbList; home adds WebSite, /menu adds Menu (from
   the menu data) and /events adds an Event per real event row. The same
   builders run at runtime (<SEO/>) and at build time (the prerender writes the
   graph into each route's static HTML).

   Facts only. Hours come from the hours data (seed mirrors the live table and
   the Google profile); geo + map link from the cached Google profile.
   aggregateRating is deliberately NOT included: the only rating we have is
   Google's, and Google's review-snippet rules forbid marking up ratings
   collected on another site (and ignore self-serving LocalBusiness ratings),
   so it would earn nothing and risk a manual action.
   ============================================================================= */

const DAY_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function to24h(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):?(\d{2})?\s*(?:([AaPp])\.?[Mm]?\.?)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? m[2] : '00';
  const mer = m[3] ? m[3].toUpperCase() : null;
  if (mer === 'P' && h !== 12) h += 12;
  if (mer === 'A' && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${min}`;
}

/** Weekly rows → OpeningHoursSpecification, days with identical hours grouped (Mon–Thu, Fri–Sat, Sun). */
export function openingHoursSpecification(hours = HOURS) {
  const groups = new Map();
  for (const h of [...hours].sort((a, b) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7))) {
    const opens = to24h(h.open_time);
    const closes = to24h(h.close_time);
    if (!opens || !closes) continue;
    const k = `${opens}-${closes}`;
    if (!groups.has(k)) groups.set(k, { opens, closes, days: [] });
    groups.get(k).days.push(DAY_SCHEMA[h.day_of_week]);
  }
  return [...groups.values()].map((g) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: g.days.length === 1 ? g.days[0] : g.days,
    opens: g.opens,
    closes: g.closes,
  }));
}

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '514 Station Ave',
  addressLocality: 'Haddon Heights',
  addressRegion: 'NJ',
  postalCode: '08035',
  addressCountry: 'US',
};

const ids = (siteUrl) => {
  const root = siteRoot(siteUrl);
  return { root, business: `${root}/#business`, website: `${root}/#website` };
};

function sameAs() {
  const links = CONTENT_BLOCKS.social_links || {};
  const out = ['instagram', 'facebook', 'tiktok', 'x', 'youtube'].map((k) => links[k]).filter((u) => /^https?:\/\//.test(u || ''));
  if (!out.length && SITE.instagram) out.push(`https://www.instagram.com/${SITE.instagram}`);
  if (GOOGLE_PROFILE.maps_url) out.push(GOOGLE_PROFILE.maps_url);
  return out;
}

/** The café itself. */
export function businessNode({ siteUrl = SITE_URL, hours = HOURS } = {}) {
  const { root, business } = ids(siteUrl);
  const node = {
    '@type': 'CafeOrCoffeeShop',
    '@id': business,
    name: SITE_NAME,
    description: HOME_ROUTE.description,
    url: `${root}/`,
    telephone: '+1-856-617-6638',
    image: [ogImageUrl(siteUrl, 'home'), `${root}/images/wall/our-story-so-far.jpg`, `${root}/images/wall/gallery-wall.jpg`],
    logo: `${root}/images/brand/logo-fox.png`,
    priceRange: '$$',
    currenciesAccepted: 'USD',
    servesCuisine: ['Coffee', 'Espresso', 'Tea', 'Breakfast', 'Sandwiches', 'Bakery'],
    address: ADDRESS,
    openingHoursSpecification: openingHoursSpecification(hours),
    sameAs: sameAs(),
    hasMenu: absoluteUrl(siteUrl, '/menu'),
    acceptsReservations: false,
    foundingDate: '2017-10-13',
  };
  if (Number.isFinite(GOOGLE_PROFILE.lat) && Number.isFinite(GOOGLE_PROFILE.lng)) {
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(GOOGLE_PROFILE.lat.toFixed(6)),
      longitude: Number(GOOGLE_PROFILE.lng.toFixed(6)),
    };
  }
  if (GOOGLE_PROFILE.maps_url) node.hasMap = GOOGLE_PROFILE.maps_url;
  return node;
}

export function websiteNode({ siteUrl = SITE_URL } = {}) {
  const { root, website, business } = ids(siteUrl);
  return { '@type': 'WebSite', '@id': website, url: `${root}/`, name: SITE_NAME, inLanguage: 'en-US', publisher: { '@id': business } };
}

export function breadcrumbNode(path, { siteUrl = SITE_URL } = {}) {
  const p = normalizePath(path);
  const route = routeForPath(p);
  if (!route || p === '/') return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(siteUrl, p)}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(siteUrl, '/') },
      { '@type': 'ListItem', position: 2, name: route.label, item: absoluteUrl(siteUrl, p) },
    ],
  };
}

export function webPageNode(meta, { siteUrl = SITE_URL } = {}) {
  const { website, business } = ids(siteUrl);
  const node = {
    '@type': 'WebPage',
    '@id': `${meta.url}#webpage`,
    url: meta.url,
    name: meta.title,
    description: meta.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': website },
    about: { '@id': business },
    primaryImageOfPage: { '@type': 'ImageObject', url: meta.image },
  };
  if (normalizePath(meta.path) !== '/') node.breadcrumb = { '@id': `${meta.url}#breadcrumb` };
  return node;
}

/* ---- Menu ------------------------------------------------------------------ */

const SECTION_FALLBACK = { espresso: 'Coffee & Espresso', specialty: 'Specialty Drinks & Tea', food: 'Food', pastry: 'Bakery', seasonal: 'Seasonal' };

export function menuNode(items, { siteUrl = SITE_URL } = {}) {
  const sections = new Map();
  for (const i of items || []) {
    if (!i || !i.name || i.available === false) continue;
    const name = i.spoton_category || SECTION_FALLBACK[i.category] || 'More';
    if (!sections.has(name)) sections.set(name, []);
    const item = { '@type': 'MenuItem', name: i.name };
    if (i.description) item.description = i.description;
    const price = Number(i.price);
    if (i.price != null && Number.isFinite(price) && price > 0) {
      item.offers = { '@type': 'Offer', price: price.toFixed(2), priceCurrency: 'USD' };
    }
    const flags = i.dietary_flags || [];
    const diets = [];
    if (flags.includes('gluten-free')) diets.push('https://schema.org/GlutenFreeDiet');
    if (flags.includes('vegan')) diets.push('https://schema.org/VeganDiet');
    if (flags.includes('vegetarian')) diets.push('https://schema.org/VegetarianDiet');
    if (diets.length) item.suitableForDiet = diets.length === 1 ? diets[0] : diets;
    sections.get(name).push(item);
  }
  if (!sections.size) return null;
  const url = absoluteUrl(siteUrl, '/menu');
  return {
    '@type': 'Menu',
    '@id': `${url}#menu`,
    name: `${SITE_NAME} Menu`,
    url,
    inLanguage: 'en-US',
    hasMenuSection: [...sections.entries()].map(([name, hasMenuItem]) => ({ '@type': 'MenuSection', name, hasMenuItem })),
  };
}

/* ---- Events ---------------------------------------------------------------- */

/** "7:00 PM", "7–9pm", "6:30-8:30 p.m." → "19:00"; null when there's no usable time. */
export function eventStartTime(text) {
  const s = String(text || '').trim();
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?/i);
  if (!m) return null;
  let mer = m[3];
  if (!mer) {
    const later = s.slice(m.index + m[0].length).match(/([ap])\.?\s*m\b/i);
    mer = later ? later[1] : null;
  }
  if (!mer) return null; // "7" alone is ambiguous — better a date-only event than a wrong time
  return to24h(`${m[1]}:${m[2] || '00'} ${mer}M`);
}

export function eventNodes(events, { siteUrl = SITE_URL } = {}) {
  const { root, business } = ids(siteUrl);
  const url = absoluteUrl(siteUrl, '/events');
  return (events || [])
    .filter((e) => e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(String(e.event_date || '')) && (!e.status || e.status === 'published'))
    .map((e) => {
      const time = eventStartTime(e.event_time);
      const node = {
        '@type': 'Event',
        name: e.title,
        startDate: time ? `${e.event_date}T${time}` : e.event_date,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: SITE_NAME, address: ADDRESS },
        organizer: { '@id': business },
        url,
      };
      if (e.description) node.description = e.description;
      if (e.image_url) node.image = /^https?:\/\//.test(e.image_url) ? e.image_url : `${root}/${String(e.image_url).replace(/^\//, '')}`;
      return node;
    });
}

/* ---- Page graph ------------------------------------------------------------ */

/**
 * The full JSON-LD for one page. `meta` is resolveSeo() output; pass
 * `menuItems` on /menu and `events` on /events.
 */
export function pageJsonLd(meta, { siteUrl = SITE_URL, menuItems, events, hours } = {}) {
  const p = normalizePath(meta.path);
  const graph = [businessNode({ siteUrl, hours })];
  if (p === '/') graph.push(websiteNode({ siteUrl }));
  graph.push(webPageNode(meta, { siteUrl }));
  const crumbs = breadcrumbNode(p, { siteUrl });
  if (crumbs) graph.push(crumbs);
  if (p === '/menu' && menuItems) {
    const menu = menuNode(menuItems, { siteUrl });
    if (menu) graph.push(menu);
  }
  if (p === '/events' && events) graph.push(...eventNodes(events, { siteUrl }));
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Back-compat: the standalone café block. */
export function localBusinessJsonLd() {
  return { '@context': 'https://schema.org', ...businessNode() };
}
