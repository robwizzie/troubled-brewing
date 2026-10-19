import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

/* The admin home is a task launcher: the chalkboard first, a "What do you
   want to change?" box, big cards for the common jobs, a first-time tip, and
   what's waiting / recently published. The sidebar is short, collapsible on a
   phone, and every other screen has a way back home. */

const db = vi.hoisted(() => ({ tables: {} }));
vi.mock('../src/lib/supabase.js', () => {
  const from = (table) => {
    const rows = () => db.tables[table] || [];
    const b = {
      select: () => b,
      eq: () => b,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then: (res, rej) => Promise.resolve({ data: rows(), error: null, count: rows().length }).then(res, rej),
    };
    return b;
  };
  return { isSupabaseConfigured: true, supabase: { from } };
});
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));

const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const AdminLayout = (await import('../src/admin/AdminLayout.jsx')).default;
const AdminHome = (await import('../src/admin/AdminHome.jsx')).default;
const { TASKS, searchTasks, recordPublish, describePath } = await import('../src/admin/lib/nav.js');

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAdmin(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <UnsavedProvider>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="*" element={<h1>Some screen</h1>} />
            </Route>
          </Routes>
          <Where />
        </UnsavedProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}
const where = () => screen.getByTestId('where').textContent;
const main = () => screen.getByRole('main');

beforeEach(() => {
  db.tables = {};
  window.localStorage.clear();
});
afterEach(cleanup);

describe('admin home', () => {
  it('puts "Update today’s chalkboard" first, with its status in plain words', async () => {
    db.tables.content_blocks = [{ data: { enabled: false, url: '' } }];
    renderAdmin();
    const firstLink = main().querySelector('a');
    expect(firstLink.textContent).toMatch(/update today’s chalkboard/i);
    expect(firstLink.getAttribute('href')).toBe('/admin/chalkboard');
    expect(await within(firstLink).findByText(/not showing — the drawn menu board is up/i)).toBeTruthy();
    fireEvent.click(firstLink);
    expect(where()).toBe('/admin/chalkboard');
  });

  it.each([
    [/change hours or add a holiday closure/i, '/admin/hours'],
    [/post an announcement banner/i, '/admin/quick-blocks'],
    [/edit the menu descriptions or photos/i, '/admin/menu'],
    [/add an event/i, '/admin/events'],
    [/edit a page’s words or photos/i, '/admin/editor'],
    [/hide or feature a review/i, '/admin/reviews'],
  ])('the "%s" card goes to %s and says what it changes', (name, to) => {
    renderAdmin();
    const card = within(main()).getByRole('link', { name });
    expect(card.querySelector('.taskcard__desc').textContent.length).toBeGreaterThan(10);
    fireEvent.click(card);
    expect(where()).toBe(to);
  });

  it('"What do you want to change?" finds screens by the words people use', () => {
    renderAdmin();
    const box = screen.getByLabelText(/what do you want to change/i);
    fireEvent.change(box, { target: { value: 'closed for christmas' } });
    const results = screen.getByRole('list', { name: /matching screens/i });
    expect(within(results).getAllByRole('link')[0].getAttribute('href')).toBe('/admin/hours');

    fireEvent.change(box, { target: { value: 'pumpkin latte photo' } });
    expect(within(screen.getByRole('list', { name: /matching screens/i })).getAllByRole('link')[0].getAttribute('href')).toBe('/admin/menu');

    // Enter goes to the best match
    fireEvent.change(box, { target: { value: 'black board sign' } });
    fireEvent.submit(box.closest('form'));
    expect(where()).toBe('/admin/chalkboard');
  });

  it('says so when nothing matches, and points to Help', () => {
    renderAdmin();
    fireEvent.change(screen.getByLabelText(/what do you want to change/i), { target: { value: 'zzqx' } });
    expect(screen.getByText(/nothing matches “zzqx”/i)).toBeTruthy();
    expect(within(main()).getByRole('link', { name: /^help$/i }).getAttribute('href')).toBe('/admin/help');
  });

  it('the first-time tip has three steps and stays hidden once dismissed', () => {
    renderAdmin();
    const tip = screen.getByRole('region', { name: /first time here/i });
    expect(within(tip).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(within(tip).getByRole('button', { name: /got it/i }));
    expect(screen.queryByRole('region', { name: /first time here/i })).toBeNull();
    cleanup();
    renderAdmin();
    expect(screen.queryByRole('region', { name: /first time here/i })).toBeNull();
  });

  it('still works when storage is blocked (private browsing)', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      renderAdmin();
      fireEvent.click(screen.getByRole('button', { name: /got it/i }));
      expect(screen.queryByRole('region', { name: /first time here/i })).toBeNull();
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('lists pages waiting to publish and what was published recently', async () => {
    db.tables.sections = [
      { page_slug: 'about', draft_data: { heading: 'New' } },
      { page_slug: 'about', draft_data: null },
      { page_slug: 'menu', draft_data: null },
    ];
    recordPublish('/admin/hours', new Date(Date.now() - 5 * 60000));
    recordPublish('/admin/editor/menu');
    renderAdmin();
    const waiting = await screen.findByRole('link', { name: /our story page/i });
    expect(waiting.getAttribute('href')).toBe('/admin/editor/about');
    expect(screen.queryByRole('link', { name: /✏️ menu page/i })).toBeNull();
    expect(within(main()).getByRole('link', { name: 'Hours & holidays' }).getAttribute('href')).toBe('/admin/hours');
    expect(screen.getByText('5 min ago')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit your pages · Menu' })).toBeTruthy();
  });
});

describe('search', () => {
  it.each([
    ['snow day', '/admin/hours'],
    ['thanksgiving', '/admin/hours'],
    ['chalkboard', '/admin/chalkboard'],
    ['specials', '/admin/chalkboard'],
    ['open mic', '/admin/events'],
    ['banner', '/admin/quick-blocks'],
    ['bad review', '/admin/reviews'],
    ['gluten free', '/admin/menu'],
    ['about page words', '/admin/editor'],
    ['new barista', '/admin/troublemakers'],
    ['catering', '/admin/inbox'],
    ['instagram', '/admin/quick-blocks'],
  ])('"%s" → %s', (q, to) => {
    expect(searchTasks(q)[0]?.to).toBe(to);
  });
  it('returns nothing for an empty box', () => {
    expect(searchTasks('   ')).toEqual([]);
  });
  it('every home card is a real screen', () => {
    for (const t of TASKS) expect(describePath(t.to)).not.toBe('Admin');
  });
});

describe('sidebar and breadcrumbs', () => {
  it('is short: everyday screens up top, rarer ones folded under More', () => {
    renderAdmin();
    const nav = screen.getByRole('navigation', { name: /admin sections/i });
    const names = within(nav).getAllByRole('link').map((a) => a.textContent);
    expect(names.slice(0, 3).join('|')).toMatch(/Home\|.*Today’s chalkboard\|.*Edit your pages/);
    expect(within(nav).queryByRole('link', { name: /timeline/i })).toBeNull();
    fireEvent.click(within(nav).getByRole('button', { name: /more/i }));
    expect(within(nav).getByRole('link', { name: /timeline/i })).toBeTruthy();
  });

  it('marks the current screen and opens More by itself when you are in it', () => {
    renderAdmin('/admin/timeline');
    const nav = screen.getByRole('navigation', { name: /admin sections/i });
    const current = within(nav).getByRole('link', { name: /timeline/i });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.className).toMatch(/active/);
  });

  it('the phone menu opens and closes, and the chalkboard is one tap away', () => {
    renderAdmin();
    const burger = screen.getByRole('button', { name: /open the admin menu/i });
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(burger);
    expect(screen.getByRole('button', { name: /close the admin menu/i }).getAttribute('aria-expanded')).toBe('true');
    const nav = screen.getByRole('navigation', { name: /admin sections/i });
    expect(nav.className).toMatch(/is-open/);
    fireEvent.click(within(nav).getByRole('link', { name: /today’s chalkboard/i }));
    expect(where()).toBe('/admin/chalkboard');
    expect(nav.className).not.toMatch(/is-open/); // closes after you pick
  });

  it('every other screen has a breadcrumb back to Admin home', async () => {
    renderAdmin('/admin/menu');
    const crumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(crumbs).getByText(/menu/i)).toBeTruthy();
    fireEvent.click(within(crumbs).getByRole('link', { name: /admin home/i }));
    await waitFor(() => expect(where()).toBe('/admin'));
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).toBeNull();
  });
});
