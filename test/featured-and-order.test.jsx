import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { track } = await import('../src/lib/analytics.js');
const { SPOTON_ORDER_URL } = await import('../src/lib/config.js');
const { resolveFeatured } = await import('../src/lib/featured.js');
const { orderUrlFor } = await import('../src/lib/order.js');
const { CONTENT_BLOCKS, MENU_ITEMS } = await import('../src/lib/seed.js');

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const MENU = [
  { id: 1, name: 'Banana Split Coffee', category: 'specialty', price: 6.5, description: 'Old signature', available: false },
  { id: 2, name: 'Iced Chai Latte', category: 'specialty', price: 5.25, description: 'Spiced chai over ice.', available: true },
  { id: 3, name: 'Iced Matcha Latte', category: 'specialty', price: 5.75, description: '', available: true },
  { id: 4, name: 'Lemonade', category: 'specialty', price: 3.5, image_url: 'https://x/media/lemonade-cutout.webp', available: true },
  { id: 5, name: 'Scone', category: 'pastry', price: 3.5, available: true },
];

describe('the featured drink is a real, available menu item', () => {
  it('pulls a named item live, letting the block override only the words and photo', () => {
    const d = resolveFeatured({ item: 'Iced Matcha Latte', description: 'Iced matcha over cold milk.', name: 'Ignored', price: '99' }, MENU);
    expect(d).toMatchObject({ name: 'Iced Matcha Latte', price: 5.75, description: 'Iced matcha over cold milk.', image_url: '' });
    expect(d.item.id).toBe(3);
    // blank block fields fall through to the menu's own
    expect(resolveFeatured({ item: 'Iced Chai Latte', description: '  ' }, MENU).description).toBe('Spiced chai over ice.');
  });

  it('falls back to the best available specialty item (a pictured one first) when the named item is off or missing', () => {
    for (const item of ['Banana Split Coffee', 'Honey Almond Latte']) {
      const d = resolveFeatured({ item, description: 'Words about a different drink' }, MENU);
      expect(d.name).toBe('Lemonade');
      // the block's words were written about the other drink — not applied
      expect(d.description).toBe('');
    }
  });

  it('treats an old manual name that is switched off on the menu the same way', () => {
    const d = resolveFeatured({ name: 'Banana Split Coffee', price: '6.50', description: 'Dessert in a cup' }, MENU);
    expect(d.name).toBe('Lemonade');
    expect(d.item.available).toBe(true);
  });

  it('keeps a manual drink that simply is not on the menu', () => {
    const d = resolveFeatured({ name: 'Pumpkin Cold Foam', price: '6', description: 'Seasonal.' }, MENU);
    expect(d).toMatchObject({ name: 'Pumpkin Cold Foam', price: '6', description: 'Seasonal.', item: null });
  });

  it('the seed default names a real available item on the bundled menu', () => {
    const d = resolveFeatured(CONTENT_BLOCKS.featured_drink, MENU_ITEMS);
    expect(d.name).toBe('Iced Matcha Latte');
    expect(d.item.available).not.toBe(false);
  });

  it('the section renders the live item and its real price', async () => {
    const FeaturedDrink = (await import('../src/components/sections/FeaturedDrink.jsx')).default;
    render(<FeaturedDrink />);
    expect(await screen.findByRole('heading', { name: 'Iced Matcha Latte' })).toBeTruthy();
    const price = MENU_ITEMS.find((m) => m.name === 'Iced Matcha Latte').price;
    expect(screen.getByText(`$${Number(price).toFixed(2)}`)).toBeTruthy();
    expect(screen.queryByText(/Banana Split/)).toBeNull();
  });

  it("the immersive hero's Today's Special defaults to the featured drink, not a made-up one", async () => {
    const Hero = (await import('../src/components/sections/ImmersiveGalleryHero.jsx')).default;
    const { container } = render(<MemoryRouter><Hero /></MemoryRouter>);
    await waitFor(() => expect(container.querySelector('.ig2-note__special')?.textContent).toBe('Iced Matcha Latte'));
    expect(container.textContent).not.toMatch(/Honey Almond/);
  });

  it('no house list or default names an unavailable item', () => {
    const off = new Set(MENU_ITEMS.filter((m) => m.available === false).map((m) => m.name));
    const named = [CONTENT_BLOCKS.featured_drink.item, ...CONTENT_BLOCKS.staff_picks.items.map((p) => p.value)];
    named.forEach((n) => {
      expect(off.has(n)).toBe(false);
      expect(MENU_ITEMS.some((m) => m.name === n)).toBe(true);
    });
  });
});

describe('products link to SpotOn', () => {
  it('orderUrlFor uses a per-item link when there is one, else the store page', () => {
    expect(orderUrlFor({ name: 'X' })).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(orderUrlFor({ name: 'X', order_url: 'https://order.example/x' })).toBe('https://order.example/x');
    expect(orderUrlFor(null)).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
  });

  it('a product card is one link to order it, in a new tab, tracked, keeping its menu anchor', async () => {
    const ProductCard = (await import('../src/components/ProductCard.jsx')).default;
    const { container } = render(<ProductCard item={{ id: 1, name: 'Hot Latte', price: 4, description: '' }} />);
    const link = screen.getByRole('link', { name: 'Order Hot Latte on SpotOn (opens in a new tab)' });
    expect(link.getAttribute('href')).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(container.querySelector('article#item-hot-latte')).toBeTruthy();
    expect(container.querySelector('.product__order').textContent).toMatch(/Order on SpotOn/);
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith('order_now_click', { location: 'product_card', item: 'Hot Latte' });
  });

  it('a plain menu-list row names its item as the same order link', async () => {
    const MenuBlock = (await import('../src/components/sections/MenuBlock.jsx')).default;
    render(<MemoryRouter><MenuBlock data={{ layout: 'list' }} /></MemoryRouter>);
    const link = await screen.findByRole('link', { name: 'Order Drip Coffee on SpotOn (opens in a new tab)' });
    expect(link.getAttribute('href')).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toBe('Drip Coffee');
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith('order_now_click', { location: 'menu_list', item: 'Drip Coffee' });
  });
});

describe('Local Love directions', () => {
  it('adds the town to a bare street address, and prefers a maps_url', async () => {
    const ds = await import('../src/lib/dataService.js');
    const spy = vi.spyOn(ds, 'getLocalBusinesses').mockResolvedValue([
      { id: 'a', name: 'Next Door', address: '512 Station Ave', url: 'https://example.com/0', display_order: 0 },
      { id: 'b', name: 'Already Full', address: '520 Station Ave, Haddon Heights, NJ', url: 'https://example.com/1', display_order: 1 },
      { id: 'c', name: 'Has Link', address: '530 Station Ave', maps_url: 'https://maps.app.goo.gl/abc', url: 'https://example.com/2', display_order: 2 },
    ]);
    const Grid = (await import('../src/components/sections/LocalBusinessesGrid.jsx')).default;
    const { container } = render(<Grid data={{ layout: 'grid' }} />);
    await screen.findByText('Next Door');
    const hrefs = [...container.querySelectorAll('.neighbor__map')].map((a) => decodeURIComponent(a.getAttribute('href')));
    expect(hrefs).toContain('https://www.google.com/maps/search/?api=1&query=Next Door 512 Station Ave, Haddon Heights, NJ 08035');
    expect(hrefs).toContain('https://www.google.com/maps/search/?api=1&query=Already Full 520 Station Ave, Haddon Heights, NJ');
    expect(hrefs).toContain('https://maps.app.goo.gl/abc');
    spy.mockRestore();
  });
});
