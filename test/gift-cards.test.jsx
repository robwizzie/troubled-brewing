import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/lib/analytics.js', async (orig) => ({ ...(await orig()), track: vi.fn() }));

const App = (await import('../src/App.jsx')).default;
const { GIFT_CARD_URL } = await import('../src/lib/config.js');
const { SECTIONS, PAGES } = await import('../src/lib/seed.js');
const seo = await import('../src/lib/seo.js');
const jsonld = await import('../src/lib/jsonld.js');
const seed = await import('../src/lib/seed.js');
const { SEO_ROUTES, sitemapXml } = seo;
const { buildSeoFiles } = await import('../scripts/seo-build-plugin.mjs');
const { SECTION_RENDERERS, SECTION_LABELS } = await import('../src/components/sections/registry.js');
const { SECTION_EDITOR_SCHEMAS } = await import('../src/admin/editors/schemas.js');
const { PAGE_NAMES } = await import('../src/admin/lib/nav.js');
const GiftCards = (await import('../src/components/sections/GiftCards.jsx')).default;
const CTA = (await import('../src/components/sections/CTA.jsx')).default;

/* "Give someone Trouble": the /gift-cards page, its section type, and the
   one purchase link everything on it points at. */

const ROOT = resolve(__dirname, '..');
const ui = (el) => render(<MemoryRouter>{el}</MemoryRouter>);
const seedData = () => SECTIONS['gift-cards'][0].data;

afterEach(cleanup);

describe('the purchase link', () => {
  it("goes to the shop's e-gift card store", () => {
    expect(GIFT_CARD_URL).toBe('https://troublebrewingcoffeehouse.shop.securetree.com');
  });

  it('the button and every occasion card open that link in a new tab', () => {
    ui(<GiftCards data={seedData()} />);
    const buy = screen.getByRole('link', { name: /^buy an e-gift card/i });
    expect(buy.getAttribute('href')).toBe(GIFT_CARD_URL);
    expect(buy.getAttribute('target')).toBe('_blank');
    expect(buy.getAttribute('rel')).toMatch(/noopener/);
    const cards = screen.getAllByRole('listitem').map((li) => within(li).getByRole('link'));
    expect(cards).toHaveLength(4);
    for (const a of cards) {
      expect(a.getAttribute('href')).toBe(GIFT_CARD_URL);
      expect(a.getAttribute('target')).toBe('_blank');
    }
  });

  it('an owner-set https link wins; anything else falls back to the default', () => {
    ui(<GiftCards data={{ ...seedData(), button_url: 'https://example.com/egift' }} />);
    expect(screen.getByRole('link', { name: /^buy an e-gift card/i }).getAttribute('href')).toBe('https://example.com/egift');
    cleanup();
    ui(<GiftCards data={{ ...seedData(), button_url: 'javascript:alert(1)' }} />);
    expect(screen.getByRole('link', { name: /^buy an e-gift card/i }).getAttribute('href')).toBe(GIFT_CARD_URL);
  });
});

describe('the page content', () => {
  it('hero line, one buy button, the how-it-works line and the four occasions', () => {
    ui(<GiftCards data={seedData()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Give someone Trouble' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /^buy an e-gift card/i })).toHaveLength(1);
    expect(screen.getByText("Pick an amount, add a note, and we'll email it.")).toBeTruthy();
    for (const o of ['Birthday', 'Thank you', 'Teacher gift', 'Just because']) expect(screen.getByText(o)).toBeTruthy();
  });

  it('makes no claims about amounts, bonuses or expiry', () => {
    const { container } = ui(<GiftCards data={seedData()} />);
    expect(container.textContent).not.toMatch(/\$\s?\d|\bbonus\b|\bexpir|\bnever expire|\bfree\b|% off/i);
  });

  it('an occasion with no label is hidden', () => {
    ui(<GiftCards data={{ ...seedData(), occasion_2_label: '', occasion_3_label: '' }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('wiring', () => {
  it('is a registered, editable section type, and the editor knows the page', () => {
    expect(SECTION_RENDERERS.gift_cards).toBeTruthy();
    expect(SECTION_LABELS.gift_cards).toBeTruthy();
    const fields = new Set(SECTION_EDITOR_SCHEMAS.gift_cards.fields.map((f) => f.name));
    for (const k of Object.keys(seedData())) expect(fields.has(k), k).toBe(true);
    expect(PAGE_NAMES['gift-cards']).toBe('Gift Cards');
  });

  it('has its own SEO route, page meta fallback, OG card, sitemap entry and prerendered HTML', () => {
    const route = SEO_ROUTES.find((r) => r.path === '/gift-cards');
    expect(route).toBeTruthy();
    expect(PAGES['gift-cards'].title).toBe(route.title);
    expect(existsSync(resolve(ROOT, 'public/og/gift-cards.jpg'))).toBe(true);
    expect(sitemapXml('https://troublebrewingcoffeehouse.com')).toContain('<loc>https://troublebrewingcoffeehouse.com/gift-cards</loc>');
    const files = buildSeoFiles({ template: readFileSync(resolve(ROOT, 'index.html'), 'utf8'), seo, jsonld, seed, siteUrl: 'https://troublebrewingcoffeehouse.com', base: '/' });
    expect(files['gift-cards.html']).toContain('<title>Gift Cards | Trouble Brewing Coffee House, Haddon Heights</title>');
  });

  it('renders from seed at /gift-cards, with a "More" nav entry and a footer link', async () => {
    render(<MemoryRouter initialEntries={['/gift-cards']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Give someone Trouble' })).toBeTruthy();
    const primary = screen.getByRole('navigation', { name: /primary/i });
    expect(within(primary).getByRole('menuitem', { name: 'Gift Cards' }).getAttribute('href')).toBe('/gift-cards'); // under "More"
    const footer = screen.getByRole('navigation', { name: /footer/i });
    expect(within(footer).getByRole('link', { name: 'Gift Cards' }).getAttribute('href')).toBe('/gift-cards');
  });

  it('the menu page’s order band carries a small gift-card link', () => {
    const cta = SECTIONS.menu.find((s) => s.type === 'cta');
    ui(<CTA data={cta.data} />);
    expect(screen.getByRole('link', { name: /send a gift card/i }).getAttribute('href')).toBe('/gift-cards');
  });

  it('the migration inserts the page and section idempotently, mirroring the seed', () => {
    const sql = readFileSync(resolve(ROOT, 'supabase/migrations/2026-10-19-gift-cards-page.sql'), 'utf8');
    expect(sql).toMatch(/insert into pages[\s\S]*where not exists \(select 1 from pages where slug = 'gift-cards'\)/);
    expect(sql).toMatch(/insert into sections[\s\S]*where not exists \(select 1 from sections where page_slug = 'gift-cards' and type = 'gift_cards'\)/);
    const json = sql.match(/\$j\$(\{"eyebrow"[\s\S]*?)\$j\$/)[1];
    expect(JSON.parse(json)).toEqual(seedData());
  });
});
