import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* Admin · Wish list: grouped top wishes, a by-kind chart, filters and
   search, triage that saves straight away (with a "Saved" toast), bulk
   marking, notes, CSV, and the empty / not-switched-on states. */

const db = vi.hoisted(() => ({ rows: [], error: null, updates: [], failUpdate: false }));
vi.mock('../src/lib/supabase.js', () => {
  const from = (table) => {
    let patch = null;
    const b = {
      select: () => b,
      order: () => b,
      limit: () => b,
      update: (p) => { patch = p; return b; },
      in: async (_col, ids) => {
        if (db.failUpdate) return { error: { message: 'offline' } };
        db.updates.push({ table, patch, ids });
        return { error: null };
      },
      then: (res, rej) => Promise.resolve(db.error ? { data: null, error: db.error } : { data: db.rows, error: null }).then(res, rej),
    };
    return b;
  };
  return { isSupabaseConfigured: true, supabase: { from } };
});

const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const WishList = (await import('../src/admin/managers/WishList.jsx')).default;
const { SCREENS } = await import('../src/admin/lib/nav.js');

const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
const SAMPLE = () => [
  { id: 'a', category: 'drink', text: 'Lavender latte', why: 'Had one in Portland', first_name: 'Maya', status: 'new', created_at: ago(2) },
  { id: 'b', category: 'drink', text: 'Lavender lattes please!', status: 'new', created_at: ago(30) },
  { id: 'c', category: 'drink', text: 'Iced lavender latte', status: 'considering', created_at: ago(60) },
  { id: 'd', category: 'pastry', text: 'Pistachio croissant', status: 'new', created_at: ago(5) },
  { id: 'e', category: 'food', text: 'Caprese panini', status: 'added', created_at: ago(200), admin_note: 'Trying it in November' },
  { id: 'f', category: 'other', text: 'Free crypto here', status: 'hidden', created_at: ago(1) },
];

const renderList = () => render(
  <MemoryRouter><ToastProvider><UnsavedProvider><WishList /></UnsavedProvider></ToastProvider></MemoryRouter>,
);

beforeEach(() => { db.rows = SAMPLE(); db.error = null; db.updates = []; db.failUpdate = false; });
afterEach(cleanup);

describe('admin Wish list', () => {
  it('is in the sidebar (one line, a Lucide icon, no emoji)', () => {
    const s = SCREENS.find((x) => x.to === '/admin/wishes');
    expect(s).toMatchObject({ label: 'Wish list', nav: 'Every day' });
    expect(typeof s.icon).toBe('object'); // a react-icons element, not an emoji string
  });

  it('says changes save straight away (no Publish), and groups the top wishes', async () => {
    renderList();
    expect(await screen.findByText(/save straight away; there’s nothing to Publish/)).toBeTruthy();
    const top = screen.getByRole('region', { name: 'Top wishes' });
    const first = within(top).getAllByRole('button')[0];
    expect(first.textContent).toMatch(/Lavender Latte/);
    expect(first.textContent).toMatch(/×3/);
    expect(top.textContent).not.toMatch(/crypto/i); // hidden spam never counts
    const bars = screen.getByRole('region', { name: 'Last 30 days' });
    expect(bars.textContent).toMatch(/Drink\s*3/);
    expect(bars.textContent).toMatch(/Pastry & treats\s*1/);
  });

  it('lists wishes newest first with kind, relative date and status, hiding spam by default', async () => {
    renderList();
    const cards = await screen.findAllByRole('listitem', { name: undefined });
    const texts = [...document.querySelectorAll('.wl-card__text')].map((n) => n.textContent);
    expect(texts).toEqual(['Lavender latte', 'Pistachio croissant', 'Lavender lattes please!', 'Iced lavender latte', 'Caprese panini']);
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = document.querySelector('.wl-card');
    expect(firstCard.textContent).toMatch(/Drink/);
    expect(firstCard.textContent).toMatch(/2 hours ago/);
    expect(firstCard.textContent).toMatch(/Had one in Portland/);
    expect(firstCard.textContent).toMatch(/from Maya/);
    expect(firstCard.textContent).toMatch(/×3 similar/);
  });

  it('filters by status and kind, and searches', async () => {
    renderList();
    await screen.findByText('Pistachio croissant');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'hidden' } });
    expect([...document.querySelectorAll('.wl-card__text')].map((n) => n.textContent)).toEqual(['Free crypto here']);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'pastry' } });
    expect([...document.querySelectorAll('.wl-card__text')].map((n) => n.textContent)).toEqual(['Pistachio croissant']);
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search wishes'), { target: { value: 'november' } }); // finds the private note
    expect([...document.querySelectorAll('.wl-card__text')].map((n) => n.textContent)).toEqual(['Caprese panini']);
  });

  it('tapping a top wish shows just that group', async () => {
    renderList();
    const top = await screen.findByRole('region', { name: 'Top wishes' });
    fireEvent.click(within(top).getAllByRole('button')[0]);
    expect(document.querySelectorAll('.wl-card')).toHaveLength(3);
    expect(screen.getByText(/Showing/).textContent).toMatch(/Lavender Latte ×3/);
    fireEvent.click(screen.getByRole('button', { name: /Show every wish/ }));
    expect(document.querySelectorAll('.wl-card')).toHaveLength(5);
  });

  it('a status change saves at once, with a "Saved" toast', async () => {
    renderList();
    await screen.findByText('Pistachio croissant');
    fireEvent.change(screen.getByLabelText('Status of “Pistachio croissant”'), { target: { value: 'added' } });
    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(db.updates).toEqual([{ table: 'wishes', patch: { status: 'added' }, ids: ['d'] }]);
    expect(screen.getByLabelText('Status of “Pistachio croissant”').value).toBe('added');
  });

  it('a failed save puts it back and says so', async () => {
    db.failUpdate = true;
    renderList();
    await screen.findByText('Pistachio croissant');
    fireEvent.change(screen.getByLabelText('Status of “Pistachio croissant”'), { target: { value: 'not_now' } });
    expect(await screen.findByText(/didn’t save/)).toBeTruthy();
    expect(screen.getByLabelText('Status of “Pistachio croissant”').value).toBe('new');
  });

  it('bulk: select several and hide them as spam', async () => {
    renderList();
    await screen.findByText('Pistachio croissant');
    fireEvent.click(screen.getByLabelText('Select “Lavender lattes please!”'));
    fireEvent.click(screen.getByLabelText('Select “Iced lavender latte”'));
    expect(screen.getByText('2 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Hide as spam/ }));
    await waitFor(() => expect(db.updates).toHaveLength(1));
    expect(db.updates[0]).toEqual({ table: 'wishes', patch: { status: 'hidden' }, ids: ['b', 'c'] });
    expect(await screen.findByText(/Saved: 2 marked “Hidden \(spam\)”/)).toBeTruthy();
    expect([...document.querySelectorAll('.wl-card__text')].map((n) => n.textContent)).not.toContain('Iced lavender latte');
  });

  it('adds a private note', async () => {
    renderList();
    await screen.findByText('Pistachio croissant');
    const card = screen.getByText('Pistachio croissant').closest('li');
    fireEvent.click(within(card).getByRole('button', { name: 'Add a private note' }));
    fireEvent.change(within(card).getByLabelText(/Private note/), { target: { value: 'Ask the bakery' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('Saved: note updated')).toBeTruthy();
    expect(db.updates[0]).toEqual({ table: 'wishes', patch: { admin_note: 'Ask the bakery' }, ids: ['d'] });
    expect(card.textContent).toMatch(/Ask the bakery/);
  });

  it('exports the shown wishes as CSV', async () => {
    URL.createObjectURL = URL.createObjectURL || (() => '');
    URL.revokeObjectURL = URL.revokeObjectURL || (() => {});
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderList();
    await screen.findByText('Pistachio croissant');
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
    expect(created).toHaveBeenCalledTimes(1);
    expect(created.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalled();
  });

  it('empty: a friendly note', async () => {
    db.rows = [];
    renderList();
    expect(await screen.findByText('No wishes yet')).toBeTruthy();
    expect(screen.getByText(/Share the menu page and they’ll roll in/)).toBeTruthy();
  });

  it('before the migration runs: says how to switch it on', async () => {
    db.error = { code: 'PGRST205', message: 'Could not find the table public.wishes in the schema cache' };
    renderList();
    expect(await screen.findByText(/isn’t switched on yet/)).toBeTruthy();
    expect(screen.getByText(/2026-10-19-wishes\.sql/)).toBeTruthy();
  });
});
