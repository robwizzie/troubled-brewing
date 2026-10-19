import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

/* The homepage-look picker: Pick → Preview → Publish. Every look has a real
   thumbnail; Preview opens the real homepage in that look (desktop or phone)
   before anything is saved; "Use this one" only stages it; the shared Publish
   bar is the one thing that writes content_blocks.homepage_concept. */

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
const HomepageLook = (await import('../src/admin/managers/HomepageLook.jsx')).default;
const { CONCEPTS } = await import('../src/lib/concepts.js');

const writes = (table) => fake.state.log.filter((w) => w.table === table);

function renderLook() {
  return render(
    <MemoryRouter initialEntries={['/admin/look']}>
      <ToastProvider>
        <UnsavedProvider>
          <Routes>
            <Route path="/admin/look" element={<EditScreen><HomepageLook /></EditScreen>} />
          </Routes>
        </UnsavedProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}
const card = (value) => document.querySelector(`[data-concept="${value}"]`);
const label = (value) => CONCEPTS.find((c) => c.value === value).label;

beforeEach(() => {
  fake.state.log.length = 0;
  fake.state.db = { content_blocks: [{ key: 'homepage_concept', data: { concept: 'pastry_case' } }] };
});
afterEach(cleanup);

describe('Homepage look picker', () => {
  it('shows every look as a card with a real thumbnail, its name and one line; the live one says Live', async () => {
    renderLook();
    const grid = await screen.findByRole('list', { name: /homepage looks/i });
    const items = within(grid).getAllByRole('listitem');
    expect(items).toHaveLength(CONCEPTS.length);
    for (const c of CONCEPTS) {
      const el = card(c.value);
      const img = el.querySelector('img');
      expect(img.getAttribute('src')).toMatch(new RegExp(`images/admin/concepts/${c.value}\\.webp$`));
      expect(within(el).getByRole('heading', { name: c.label })).toBeTruthy();
      expect(el.querySelector('.conceptcard__desc').textContent.length).toBeGreaterThan(10);
      // the thumbnail is a real, small file in public/
      const file = path.resolve('public/images/admin/concepts', `${c.value}.webp`);
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.statSync(file).size).toBeLessThan(80 * 1024);
    }
    expect(within(card('pastry_case')).getByText('Live')).toBeTruthy();
    expect(card('pastry_case').className).toMatch(/is-selected/);
    expect(within(card('scrapbook')).queryByText('Live')).toBeNull();
  });

  it('Preview opens the real homepage in THAT look, marked "Preview, not live", at desktop or phone width — and writes nothing', async () => {
    renderLook();
    fireEvent.click(await screen.findByRole('button', { name: `Preview ${label('warm_storefront')}` }));
    const dialog = screen.getByRole('dialog', { name: /preview: warm storefront/i });
    expect(within(dialog).getByText(/preview, not live/i)).toBeTruthy();
    const frame = dialog.querySelector('iframe');
    expect(frame.getAttribute('src')).toMatch(/\?previewConcept=warm_storefront$/);
    expect(within(dialog).getByRole('link', { name: /new tab/i }).getAttribute('href')).toMatch(/\?previewConcept=warm_storefront$/);

    // phone / desktop toggle
    const phone = within(dialog).getByRole('radio', { name: /phone/i });
    fireEvent.click(phone);
    expect(phone.getAttribute('aria-checked')).toBe('true');
    expect(dialog.querySelector('.cpreview__stage').className).toMatch(/is-phone/);
    expect(dialog.querySelector('iframe').style.width).toBe('390px');
    fireEvent.click(within(dialog).getByRole('radio', { name: /desktop/i }));
    expect(dialog.querySelector('iframe').style.width).toBe('1280px');

    // step through looks without leaving the preview
    fireEvent.click(within(dialog).getByRole('button', { name: /next look/i }));
    const i = CONCEPTS.findIndex((c) => c.value === 'warm_storefront');
    const next = CONCEPTS[(i + 1) % CONCEPTS.length];
    expect(screen.getByRole('dialog').querySelector('iframe').getAttribute('src')).toMatch(new RegExp(`previewConcept=${next.value}$`));

    // the picture opens a preview too
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(within(card('scrapbook')).getByRole('button', { name: /open a full preview of scrapbook/i }));
    expect(screen.getByRole('dialog').querySelector('iframe').getAttribute('src')).toMatch(/previewConcept=scrapbook$/);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    expect(fake.state.log).toHaveLength(0);
    expect(screen.getByRole('button', { name: /^publish$/i }).disabled).toBe(true);
  });

  it('"Use this one" only stages the look; Publish writes it once', async () => {
    renderLook();
    fireEvent.click(await screen.findByRole('button', { name: `Preview ${label('scrapbook')}` }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /use this one/i }));
    expect(screen.queryByRole('dialog')).toBeNull();

    expect(card('scrapbook').className).toMatch(/is-selected/);
    expect(within(card('scrapbook')).getByText(/chosen — not live yet/i)).toBeTruthy();
    expect(within(card('pastry_case')).getByText('Live')).toBeTruthy(); // still the live one
    expect(screen.getByText(/unsaved changes to the homepage look/i)).toBeTruthy();
    expect(screen.getAllByText('Unpublished changes').length).toBeGreaterThan(0);
    expect(fake.state.log).toHaveLength(0);

    // picking straight from a card works the same way
    fireEvent.click(within(card('wall_tour')).getByRole('button', { name: `Use ${label('wall_tour')}` }));
    expect(fake.state.log).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    await screen.findByText(/published — live on the site now/i);
    expect(writes('content_blocks')).toHaveLength(1);
    expect(writes('content_blocks')[0].payload).toEqual({ key: 'homepage_concept', data: { concept: 'wall_tour' }, status: 'published' });
    await waitFor(() => expect(within(card('wall_tour')).getByText('Live')).toBeTruthy());
  });
});
