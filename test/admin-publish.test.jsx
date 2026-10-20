import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

/* Explicit publishing: no admin control writes to the database when it
   changes — only the Publish button does, once. The Supabase client is a
   recording fake; `writes(table)` lists every insert/update/upsert/delete the
   admin sent to a table (revision snapshots go to `revisions` and are not
   counted as content writes). */

const fake = vi.hoisted(() => {
  const state = { db: {}, log: [] };
  function from(table) {
    let op = 'select';
    let payload;
    const filters = [];
    const rows = () =>
      (state.db[table] || []).filter((r) =>
        filters.every(([c, v, kind]) => (kind === 'in' ? v.includes(r[c]) : String(r[c]) === String(v)))
      );
    const run = (single) => {
      if (op === 'select') {
        const r = rows();
        return { data: single ? r[0] ?? null : r, error: null, count: r.length };
      }
      if (op === 'insert') return { data: single ? { id: `srv-${state.log.length}`, ...payload } : [payload], error: null };
      if (op === 'update') {
        const r = rows()[0];
        return { data: r ? { ...r, ...payload } : null, error: null };
      }
      return { data: null, error: null };
    };
    const record = (entry) => state.log.push({ table, filters, ...entry });
    const b = {
      select: () => b,
      insert: (p) => { op = 'insert'; payload = p; record({ op, payload: p }); return b; },
      update: (p) => { op = 'update'; payload = p; record({ op, payload: p }); return b; },
      upsert: (p, o) => { op = 'upsert'; payload = p; record({ op, payload: p, opts: o }); return b; },
      delete: () => { op = 'delete'; record({ op }); return b; },
      eq: (c, v) => { filters.push([c, v]); return b; },
      in: (c, v) => { filters.push([c, v, 'in']); return b; },
      order: () => b,
      gte: () => b,
      limit: () => b,
      maybeSingle: async () => run(true),
      single: async () => run(true),
      then: (res, rej) => Promise.resolve(run(false)).then(res, rej),
    };
    return b;
  }
  const supabase = {
    from,
    auth: {
      getUser: async () => ({ data: { user: { email: 'owner@test' } } }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    functions: { invoke: async () => ({ data: { ok: true, reviews: 0 }, error: null }) },
  };
  return { state, supabase };
});

vi.mock('../src/lib/supabase.js', () => ({ isSupabaseConfigured: true, supabase: fake.supabase }));
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('../src/admin/lib/uploadImage.js', () => ({
  uploadImage: vi.fn(async () => ({ url: 'https://cdn.test/media/x.webp', path: 'uploads/x.webp', before: 10, after: 5 })),
  deleteMedia: vi.fn(async () => {}),
  listMedia: vi.fn(async () => []),
  formatBytes: (b) => `${b} B`,
}));

const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnsavedProvider, EditScreen } = await import('../src/admin/lib/publishing.jsx');
const QuickBlocks = (await import('../src/admin/managers/QuickBlocks.jsx')).default;
const HoursEditor = (await import('../src/admin/managers/HoursEditor.jsx')).default;
const ReviewsManager = (await import('../src/admin/managers/ReviewsManager.jsx')).default;
const MenuManager = (await import('../src/admin/managers/MenuManager.jsx')).default;
const GoogleProfileSettings = (await import('../src/admin/managers/GoogleProfileSettings.jsx')).default;
const EditorApp = (await import('../src/admin/editor/EditorApp.jsx')).default;

const writes = (table) => fake.state.log.filter((w) => w.table === table);
const contentWrites = () => fake.state.log.filter((w) => w.table !== 'revisions');

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

function renderScreen(el, { path = '/admin/x' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <UnsavedProvider>
          <Routes>
            <Route path="/admin/x" element={<EditScreen><Link to="/admin/elsewhere">Go elsewhere</Link>{el}</EditScreen>} />
            <Route path="/admin/editor/:slug" element={<><Link to="/admin/elsewhere">Go elsewhere</Link><EditorApp /></>} />
            <Route path="/admin/elsewhere" element={<p>Somewhere else</p>} />
          </Routes>
          <Where />
        </UnsavedProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const publishBtn = () => screen.getByRole('button', { name: /^publish$/i });
const discardBtn = () => screen.getByRole('button', { name: /^discard$/i });
async function publish() {
  fireEvent.click(publishBtn());
  await screen.findByText(/published — live on the site now/i);
}

beforeEach(() => {
  fake.state.log.length = 0;
  fake.state.db = {};
});
afterEach(() => cleanup());

/* ------------------------------------------------------------------------- */
describe('Banner, links & featured drink (QuickBlocks)', () => {
  beforeEach(() => {
    fake.state.db.content_blocks = [
      { key: 'announcement_banner', data: { enabled: false, message: 'Hello' } },
      { key: 'homepage_concept', data: { concept: 'gallery' } },
    ];
  });

  it('typing, ticking and picking write nothing; Publish writes each changed block once', async () => {
    renderScreen(<QuickBlocks />);
    const msg = await screen.findByLabelText('Message');
    expect(publishBtn().disabled).toBe(true);

    fireEvent.change(msg, { target: { value: 'Closed Monday' } });
    fireEvent.click(screen.getByLabelText('Show the banner'));
    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: 'https://instagram.com/tb' } });
    expect(contentWrites()).toHaveLength(0);
    expect(screen.getByText(/unsaved changes in 2 places/i)).toBeTruthy();
    expect(publishBtn().disabled).toBe(false);

    await publish();
    expect(writes('content_blocks')).toHaveLength(2);
    const banner = writes('content_blocks').find((w) => w.payload.key === 'announcement_banner');
    expect(banner.payload).toEqual({ key: 'announcement_banner', data: { enabled: true, message: 'Closed Monday' }, status: 'published' });
    expect(writes('content_blocks').find((w) => w.payload.key === 'social_links').payload.data.instagram).toBe('https://instagram.com/tb');
    expect(publishBtn().disabled).toBe(true); // nothing left to publish
  });

  it('points to the Homepage look screen instead of a picker of its own', async () => {
    renderScreen(<QuickBlocks />);
    const link = await screen.findByRole('link', { name: /homepage look/i });
    expect(link.getAttribute('href')).toBe('/admin/look');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('Discard (after a confirm) puts the live values back and writes nothing', async () => {
    renderScreen(<QuickBlocks />);
    const msg = await screen.findByLabelText('Message');
    fireEvent.change(msg, { target: { value: 'Oops' } });
    expect(screen.getByText(/unsaved changes/i)).toBeTruthy();
    fireEvent.click(discardBtn());
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /discard changes/i }));
    await waitFor(() => expect(screen.getByLabelText('Message').value).toBe('Hello'));
    expect(contentWrites()).toHaveLength(0);
    expect(publishBtn().disabled).toBe(true);
    expect(discardBtn().disabled).toBe(true);
  });
});

/* ------------------------------------------------------------------------- */
describe('Hours & holidays', () => {
  beforeEach(() => {
    fake.state.db.hours = [{ day_of_week: 1, open_time: '7:00 AM', close_time: '3:00 PM' }];
    fake.state.db.hours_overrides = [{ override_date: '2026-12-25', label: 'Christmas', open_time: null, close_time: null }];
  });

  it('editing a time writes nothing; Publish upserts the week once', async () => {
    renderScreen(<HoursEditor />);
    fireEvent.change(await screen.findByLabelText('Monday opens'), { target: { value: '6:30 AM' } });
    expect(contentWrites()).toHaveLength(0);
    await publish();
    expect(writes('hours')).toHaveLength(1);
    expect(writes('hours')[0].payload.find((r) => r.day_of_week === 1).open_time).toBe('6:30 AM');
    expect(writes('hours_overrides')).toHaveLength(0);
  });

  it('adding and removing holidays is staged; Publish writes once each', async () => {
    renderScreen(<HoursEditor />);
    fireEvent.change(await screen.findByLabelText('Date'), { target: { value: '2026-11-26' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Thanksgiving' } });
    fireEvent.click(screen.getByRole('button', { name: /add holiday/i }));
    // remove Christmas (the saved one); rows are sorted by date, so it's second
    fireEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[1]);
    // destructive → confirm first
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }));
    expect(contentWrites()).toHaveLength(0);
    expect(screen.getByText(/will be removed/i)).toBeTruthy();

    await publish();
    const ov = writes('hours_overrides');
    expect(ov.filter((w) => w.op === 'delete')).toHaveLength(1);
    expect(ov.filter((w) => w.op === 'upsert')).toHaveLength(1);
    expect(ov.find((w) => w.op === 'upsert').payload).toEqual([
      { override_date: '2026-11-26', label: 'Thanksgiving', open_time: null, close_time: null },
    ]);
  });
});

/* ------------------------------------------------------------------------- */
describe('Google reviews', () => {
  beforeEach(() => {
    fake.state.db.google_profile = [{ id: 1, reviews: [
      { author: 'Ana', rating: 5, text: 'Best latte in town' },
      { author: 'Ben', rating: 4, text: 'Cozy spot, great art' },
    ] }];
    fake.state.db.content_blocks = [{ key: 'review_settings', data: { min_rating: 4, hidden: {}, pinned: {}, photos: {} } }];
    fake.state.db.testimonials = [];
  });

  it('min stars, hide, feature and + Favorite are staged; Publish writes the settings once', async () => {
    renderScreen(<ReviewsManager />);
    fireEvent.change(await screen.findByLabelText(/minimum stars/i), { target: { value: '5' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^feature$/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^favorite$/i })[0]);
    expect(contentWrites()).toHaveLength(0);

    await publish();
    expect(writes('content_blocks')).toHaveLength(1);
    const data = writes('content_blocks')[0].payload.data;
    expect(data.min_rating).toBe(5);
    expect(Object.keys(data.pinned)).toHaveLength(1);
    expect(writes('testimonials')).toHaveLength(1); // the staged favourite
  });

  it('hiding a review is staged', async () => {
    renderScreen(<ReviewsManager />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^hide$/i }))[0]);
    expect(contentWrites()).toHaveLength(0);
    await publish();
    expect(writes('content_blocks')).toHaveLength(1);
    expect(Object.keys(writes('content_blocks')[0].payload.data.hidden)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------------- */
describe('Lists (Menu via CollectionManager)', () => {
  beforeEach(() => {
    fake.state.db.menu_items = [
      { id: 11, name: 'Latte', category: 'espresso', price: 5, available: true, status: 'published', display_order: 0, dietary_flags: [] },
      { id: 12, name: 'Mocha', category: 'espresso', price: 6, available: true, status: 'published', display_order: 1, dietary_flags: [] },
    ];
  });

  it('editing an item (Done) writes nothing; Publish updates just that item once', async () => {
    renderScreen(<MenuManager />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^edit$/i }))[0]);
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Silky' } });
    fireEvent.click(screen.getByLabelText(/available/i)); // availability toggle
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(contentWrites()).toHaveLength(0);
    expect(screen.getByText(/changed — not live yet/i)).toBeTruthy();

    await publish();
    expect(writes('menu_items')).toHaveLength(1);
    expect(writes('menu_items')[0]).toMatchObject({ op: 'update', payload: { description: 'Silky', available: false } });
    expect(writes('menu_items')[0].filters).toEqual([['id', 11]]);
  });

  it('delete asks first, then waits for Publish (and can be undone)', async () => {
    renderScreen(<MenuManager />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^delete$/i }))[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }));
    expect(contentWrites()).toHaveLength(0);
    expect(screen.getByRole('button', { name: /undo remove/i })).toBeTruthy();
    await publish();
    expect(writes('menu_items')).toEqual([expect.objectContaining({ op: 'delete', filters: [['id', 12]] })]);
  });

  it('re-ordering and adding are staged until Publish', async () => {
    renderScreen(<MenuManager />);
    fireEvent.click(await screen.findByRole('button', { name: /move mocha up/i }));
    fireEvent.click(screen.getByRole('button', { name: /^add item$/i }));
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Cortado' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(contentWrites()).toHaveLength(0);
    await publish();
    const w = writes('menu_items');
    expect(w.filter((x) => x.op === 'insert')).toHaveLength(1);
    expect(w.find((x) => x.op === 'insert').payload).toMatchObject({ name: 'Cortado', status: 'published', display_order: 2 });
    expect(w.filter((x) => x.op === 'update').map((x) => x.payload.display_order).sort()).toEqual([0, 1]);
  });
});

/* ------------------------------------------------------------------------- */
describe('Google connection', () => {
  it('the Place ID is staged until Publish', async () => {
    fake.state.db.google_profile = [{ id: 1, place_id: 'old', maps_url: '' }];
    renderScreen(<GoogleProfileSettings />);
    fireEvent.change(await screen.findByLabelText(/place id/i), { target: { value: 'ChIJnew' } });
    expect(contentWrites()).toHaveLength(0);
    await publish();
    expect(writes('google_profile')).toHaveLength(1);
    expect(writes('google_profile')[0].payload).toMatchObject({ id: 1, place_id: 'ChIJnew' });
  });
});

/* ------------------------------------------------------------------------- */
describe('On-page editor', () => {
  beforeEach(() => {
    fake.state.db.sections = [
      { id: 1, page_slug: 'about', type: 'newsletter', display_order: 0, status: 'published', visible: true, data: { heading: 'Join the club' } },
      { id: 2, page_slug: 'about', type: 'cta', display_order: 1, status: 'published', visible: true, data: { heading: 'Order ahead' } },
    ];
    fake.state.db.pages = [{ slug: 'about', title: 'Our Story', meta_description: '' }];
    fake.state.db.content_blocks = [{ key: 'homepage_concept', data: { concept: 'gallery' } }];
  });
  const openEditor = () => renderScreen(null, { path: '/admin/editor/about' });

  it('typing in a section writes nothing; Publish writes that section once', async () => {
    openEditor();
    fireEvent.click(await screen.findByRole('button', { name: /^newsletter signup/i }));
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'Join the gang' } });
    expect(contentWrites()).toHaveLength(0);
    expect(screen.getByText(/1 unpublished change on our story/i)).toBeTruthy();

    await publish();
    expect(writes('sections')).toHaveLength(1);
    expect(writes('sections')[0]).toMatchObject({ op: 'update', payload: { data: { heading: 'Join the gang' }, draft_data: null, status: 'published' } });
  });

  it('hide, move and remove are staged until Publish', async () => {
    openEditor();
    fireEvent.click(await screen.findByRole('button', { name: /hide newsletter signup/i }));
    fireEvent.click(screen.getByRole('button', { name: /move call-to-action up/i }));
    expect(contentWrites()).toHaveLength(0);
    await publish();
    const w = writes('sections');
    expect(w.find((x) => x.filters[0][1] === 1).payload).toMatchObject({ visible: false, display_order: 1 });
    expect(w.find((x) => x.filters[0][1] === 2).payload).toMatchObject({ display_order: 0 });

    fake.state.log.length = 0;
    fireEvent.click(screen.getByRole('button', { name: /remove call-to-action/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^remove$/i }));
    expect(contentWrites()).toHaveLength(0);
    await publish();
    expect(writes('sections')).toEqual([expect.objectContaining({ op: 'delete' })]);
  });

  it('page search details are staged until Publish', async () => {
    openEditor();
    fireEvent.change(await screen.findByLabelText('Page title'), { target: { value: 'Our Story — Trouble Brewing' } });
    expect(contentWrites()).toHaveLength(0);
    await publish();
    expect(writes('pages')).toHaveLength(1);
    expect(writes('pages')[0].payload).toMatchObject({ title: 'Our Story — Trouble Brewing' });
  });
});

/* ------------------------------------------------------------------------- */
describe('leaving with unpublished changes', () => {
  beforeEach(() => {
    fake.state.db.content_blocks = [{ key: 'announcement_banner', data: { enabled: false, message: 'Hello' } }];
  });

  it('closing the tab warns only while something is unpublished', async () => {
    renderScreen(<QuickBlocks />);
    const msg = await screen.findByLabelText('Message');
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    fireEvent.change(msg, { target: { value: 'Changed' } });
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('an in-app link asks first; "Stay here" keeps you and your changes', async () => {
    renderScreen(<QuickBlocks />);
    fireEvent.change(await screen.findByLabelText('Message'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('link', { name: /go elsewhere/i }));
    const dialog = screen.getByRole('dialog', { name: /leave without publishing/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /stay here/i }));
    expect(screen.getByTestId('where').textContent).toBe('/admin/x');
    expect(screen.getByLabelText('Message').value).toBe('Changed');

    fireEvent.click(screen.getByRole('link', { name: /go elsewhere/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /leave and discard/i }));
    await screen.findByText('Somewhere else');
    expect(contentWrites()).toHaveLength(0);
  });

  it('links go straight through when nothing is unpublished', async () => {
    renderScreen(<QuickBlocks />);
    await screen.findByLabelText('Message');
    fireEvent.click(screen.getByRole('link', { name: /go elsewhere/i }));
    await screen.findByText('Somewhere else');
  });
});

/* ------------------------------------------------------------------------- */
describe('publish errors are explained in plain words', () => {
  it('keeps the changes and says what to do', async () => {
    fake.state.db.content_blocks = [{ key: 'announcement_banner', data: { enabled: false, message: 'Hello' } }];
    renderScreen(<QuickBlocks />);
    fireEvent.change(await screen.findByLabelText('Message'), { target: { value: 'Changed' } });
    const realFrom = fake.supabase.from;
    fake.supabase.from = (t) => {
      const b = realFrom(t);
      b.upsert = () => ({ then: (res) => Promise.resolve({ error: { message: 'Failed to fetch' } }).then(res) });
      return b;
    };
    try {
      fireEvent.click(publishBtn());
      expect(await screen.findByText(/couldn’t reach the server/i)).toBeTruthy();
    } finally {
      fake.supabase.from = realFrom;
    }
    expect(screen.getByLabelText('Message').value).toBe('Changed');
    expect(publishBtn().disabled).toBe(false);
  });
});
