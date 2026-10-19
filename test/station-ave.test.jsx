import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { track } = await import('../src/lib/analytics.js');
const { orderBusinesses } = await import('../src/lib/localBusinesses.js');
const { buildWalk } = await import('../src/lib/stationAve.js');

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

const ROWS = [
  { id: 'far', name: 'Top of the Ave', category: 'retail', address: '622 Station Ave', display_order: 0 },
  { id: 'nowhere', name: 'No Address Co', category: 'other', address: '', display_order: 1 },
  { id: 'next', name: 'Next Door', category: 'restaurant', address: '512 Station Ave', display_order: 2, blurb: 'Pasta.', we_love: 'The rigatoni', url: 'https://next.example/' },
  { id: 'kings', name: 'Kings Hwy Spot', category: 'cafe', address: '12 Kings Hwy', display_order: 3 },
  { id: 'across', name: 'Across', category: 'cafe', address: '531 Station Ave', display_order: 4 },
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
    // neighbouring storefronts never share a facade
    const shops = walk.filter((s) => s.kind === 'shop');
    shops.slice(1).forEach((s, i) => expect(s.building.look).not.toBe(shops[i].building.look));
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
});
