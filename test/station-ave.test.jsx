import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { track } = await import('../src/lib/analytics.js');
const { orderBusinesses, hasWebsite, streetName } = await import('../src/lib/localBusinesses.js');
const { buildWalk } = await import('../src/lib/stationAve.js');

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

const site = (id) => `https://${id}.example/`;
const ROWS = [
  { id: 'far', name: 'Top of the Ave', category: 'retail', address: '622 Station Ave', display_order: 0, url: site('far') },
  { id: 'nowhere', name: 'No Address Co', category: 'other', address: '', display_order: 1, url: site('nowhere') },
  { id: 'next', name: 'Next Door', category: 'restaurant', address: '512 Station Ave', display_order: 2, blurb: 'Pasta.', we_love: 'The rigatoni', url: 'https://next.example/' },
  { id: 'kings', name: 'Kings Hwy Spot', category: 'cafe', address: '12 Kings Hwy', display_order: 3, url: site('kings') },
  { id: 'across', name: 'Across', category: 'cafe', address: '531 Station Ave', display_order: 4, url: site('across') },
  { id: 'nosite', name: 'No Website Deli', category: 'other', address: '518 Station Ave', display_order: 5, url: '' },
];

describe('the Station Ave walk', () => {
  it('lays storefronts out by street number, our door at 514, off-Ave and unaddressed rows last', () => {
    const walk = buildWalk(orderBusinesses(ROWS, 'street'));
    const doors = walk.filter((s) => s.kind === 'shop' || s.kind === 'us').map((s) => s.id);
    expect(doors).toEqual(['next', 'us', 'across', 'far', 'kings', 'nowhere']);
    // a street sign first, a cross street at the 600 block, an "around town" break before the off-Ave rows
    expect(walk[0].kind).toBe('sign');
    expect(walk.find((s) => s.kind === 'cross' && s.block === 600)).toBeTruthy();
    const around = walk.findIndex((s) => s.id === 'cross-around');
    expect(around).toBeGreaterThan(walk.findIndex((s) => s.id === 'far'));
    expect(around).toBeLessThan(walk.findIndex((s) => s.id === 'kings'));
    // the passage between 512 and our door, and the street tree just past it
    const col = (id) => walk.find((s) => s.id === id).col;
    expect(col('alley-us')).toBe(col('next') + 1);
    expect(col('tree-us')).toBe(col('us') + 1);
    // neighbouring storefronts on the same side never share a facade
    const shops = walk.filter((s) => s.kind === 'shop' && s.side === 'main');
    shops.slice(1).forEach((s, i) => expect(s.building.look).not.toBe(shops[i].building.look));
  });

  it('puts the odd numbers across the road, under the door they face', () => {
    const walk = buildWalk(orderBusinesses(ROWS, 'street'));
    const by = (id) => walk.find((s) => s.id === id);
    expect(walk.across).toBe(true);
    expect(by('next').side).toBe('main');
    expect(by('us').side).toBe('main');
    expect(by('far').side).toBe('main');
    expect(by('across').side).toBe('across');
    // 531 has no odd neighbour; it shares the column of the nearest even door in its block (514)
    expect(by('across').col).toBe(by('us').col);
    // off-Ave rows stay on the top row, and the far side gets unnamed buildings so it reads as a street
    expect(by('kings').side).toBe('main');
    expect(walk.some((s) => s.kind === 'filler' && s.side === 'across')).toBe(true);
    // no odd-numbered shops → no far-side row at all
    const evenOnly = buildWalk(orderBusinesses(ROWS.filter((r) => r.id !== 'across'), 'street'));
    expect(evenOnly.across).toBe(false);
    expect(evenOnly.some((s) => s.side === 'across')).toBe(false);
  });

  it('only lists businesses that have a website — in the street and the grid', async () => {
    expect(hasWebsite({ url: 'https://x.example/' })).toBe(true);
    expect(hasWebsite({ url: '' })).toBe(false);
    expect(hasWebsite({ url: '   ' })).toBe(false);
    expect(hasWebsite({})).toBe(false);
    expect(orderBusinesses(ROWS, 'street').map((r) => r.id)).not.toContain('nosite');
    expect(orderBusinesses(ROWS, 'manual').map((r) => r.id)).not.toContain('nosite');
    expect(streetName('12 Kings Hwy, Haddon Heights, NJ')).toBe('Kings Hwy');

    const ds = await import('../src/lib/dataService.js');
    vi.spyOn(ds, 'getLocalBusinesses').mockResolvedValue(ROWS);
    const Grid = (await import('../src/components/sections/LocalBusinessesGrid.jsx')).default;
    render(<MemoryRouter><Grid /></MemoryRouter>);
    await screen.findByRole('button', { name: /Next Door, 512 Station Ave/ });
    expect(screen.queryByRole('button', { name: /No Website Deli/ })).toBeNull();
    cleanup();
    render(<MemoryRouter><Grid data={{ layout: 'grid' }} /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Next Door' });
    expect(screen.queryByText('No Website Deli')).toBeNull();
  });

  it('leaves our door out when asked, and copes with an empty list', () => {
    expect(buildWalk(orderBusinesses(ROWS, 'street'), { showUs: false }).some((s) => s.kind === 'us')).toBe(false);
    const empty = buildWalk([]);
    expect(empty.filter((s) => s.kind === 'shop')).toHaveLength(0);
    expect(empty.some((s) => s.kind === 'us')).toBe(true);
  });

  it('opens a storefront’s details under the street, with new-tab links, and steps to the next door', async () => {
    const ds = await import('../src/lib/dataService.js');
    vi.spyOn(ds, 'getLocalBusinesses').mockResolvedValue(ROWS);
    const Grid = (await import('../src/components/sections/LocalBusinessesGrid.jsx')).default;
    render(<MemoryRouter><Grid /></MemoryRouter>);

    const shop = await screen.findByRole('button', { name: /Next Door, 512 Station Ave/ });
    expect(screen.getByText(/Tap a storefront/)).toBeTruthy();
    fireEvent.click(shop);
    expect(shop.getAttribute('aria-pressed')).toBe('true');

    const detail = document.getElementById('ave-detail');
    const card = within(detail);
    expect(card.getByRole('heading', { name: 'Next Door' })).toBeTruthy();
    expect(card.getByText('Pasta.')).toBeTruthy();
    expect(card.getByText('We send people for')).toBeTruthy();
    const site = card.getByRole('link', { name: /Visit their site/ });
    expect(site.getAttribute('href')).toBe('https://next.example/');
    expect(site.getAttribute('target')).toBe('_blank');
    const dir = card.getByRole('link', { name: /Directions/ });
    expect(dir.getAttribute('target')).toBe('_blank');
    expect(decodeURIComponent(dir.getAttribute('href'))).toContain('Next Door 512 Station Ave, Haddon Heights, NJ 08035');
    fireEvent.click(site);
    expect(track).toHaveBeenCalledWith('outbound_click', { dest: 'local_business', name: 'Next Door' });

    // the next door along is our own
    fireEvent.click(card.getByRole('button', { name: /Next door/ }));
    expect(within(detail).getByRole('heading', { name: 'Trouble Brewing Coffee House' })).toBeTruthy();

    // arrow keys walk the storefronts
    shop.focus();
    fireEvent.keyDown(shop, { key: 'ArrowRight' });
    expect(document.activeElement.dataset.stop).toBe('us');

    // close puts the hint back
    fireEvent.click(within(detail).getByRole('button', { name: 'Close details' }));
    expect(screen.getByText(/Tap a storefront/)).toBeTruthy();
  });

  it('slides the street to keep the selected storefront in view when stepping door to door', async () => {
    const ds = await import('../src/lib/dataService.js');
    vi.spyOn(ds, 'getLocalBusinesses').mockResolvedValue(ROWS);
    const Grid = (await import('../src/components/sections/LocalBusinessesGrid.jsx')).default;
    render(<MemoryRouter><Grid /></MemoryRouter>);
    const shop = await screen.findByRole('button', { name: /Next Door, 512 Station Ave/ });
    const scroller = document.querySelector('.ave__scroller');
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 400 });
    Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 3000 });
    scroller.getBoundingClientRect = () => ({ left: 0, width: 400, top: 0, height: 300, right: 400, bottom: 300 });
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo;
    // pretend our door sits 900px along the street, 200px wide
    const ours = document.querySelector('[data-stop="us"]');
    ours.getBoundingClientRect = () => ({ left: 900, width: 200, top: 0, height: 300, right: 1100, bottom: 300 });

    // with motion allowed, the street glides
    const realMatchMedia = window.matchMedia;
    window.matchMedia = (q) => ({ ...realMatchMedia(q), matches: false });
    fireEvent.click(shop);
    fireEvent.click(within(document.getElementById('ave-detail')).getByRole('button', { name: /Next door/ }));
    // centred: 900 - (400 - 200) / 2
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 800, behavior: 'smooth' });
    expect(ours.getAttribute('aria-pressed')).toBe('true');
    expect(ours.closest('li').className).toContain('is-selected');

    // reduced motion (the test default): it jumps instead, clamped at the start
    window.matchMedia = realMatchMedia;
    fireEvent.click(within(document.getElementById('ave-detail')).getByRole('button', { name: /Previous door/ }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
    expect(shop.closest('li').className).toContain('is-selected');
  });
});
