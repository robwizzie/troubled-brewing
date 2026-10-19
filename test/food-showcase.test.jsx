import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const ITEMS = [
  { id: 'a', name: 'Hot Latte', category: 'espresso', price: 4, image_url: 'https://x/media/1-hot-latte-cutout.webp', available: true },
  { id: 'b', name: 'Scone', category: 'pastry', price: 3.5, image_url: 'https://x/media/2-scone-cutout.webp', available: true },
  { id: 'c', name: 'Plain Photo Muffin', category: 'pastry', price: 4, image_url: 'https://x/media/muffin.jpg', available: true },
  { id: 'd', name: 'Drip Coffee', category: 'espresso', price: 2.65, image_url: null, available: true },
];
vi.mock('../src/lib/menuService.js', async (orig) => ({
  ...(await orig()),
  getMenu: () => Promise.resolve(ITEMS),
}));

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { track } = await import('../src/lib/analytics.js');
const { SPOTON_ORDER_URL } = await import('../src/lib/config.js');

const load = async () => (await import('../src/components/sections/FoodShowcase.jsx')).default;

describe('the food shelf', () => {
  it('stands every cutout on the shelf, in menu order, each linking to order it on SpotOn', async () => {
    const FoodShowcase = await load();
    const { container } = render(<MemoryRouter><FoodShowcase /></MemoryRouter>);
    await screen.findByText('Hot Latte');
    const names = [...container.querySelectorAll('.showcase__tag-name')].map((n) => n.textContent);
    expect(names).toEqual(['Hot Latte', 'Scone']); // cutouts only; no plain photo, no photo-less item
    const link = container.querySelector('.showcase__link');
    expect(link.getAttribute('href')).toBe(SPOTON_ORDER_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toMatch(/^Order Hot Latte on SpotOn \(opens in a new tab\)/);
    expect(screen.getByText('Tap anything to order it on SpotOn.')).toBeTruthy();
    expect(screen.getByText('$3.50')).toBeTruthy();
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith('order_now_click', { location: 'food_shelf', item: 'Hot Latte' });
  });

  it('filters by category and can let ordinary photos in', async () => {
    const FoodShowcase = await load();
    const { container } = render(<MemoryRouter><FoodShowcase data={{ include_photos: true }} /></MemoryRouter>);
    await within(container).findByText('Plain Photo Muffin');
    fireEvent.click(within(container).getByRole('button', { name: 'Pastries' }));
    const names = [...container.querySelectorAll('.showcase__tag-name')].map((n) => n.textContent);
    expect(names).toEqual(['Scone', 'Plain Photo Muffin']);
  });

  it('draws nothing when no item has a photo yet', async () => {
    const FoodShowcase = await load();
    const { container } = render(<MemoryRouter><FoodShowcase data={{ items: ['Drip Coffee'] }} /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('.showcase')).toBeNull();
  });
});
