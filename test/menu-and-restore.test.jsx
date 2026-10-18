import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { idempotentSchema, dataSql } from '../scripts/build-restore-sql.mjs';

const ITEMS = [
  { id: 'a', name: 'Pictured Latte', category: 'specialty', price: 5, image_url: 'https://example.com/latte.jpg', available: true },
  { id: 'b', name: 'Plain Tea', category: 'specialty', price: 3, image_url: null, available: true },
  { id: 'c', name: 'Plain Muffin', category: 'pastry', price: 4, image_url: null, available: true },
];
vi.mock('../src/lib/menuService.js', async (orig) => ({
  ...(await orig()),
  getMenu: () => Promise.resolve(ITEMS),
}));

describe('the menu with some photos', () => {
  it('frames the pictured items and lists the rest — no placeholder frames', async () => {
    const { default: MenuBlock } = await import('../src/components/sections/MenuBlock.jsx');
    const { container } = render(<MemoryRouter><MenuBlock /></MemoryRouter>);
    await screen.findByText('Pictured Latte');
    expect(container.querySelectorAll('.product')).toHaveLength(1);
    expect(container.querySelector('.product img').getAttribute('src')).toContain('latte.jpg');
    const listed = [...container.querySelectorAll('.menu-item__name')].map((n) => n.textContent);
    expect(listed).toEqual(['Plain Tea', 'Plain Muffin']);
    expect(container.querySelector('.product__motif')).toBeNull();
  });
});

describe('the one-file restore', () => {
  it('makes schema.sql re-runnable', () => {
    const sql = idempotentSchema('create trigger t_upd before update on t\n  for each row execute function f();\ncreate policy "public read t"\n  on t for select using (true);');
    expect(sql).toMatch(/create or replace trigger t_upd/);
    expect(sql).toMatch(/drop policy if exists "public read t" on t;\ncreate policy "public read t"/);
  });

  it('inserts backup rows without clobbering existing ones, parents first', () => {
    const sql = dataSql({ tables: { sections: [{ id: 's1', page_slug: 'home' }], pages: [{ slug: 'home', title: 'It’s $rows$ here' }], events: [] } });
    expect(sql.indexOf('insert into pages')).toBeLessThan(sql.indexOf('insert into sections'));
    expect(sql).not.toMatch(/insert into events/);
    expect(sql).toMatch(/\$rows_\$/); // a quote tag that the data can't close early
    expect(sql.match(/on conflict do nothing;/g)).toHaveLength(2);
  });
});
