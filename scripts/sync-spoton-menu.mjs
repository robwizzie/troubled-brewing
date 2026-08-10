#!/usr/bin/env node
/* =============================================================================
   SpotOn → site menu sync (no official API required).

   SpotOn's partner API is application-gated (docs/INTEGRATIONS.md §SpotOn), but
   the shop's hosted ordering page is public. This script reads that page the
   same way a customer's browser does, finds the menu data the page ships to
   render itself, and mirrors it into the site's menu:

     1. Fetch the order page HTML; harvest every JSON payload in it
        (__NEXT_DATA__, application/json + ld+json scripts, window.__STATE__
        assignments). If the menu isn't in the static HTML, load the page in
        headless Chrome (playwright-core + the CI runner's system browser) and
        harvest every JSON network response the app fetches while rendering.
     2. Detect the menu STRUCTURALLY — any objects with a name and an array of
        {name, price}-looking children count as categories — so a SpotOn
        frontend redesign doesn't silently break us as long as the data flows.
     3. Map SpotOn categories onto the site's buckets (espresso / specialty /
        food / pastry / seasonal) and merge into Supabase `menu_items`:
          - names, prices, categories, availability, order → SpotOn wins
          - owner-written descriptions, photos, dietary tags → owners win
            (SpotOn descriptions only fill EMPTY ones; flags only on inserts)
          - items that left SpotOn are hidden (available=false), never deleted
     4. Write src/data/spoton-menu.json — the bundled fallback menu — so the
        no-Supabase build tracks SpotOn too (the workflow commits it).

   Run by .github/workflows/spoton-menu-sync.yml (daily + manual). Env:
     SPOTON_ORDER_URL             defaults to the shop's live order page
     SUPABASE_URL                 optional — skip to only refresh the snapshot
     SUPABASE_SERVICE_ROLE_KEY    optional (required with SUPABASE_URL)
     DRY_RUN=1                    parse + snapshot, but no Supabase writes

   Safety: if the scrape yields fewer than MIN_ITEMS items, nothing is written
   anywhere — a SpotOn outage or redesign can't blank the menu.
   ============================================================================= */

import { appendFile, readFile, writeFile } from 'node:fs/promises';

const ORDER_URL =
  process.env.SPOTON_ORDER_URL ||
  'https://order.spoton.com/so-trouble-brewing-coffee-house-26471/haddon-heights-nj/BL-BBE4-95CF-80CD';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
const MIN_ITEMS = 5;
const SNAPSHOT_URL = new URL('../src/data/spoton-menu.json', import.meta.url);
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/* ---------------------------------------------------------------------------
   Category mapping: SpotOn's names → the site's five buckets.
   EXACT wins over the keyword rules; add real SpotOn category names here as
   the shop's menu evolves (the run log prints every mapping it used).
--------------------------------------------------------------------------- */
const EXACT_CATEGORY_MAP = {
  // 'Signature Drinks': 'specialty',
};
const CATEGORY_RULES = [
  ['seasonal', /season|holiday|limited|pumpkin|peppermint|\bfall\b|autumn|winter|summer|spring/i],
  ['pastry', /pastr|bak(e|ery)|dessert|sweet|muffin|scone|croissant|cookie|cake|donut|doughnut|loaf|brownie|treat/i],
  ['food', /food|sandwich|panini|breakfast|brunch|lunch|bagel|salad|wrap|bowl|toast|savory|kitchen|melt|waffle|plate|blt/i],
  ['specialty', /special|signature|smoothie|frapp|blended|refresher|lemonade|energy|soda|kombucha|float|flight/i],
  ['espresso', /espresso|coffee|latte|cappuccino|americano|macchiato|cortado|mocha|drip|brew|roast/i],
  ['specialty', /\btea\b|chai|matcha|hot choc|cocoa|cider|drink|beverage/i],
];
/* meta-collections that duplicate real categories — skip unless they're all we have */
const META_CATEGORY = /popular|featured|favorites|recommended|suggest|upsell|deals|reorder/i;

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function bucketFor(spotonCategory, itemName = '') {
  const s = String(spotonCategory || '').trim();
  if (EXACT_CATEGORY_MAP[s]) return EXACT_CATEGORY_MAP[s];
  for (const [bucket, re] of CATEGORY_RULES) if (re.test(s)) return bucket;
  for (const [bucket, re] of CATEGORY_RULES) if (re.test(itemName)) return bucket;
  return 'specialty';
}

function inferFlags(text) {
  const flags = [];
  if (/gluten[\s-]*free|\bgf\b/i.test(text)) flags.push('gluten-free');
  if (/\bvegan\b/i.test(text)) flags.push('vegan');
  return flags;
}

/* --------------------------- JSON blob harvesting --------------------------- */

function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}

/** Scan a balanced {...} / [...] starting at str[i] (string/escape aware). */
function balancedJson(str, i) {
  const open = str[i];
  if (open !== '{' && open !== '[') return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = i; j < str.length && j < i + 5_000_000; j++) {
    const ch = str[j];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inStr) { if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return str[j] === close ? str.slice(i, j + 1) : null;
    }
  }
  return null;
}

function tryParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** Every JSON payload embedded in an HTML document. */
function extractJsonBlobs(html) {
  const blobs = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html))) {
    const openTag = m[0].slice(0, m[0].indexOf('>') + 1);
    const body = (m[1] || '').trim();
    if (!body || body.length > 4_000_000) continue;

    if (/type\s*=\s*["'](application\/(ld\+)?json)["']/i.test(openTag) || /id\s*=\s*["']__NEXT_DATA__["']/i.test(openTag)) {
      const parsed = tryParse(body);
      if (parsed) blobs.push(parsed);
      continue;
    }
    // window.__STATE__ = {...} / = JSON.parse("...") assignment patterns
    const assignRe = /(?:window\.|globalThis\.|self\.)?[A-Za-z_$][\w$.]*\s*=\s*/g;
    let a;
    let scans = 0;
    while ((a = assignRe.exec(body)) && scans < 40) {
      const at = assignRe.lastIndex;
      const ch = body[at];
      if (ch === '{' || ch === '[') {
        scans++;
        const raw = balancedJson(body, at);
        if (raw && raw.length > 200) {
          const parsed = tryParse(raw);
          if (parsed) blobs.push(parsed);
        }
      } else if (body.startsWith('JSON.parse(', at)) {
        scans++;
        const q = body.indexOf('"', at);
        if (q > -1) {
          const strLit = balancedString(body, q);
          if (strLit) {
            const decoded = tryParse(strLit); // the string literal itself
            const parsed = typeof decoded === 'string' ? tryParse(decoded) : null;
            if (parsed) blobs.push(parsed);
          }
        }
      }
    }
  }
  return blobs;
}

/** Scan a double-quoted JS string literal starting at str[i] === '"'. */
function balancedString(str, i) {
  let esc = false;
  for (let j = i + 1; j < str.length && j < i + 4_000_000; j++) {
    const ch = str[j];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') return str.slice(i, j + 1);
  }
  return null;
}

/* ----------------------------- menu detection ------------------------------ */

const NAME_KEYS = ['name', 'title', 'displayName', 'display_name', 'itemName', 'label'];
const PRICE_KEYS = [
  'price', 'basePrice', 'base_price', 'priceCents', 'price_cents', 'priceInCents',
  'unitPrice', 'unit_price', 'defaultPrice', 'default_price', 'displayPrice',
  'display_price', 'priceMoney', 'price_money', 'minPrice', 'min_price', 'amount',
];
const ITEMS_KEYS = [
  'items', 'menuItems', 'menu_items', 'products', 'children', 'entries',
  'elements', 'itemList', 'item_list', 'menuEntities', 'subItems', 'sub_items',
];
const DESC_KEYS = ['description', 'desc', 'details', 'subtitle', 'summary'];

function strFrom(obj, keys, max = 160) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim() && v.trim().length <= max) return decodeEntities(v.trim());
  }
  return null;
}

function asPriceNumber(v, forceCents = false) {
  if (v == null) return null;
  if (typeof v === 'object') {
    for (const k of ['amount', 'cents', 'value', 'units', 'displayString', 'formatted']) {
      if (v[k] != null) return asPriceNumber(v[k], forceCents || /cents/i.test(k));
    }
    return null;
  }
  if (typeof v === 'string') {
    const mm = v.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!mm) return null;
    const n = Number(mm[0]);
    if (!Number.isFinite(n)) return null;
    if (forceCents) return n / 100;
    return mm[0].includes('.') || n < 100 ? n : n / 100;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (forceCents) return v / 100;
  return Number.isInteger(v) && v >= 100 ? v / 100 : v; // integer ≥100 ⇒ cents
}

function priceOf(obj) {
  for (const k of PRICE_KEYS) {
    if (obj?.[k] != null) {
      const p = asPriceNumber(obj[k], /cents/i.test(k));
      if (p != null && p >= 0 && p < 500) return Math.round(p * 100) / 100 || null; // 0 ⇒ null
    }
  }
  return null;
}

function isItem(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  if (!strFrom(o, NAME_KEYS)) return false;
  return PRICE_KEYS.some((k) => o[k] != null && asPriceNumber(o[k], /cents/i.test(k)) != null);
}

function availOf(o) {
  for (const k of ['available', 'isAvailable', 'is_available', 'active', 'enabled', 'inStock', 'in_stock', 'visible']) {
    if (typeof o[k] === 'boolean') return o[k];
  }
  for (const k of ['is86ed', 'is_86ed', 'soldOut', 'sold_out', 'outOfStock', 'out_of_stock', 'unavailable', 'isSnoozed', 'snoozed', 'hidden']) {
    if (typeof o[k] === 'boolean') return !o[k];
  }
  return true;
}

/** Walk any JSON tree; collect {category, items[]} wherever a named object owns
    an array of item-looking children. Captured items are not walked into, so
    modifier lists nested under items stay out. */
function findCategoryCollections(root) {
  const collections = [];
  const bare = [];
  const seen = new Set();
  (function walk(node, depth) {
    if (!node || typeof node !== 'object' || depth > 30 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      if (node.length >= 3 && node.every((c) => isItem(c))) { bare.push(node); return; }
      for (const c of node) walk(c, depth + 1);
      return;
    }
    const myName = strFrom(node, NAME_KEYS, 80);
    for (const [k, v] of Object.entries(node)) {
      if (Array.isArray(v) && v.length && v.some(isItem)) {
        if (myName && (ITEMS_KEYS.includes(k) || v.every((c) => isItem(c)))) {
          collections.push({ category: myName, items: v.filter(isItem) });
          continue; // don't descend into captured items
        }
        if (v.length >= 3 && v.every((c) => isItem(c))) { bare.push(v); continue; }
      }
      walk(v, depth + 1);
    }
  })(root, 0);
  return { collections, bare };
}

function detectMenu(blobRoots) {
  const all = [];
  const bareArrays = [];
  for (const root of blobRoots) {
    const { collections, bare } = findCategoryCollections(root);
    all.push(...collections);
    bareArrays.push(...bare);
  }
  // merge collections by category name; dedupe items inside each
  const byCat = new Map();
  for (const c of all) {
    const key = norm(c.category);
    if (!key || key.length > 60) continue;
    if (!byCat.has(key)) byCat.set(key, { category: String(c.category).trim(), items: [], seen: new Set() });
    const slot = byCat.get(key);
    for (const it of c.items) {
      const nk = norm(strFrom(it, NAME_KEYS));
      if (!nk || slot.seen.has(nk)) continue;
      slot.seen.add(nk);
      slot.items.push(it);
    }
  }
  let cats = [...byCat.values()];
  const real = cats.filter((c) => !META_CATEGORY.test(c.category));
  if (real.reduce((n, c) => n + c.items.length, 0) >= MIN_ITEMS) cats = real;
  if (!cats.length && bareArrays.length) {
    const best = bareArrays.sort((a, b) => b.length - a.length)[0];
    cats = [{ category: 'Menu', items: best }];
  }
  return cats;
}

/* ------------------------------ page fetching ------------------------------ */

async function fetchStatic(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

async function fetchRendered(url) {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    console.warn('playwright-core not installed — skipping rendered fetch');
    return null;
  }
  let browser = null;
  for (const opts of [
    { channel: 'chrome' },
    { executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' },
    { executablePath: '/usr/bin/chromium-browser' },
    { executablePath: '/usr/bin/chromium' },
    {},
  ]) {
    try { browser = await chromium.launch({ headless: true, ...opts }); break; } catch { /* next */ }
  }
  if (!browser) { console.warn('no Chrome/Chromium available for rendered fetch'); return null; }
  try {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 2200 } });
    const page = await ctx.newPage();
    const netBlobs = [];
    page.on('response', (res) => {
      const ct = res.headers()['content-type'] || '';
      if (!/json/i.test(ct)) return;
      res.text().then((t) => {
        if (t && t.length < 5_000_000) netBlobs.push({ url: res.url(), text: t });
      }).catch(() => {});
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    for (const f of [0.35, 0.7, 1]) {
      await page.evaluate((y) => window.scrollTo(0, document.body.scrollHeight * y), f);
      await page.waitForTimeout(1200);
    }
    const html = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
    return { html, netBlobs, bodyText };
  } finally {
    await browser.close().catch(() => {});
  }
}

/* --------------------------- Supabase REST helpers -------------------------- */

const sbConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

async function sb(pathAndQuery, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathAndQuery} → ${res.status} ${await res.text()}`);
  return res.json();
}

/* ------------------------------- merge logic ------------------------------- */

function planMerge(existing, scraped) {
  const byName = new Map(existing.map((r) => [norm(r.name), r]));
  const ops = { update: [], insert: [], hide: [] };
  const claimed = new Set();
  scraped.forEach((s, idx) => {
    const key = norm(s.name);
    if (!key || claimed.has(key)) return;
    claimed.add(key);
    const order = (idx + 1) * 10;
    const row = byName.get(key);
    if (row) {
      const patch = {};
      if (s.price != null && Number(row.price) !== s.price) patch.price = s.price;
      if (row.category !== s.category) patch.category = s.category;
      if ((row.available !== false) !== s.available) patch.available = s.available;
      if ((row.display_order ?? -1) !== order) patch.display_order = order;
      if ((!row.description || !String(row.description).trim()) && s.description) patch.description = s.description;
      if (Object.keys(patch).length) ops.update.push({ id: row.id, name: row.name, patch });
    } else {
      ops.insert.push({
        name: s.name,
        description: s.description || '',
        price: s.price,
        category: s.category,
        dietary_flags: inferFlags(`${s.name} ${s.description || ''}`),
        available: s.available,
        display_order: order,
        status: 'published',
      });
    }
  });
  for (const r of existing) {
    if (!claimed.has(norm(r.name)) && r.available !== false) ops.hide.push({ id: r.id, name: r.name });
  }
  return ops;
}

function simulateMerge(existing, ops) {
  const rows = existing.map((r) => ({ ...r }));
  for (const u of ops.update) Object.assign(rows.find((r) => r.id === u.id), u.patch);
  for (const h of ops.hide) rows.find((r) => r.id === h.id).available = false;
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const i of ops.insert) rows.push({ id: `spoton-${slug(i.name)}`, image_url: null, ...i });
  return rows;
}

/* --------------------------------- output ---------------------------------- */

async function writeSnapshot(rows, scraped, categories) {
  const spotonCatByName = new Map(scraped.map((s) => [norm(s.name), s.spoton_category]));
  const items = rows
    .filter((r) => r.status !== 'draft')
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      description: r.description || '',
      price: r.price != null ? Number(r.price) : null,
      category: r.category,
      spoton_category: spotonCatByName.get(norm(r.name)) ?? null,
      dietary_flags: r.dietary_flags || [],
      available: r.available !== false,
      display_order: r.display_order ?? 0,
    }));
  const snapshot = {
    generated_at: new Date().toISOString(),
    source_url: ORDER_URL,
    note: 'Generated by scripts/sync-spoton-menu.mjs — do not edit by hand; run the "SpotOn menu sync" workflow instead.',
    categories,
    items,
  };
  await writeFile(SNAPSHOT_URL, `${JSON.stringify(snapshot, null, 2)}\n`);
  return items;
}

async function summarize(lines) {
  const text = lines.join('\n');
  console.log(`\n${text}`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

/* ---------------------------------- main ----------------------------------- */

async function main() {
  console.log(`SpotOn menu sync — ${DRY_RUN ? 'DRY RUN (no Supabase writes)' : 'live'}\n→ ${ORDER_URL}`);

  // 1) static HTML first (cheap), then a rendered pass if the menu wasn't there
  let blobs = [];
  try {
    blobs = extractJsonBlobs(await fetchStatic(ORDER_URL));
    console.log(`static fetch: ${blobs.length} JSON payload(s) found in HTML`);
  } catch (e) {
    console.warn(`static fetch failed: ${e.message}`);
  }
  let cats = detectMenu(blobs);

  let rendered = null;
  if (cats.reduce((n, c) => n + c.items.length, 0) < MIN_ITEMS) {
    console.log('menu not in static HTML — rendering with headless Chrome…');
    rendered = await fetchRendered(ORDER_URL);
    if (rendered) {
      const netParsed = rendered.netBlobs.map((b) => tryParse(b.text)).filter(Boolean);
      console.log(`rendered fetch: ${rendered.netBlobs.length} JSON response(s) captured`);
      cats = detectMenu([...blobs, ...netParsed, ...extractJsonBlobs(rendered.html)]);
    }
  }

  const total = cats.reduce((n, c) => n + c.items.length, 0);
  if (total < MIN_ITEMS) {
    console.error(`\nFAILED: only ${total} menu item(s) detected — refusing to write anything.`);
    if (rendered) {
      console.error('\n--- JSON responses seen (url · bytes) ---');
      for (const b of rendered.netBlobs.slice(0, 40)) console.error(`  ${b.url} · ${b.text.length}`);
      console.error('\n--- rendered page text (first 2500 chars) ---');
      console.error(rendered.bodyText.slice(0, 2500));
    }
    process.exit(1);
  }

  // 2) flatten to the site's shape
  const scraped = [];
  const categories = [];
  for (const c of cats) {
    const bucketGuess = bucketFor(c.category, strFrom(c.items[0] || {}, NAME_KEYS) || '');
    categories.push({ spoton: c.category, site: bucketGuess, items: c.items.length });
    for (const raw of c.items) {
      const name = strFrom(raw, NAME_KEYS);
      if (!name) continue;
      scraped.push({
        name,
        description: (strFrom(raw, DESC_KEYS, 800) || '').trim(),
        price: priceOf(raw),
        category: bucketFor(c.category, name),
        spoton_category: c.category,
        available: availOf(raw),
      });
    }
  }
  console.log('\ndetected menu:');
  for (const c of categories) console.log(`  ${c.spoton} → ${c.site} (${c.items} items)`);

  // 3) merge into Supabase (or the previous snapshot when unconfigured)
  let existing = [];
  if (sbConfigured) {
    existing = await sb('menu_items?select=*&order=display_order.asc');
  } else {
    console.warn('SUPABASE_URL/SERVICE_ROLE_KEY not set — merging against the previous snapshot only.');
    try { existing = JSON.parse(await readFile(SNAPSHOT_URL, 'utf8')).items || []; } catch { existing = []; }
  }
  const ops = planMerge(existing, scraped);

  if (sbConfigured && !DRY_RUN) {
    for (const u of ops.update) await sb(`menu_items?id=eq.${encodeURIComponent(u.id)}`, { method: 'PATCH', body: JSON.stringify(u.patch) });
    if (ops.insert.length) await sb('menu_items', { method: 'POST', body: JSON.stringify(ops.insert) });
    for (const h of ops.hide) await sb(`menu_items?id=eq.${encodeURIComponent(h.id)}`, { method: 'PATCH', body: JSON.stringify({ available: false }) });
  }

  // 4) snapshot = the post-merge menu (real rows when we wrote, simulated otherwise)
  const finalRows = sbConfigured && !DRY_RUN
    ? await sb('menu_items?select=*&order=display_order.asc')
    : simulateMerge(existing, ops);
  const items = await writeSnapshot(finalRows, scraped, categories);

  await summarize([
    `## SpotOn menu sync ${DRY_RUN ? '(dry run)' : ''}`,
    `- **${scraped.length}** items on SpotOn across **${categories.length}** categories`,
    `- updated: **${ops.update.length}** · added: **${ops.insert.length}** · hidden (left SpotOn): **${ops.hide.length}**`,
    `- snapshot now holds **${items.length}** items`,
    ...(ops.insert.length ? [`- new: ${ops.insert.map((i) => i.name).join(', ')}`] : []),
    ...(ops.hide.length ? [`- hidden: ${ops.hide.map((h) => h.name).join(', ')}`] : []),
    ...(sbConfigured ? [] : ['- ⚠️ Supabase not configured — snapshot only']),
    ...(DRY_RUN && sbConfigured ? ['- ⚠️ dry run — Supabase untouched'] : []),
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
