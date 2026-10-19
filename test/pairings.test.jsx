import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* "Goes great with" pairings are the staff's own picks: one content_blocks
   row the owner publishes. Nothing shows on the site until there is one,
   pairings whose items left the menu are hidden quietly, and the admin only
   writes on Publish. The Supabase client is a small recording fake. */

const fake = vi.hoisted(() => {
  const state = { db: {}, log: [] };
  function from(table) {
    let op = 'select';
    const filters = [];
    const rows = () => (state.db[table] || []).filter((r) => filters.every(([c, v]) => String(r[c]) === String(v)));
    const run = (single) => {
      const r = op === 'select' ? rows() : [];
      return { data: single ? r[0] ?? null : r, error: null };
    };
    const b = {
      select: () => b,
      upsert: (p, o) => { op = 'upsert'; state.log.push({ table, op, payload: p, opts: o }); return b; },
      eq: (c, v) => { filters.push([c, v]); return b; },
      order: () => b,
      maybeSingle: async () => run(true),
      then: (res, rej) => Promise.resolve(run(false)).then(res, rej),
    };
    return b;
  }
  return { state, supabase: { from } };
});
vi.mock('../src/lib/supabase.js', () => ({ isSupabaseConfigured: true, supabase: fake.supabase }));
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));

const {
  resolvePairings, pairingFor, pairingsFor, pairingLine, addPair, removePair, movePair,
  missingFromMenu, pairingIdeas, isDrink, isTreat,
} = await import('../src/lib/pairings.js');
const { orderUrlFor } = await import('../src/lib/order.js');
const { CONTENT_BLOCKS, MENU_ITEMS } = await import('../src/lib/seed.js');

const MENU = [
  { id: 1, name: 'Iced Chai Latte', category: 'specialty', spoton_category: 'Iced Teas & Other', price: 5.25, available: true, display_order: 1 },
  { id: 2, name: 'Latte', category: 'espresso', spoton_category: 'Coffee & Espresso Drinks', price: 4.5, available: true, display_order: 2 },
  { id: 3, name: 'Lemonade', category: 'specialty', spoton_category: 'Iced Teas & Other', price: 3.5, available: true, display_order: 3 },
  { id: 4, name: 'Muffin', category: 'pastry', spoton_category: 'Bakery', price: 3.75, available: true, display_order: 4 },
  { id: 5, name: 'Scone', category: 'pastry', spoton_category: 'Bakery', price: 3.5, available: true, display_order: 5 },
  { id: 6, name: 'Caprese Melt', category: 'food', spoton_category: 'Lunch', price: 11, available: true, display_order: 6 },
  { id: 7, name: 'Bottled Water', category: 'food', spoton_category: 'Grab n Go', price: 2, available: true, display_order: 7 },
  { id: 8, name: 'Banana Split Coffee', category: 'specialty', price: 6.5, available: false, display_order: 8 },
];
const live = MENU.filter((m) => m.available !== false);
const block = (pairs, enabled = true) => ({ enabled, pairs });

beforeEach(() => {
  fake.state.db = {};
  fake.state.log.length = 0;
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('reading pairings', () => {
  it('finds a drink’s pairing by name, ignoring case and stray spaces', () => {
    const resolved = resolvePairings(block([{ drink: 'iced CHAI latte ', with: 'muffin', note: 'The spice wakes up the blueberry', by: 'Cat' }]), live);
    expect(resolved).toHaveLength(1);
    const p = pairingFor('ICED CHAI LATTE', resolved);
    expect(p.drink.id).toBe(1);
    expect(p.with.id).toBe(4); // the real menu row, so it has a real order link
    expect(p).toMatchObject({ note: 'The spice wakes up the blueberry', by: 'Cat' });
    expect(pairingLine(p)).toBe('Goes great with Muffin');
    expect(pairingFor('Latte', resolved)).toBeNull();
    expect(pairingFor('', resolved)).toBeNull();
  });

  it('keeps every pairing for a drink, in the owner’s order, and drops repeats', () => {
    const resolved = resolvePairings(block([
      { drink: 'Latte', with: 'Scone' },
      { drink: 'Latte', with: 'Muffin' },
      { drink: 'latte', with: 'scone' },
    ]), live);
    expect(pairingsFor('latte', resolved).map((p) => p.with.name)).toEqual(['Scone', 'Muffin']);
  });

  it('quietly hides a pairing when either item is missing or switched off', () => {
    const resolved = resolvePairings(block([
      { drink: 'Banana Split Coffee', with: 'Muffin' }, // switched off
      { drink: 'Latte', with: 'Pumpkin Bread' }, // gone from the menu
      { drink: 'Lemonade', with: 'Caprese Melt' },
    ]), MENU);
    expect(resolved.map((p) => `${p.drink.name}+${p.with.name}`)).toEqual(['Lemonade+Caprese Melt']);
  });

  it('shows nothing when switched off, empty, or never published', () => {
    const pairs = [{ drink: 'Latte', with: 'Scone' }];
    expect(resolvePairings(block(pairs, false), live)).toEqual([]);
    expect(resolvePairings({ pairs }, live)).toEqual([]); // enabled must be explicitly true
    expect(resolvePairings(block([]), live)).toEqual([]);
    expect(resolvePairings({}, live)).toEqual([]);
    expect(resolvePairings(null, live)).toEqual([]);
    // there is no seed default — nothing ships until the owner publishes one
    expect(CONTENT_BLOCKS.pairings).toBeUndefined();
  });

  it('sorts drinks from treats (Grab n Go bottles are not treats)', () => {
    expect(live.filter(isDrink).map((m) => m.name)).toEqual(['Iced Chai Latte', 'Latte', 'Lemonade']);
    expect(live.filter(isTreat).map((m) => m.name)).toEqual(['Muffin', 'Scone', 'Caprese Melt']);
    // the bundled menu has plenty of both
    const avail = MENU_ITEMS.filter((m) => m.available !== false);
    expect(avail.filter(isDrink).length).toBeGreaterThan(10);
    expect(avail.filter(isTreat).some((m) => m.name === 'Muffin')).toBe(true);
  });
});

describe('editing pairings (pure helpers)', () => {
  it('adds a complete pairing, trimming it, and refuses incomplete or repeated ones', () => {
    const one = addPair([], { drink: ' Latte ', with: 'Scone', note: '  Buttery  and   bold ', by: '' });
    expect(one).toEqual([{ drink: 'Latte', with: 'Scone', note: 'Buttery and bold' }]);
    expect(addPair(one, { drink: 'latte', with: 'SCONE' })).toBe(one);
    expect(addPair(one, { drink: 'Latte', with: '' })).toBe(one);
    expect(addPair(one, { drink: 'Latte', with: 'Latte' })).toBe(one);
    const two = addPair(one, { drink: 'Lemonade', with: 'Muffin', by: 'Cat' });
    expect(two[1]).toEqual({ drink: 'Lemonade', with: 'Muffin', by: 'Cat' });
    expect(addPair([], { drink: 'Latte', with: 'Scone', note: 'x'.repeat(200) })[0].note).toHaveLength(80);
  });

  it('removes and reorders', () => {
    const list = [{ drink: 'A', with: 'x' }, { drink: 'B', with: 'y' }, { drink: 'C', with: 'z' }];
    expect(removePair(list, 1).map((p) => p.drink)).toEqual(['A', 'C']);
    expect(movePair(list, 2, -1).map((p) => p.drink)).toEqual(['A', 'C', 'B']);
    expect(movePair(list, 0, 1).map((p) => p.drink)).toEqual(['B', 'A', 'C']);
    expect(movePair(list, 0, -1)).toBe(list);
    expect(movePair(list, 2, 1)).toBe(list);
    expect(list.map((p) => p.drink)).toEqual(['A', 'B', 'C']); // never mutated
  });

  it('flags saved pairings that are off the menu', () => {
    const pairs = [{ drink: 'Latte', with: 'Scone' }, { drink: 'Banana Split Coffee', with: 'Muffin' }];
    expect(missingFromMenu(pairs, MENU)).toEqual([pairs[1]]);
  });

  it('builds "Need ideas?" only from real, available items, skipping drinks already paired', () => {
    const ideas = pairingIdeas(MENU, [{ drink: 'Latte', with: 'Scone' }], { count: 10 });
    expect(ideas.length).toBeGreaterThan(0);
    const names = new Set(live.map((m) => m.name));
    for (const x of ideas) {
      expect(names.has(x.drink) && names.has(x.with)).toBe(true);
      expect(x.drink).not.toBe('Latte');
      expect(isTreat(live.find((m) => m.name === x.with))).toBe(true);
    }
    expect(pairingIdeas([], [])).toEqual([]);
  });
});

describe('the menu page', () => {
  const MenuBlock = async () => (await import('../src/components/sections/MenuBlock.jsx')).default;

  it('shows nothing about pairings until one is published', async () => {
    fake.state.db.menu_items = live;
    const Menu = await MenuBlock();
    const { container } = render(<MemoryRouter><Menu /></MemoryRouter>);
    await screen.findByText('Iced Chai Latte');
    expect(container.querySelector('.pairline')).toBeNull();
    expect(screen.queryByText(/goes great with/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: /our pairings/i })).toBeNull();
  });

  it('puts "Goes great with" under a paired drink, with both items linking to their SpotOn sections', async () => {
    fake.state.db.menu_items = live;
    fake.state.db.content_blocks = [{ key: 'pairings', data: block([{ drink: 'iced chai latte', with: 'Muffin', by: 'Cat' }]) }];
    const Menu = await MenuBlock();
    const { container } = render(<MemoryRouter><Menu /></MemoryRouter>);
    const line = await waitFor(() => {
      const el = container.querySelector('.pairline');
      expect(el).toBeTruthy();
      return el;
    });
    expect(line.textContent).toMatch(/Goes great with: Muffin/);
    expect(line.textContent).toMatch(/Cat’s pick/);
    // under the drink, not the muffin
    expect(line.closest('.menu-item').querySelector('.menu-item__name').textContent).toMatch('Iced Chai Latte');
    const muffin = MENU.find((m) => m.name === 'Muffin');
    const link = within(line).getByRole('link', { name: /order muffin/i });
    expect(link.getAttribute('href')).toBe(orderUrlFor(muffin));
    expect(link.getAttribute('href')).toMatch(/#group-menu-/);
    expect(screen.getByRole('link', { name: /order iced chai latte/i }).getAttribute('href')).toMatch(/#group-menu-/);
    // one pairing is not enough for the strip
    expect(screen.queryByRole('heading', { name: /our pairings/i })).toBeNull();
  });

  it('adds an "Our pairings" strip for 2+ pairings, and leaves out one whose treat is gone', async () => {
    fake.state.db.menu_items = live;
    fake.state.db.content_blocks = [{ key: 'pairings', data: block([
      { drink: 'Iced Chai Latte', with: 'Muffin', note: 'The spice wakes up the blueberry' },
      { drink: 'Lemonade', with: 'Caprese Melt' },
      { drink: 'Latte', with: 'Pumpkin Bread' },
    ]) }];
    const Menu = await MenuBlock();
    render(<MemoryRouter><Menu /></MemoryRouter>);
    const strip = (await screen.findByRole('heading', { name: /our pairings/i })).closest('section');
    expect(within(strip).getAllByRole('listitem')).toHaveLength(2);
    expect(strip.textContent).toMatch(/The spice wakes up the blueberry/);
    expect(strip.textContent).not.toMatch(/Pumpkin/);
    expect(screen.queryByText(/Pumpkin Bread/)).toBeNull();
  });
});

describe('admin: Pair a drink with a treat', () => {
  async function renderAdmin() {
    const { ToastProvider } = await import('../src/admin/components/ui.jsx');
    const { UnsavedProvider, EditScreen } = await import('../src/admin/lib/publishing.jsx');
    const PairingsManager = (await import('../src/admin/managers/PairingsManager.jsx')).default;
    return render(
      <MemoryRouter>
        <ToastProvider>
          <UnsavedProvider>
            <EditScreen><PairingsManager /></EditScreen>
          </UnsavedProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  it('picks from the live menu, writes nothing until Publish, then creates the row', async () => {
    fake.state.db.menu_items = live;
    await renderAdmin();
    const drinkBox = await screen.findByLabelText('Drink');
    fireEvent.change(drinkBox, { target: { value: 'chai' } });
    const drinks = screen.getByRole('list', { name: /^drink:/i });
    expect(within(drinks).getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringMatching(/^Iced Chai Latte/)]);
    fireEvent.click(within(drinks).getByRole('button'));

    const treats = screen.getByRole('list', { name: /^goes great with:/i });
    // drinks and bottled water are not offered as treats
    expect(within(treats).queryByText('Latte')).toBeNull();
    expect(within(treats).queryByText('Bottled Water')).toBeNull();
    fireEvent.click(within(treats).getByText('Muffin'));
    fireEvent.change(screen.getByLabelText(/why it works/i), { target: { value: 'The spice wakes up the blueberry' } });
    fireEvent.change(screen.getByLabelText(/picked by/i), { target: { value: 'Cat' } });
    fireEvent.click(screen.getByRole('button', { name: /add this pairing/i }));

    const list = screen.getByRole('list', { name: /your pairings/i });
    expect(list.textContent).toMatch(/Iced Chai Latte.*Muffin/);
    expect(fake.state.log).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    await screen.findByText(/published — live on the site now/i);
    expect(fake.state.log).toHaveLength(1);
    expect(fake.state.log[0]).toMatchObject({
      table: 'content_blocks',
      op: 'upsert',
      opts: { onConflict: 'key' },
      payload: { key: 'pairings', data: { enabled: true, pairs: [{ drink: 'Iced Chai Latte', with: 'Muffin', note: 'The spice wakes up the blueberry', by: 'Cat' }] } },
    });
  });

  it('reorders and removes, and ideas only fill the pickers', async () => {
    fake.state.db.menu_items = live;
    fake.state.db.content_blocks = [{ key: 'pairings', data: block([{ drink: 'Latte', with: 'Scone' }, { drink: 'Lemonade', with: 'Caprese Melt' }]) }];
    await renderAdmin();
    const list = await screen.findByRole('list', { name: /your pairings/i });
    fireEvent.click(within(list).getByRole('button', { name: /move lemonade \+ caprese melt up/i }));
    expect(within(list).getAllByRole('listitem')[0].textContent).toMatch(/Lemonade/);
    fireEvent.click(within(list).getByRole('button', { name: /remove latte \+ scone/i }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByText(/need ideas/i));
    const idea = screen.getAllByRole('button', { name: /^try /i })[0];
    fireEvent.click(idea);
    expect(within(list).getAllByRole('listitem')).toHaveLength(1); // not added by itself
    expect(screen.getByRole('button', { name: /add this pairing/i }).disabled).toBe(false);
    expect(fake.state.log).toHaveLength(0);
  });
});
