import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { forwardRef } from 'react';

/* The page editor and the Gallery Wall: a click on a piece in the preview
   opens the wall editor on that piece, a click on the wall around it opens
   the section panel, ?wall=1&piece= deep-links, and the wall's changes are
   page changes — nothing is written until Publish, then once. The preview
   iframe is replaced by a stand-in that sends the same select messages. */

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
vi.mock('../src/lib/dataService.js', async (orig) => ({ ...(await orig()), getGalleryPieces: async () => [] }));
vi.mock('../src/admin/editor/Canvas.jsx', () => ({
  default: forwardRef(function FakeCanvas({ onSelect }, ref) {
    if (ref) ref.current = { invalidate: () => {} };
    return (
      <div>
        <button type="button" onClick={() => onSelect({ id: 'room-1', piece: 'lady-in-red' })}>Preview: the Lady in Red</button>
        <button type="button" onClick={() => onSelect({ id: 'room-1' })}>Preview: the wall</button>
      </div>
    );
  }),
}));

const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const EditorApp = (await import('../src/admin/editor/EditorApp.jsx')).default;

function renderEditor(path = '/admin/editor/gallery-wall') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <UnsavedProvider>
          <Routes>
            <Route path="/admin/editor/:slug" element={<EditorApp />} />
          </Routes>
        </UnsavedProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}
const contentWrites = () => fake.state.log.filter((w) => w.table !== 'revisions');

beforeEach(() => {
  fake.state.log.length = 0;
  fake.state.db = {
    sections: [{ id: 'room-1', page_slug: 'gallery-wall', type: 'gallery_wall_room', display_order: 0, visible: true, status: 'published', data: { heading: 'The Gallery Wall' }, draft_data: null }],
    content_blocks: [],
    pages: [],
  };
});
afterEach(cleanup);

describe('the Gallery Wall in the page editor', () => {
  it('a click on a piece in the preview opens the wall editor on that piece', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Preview: the Lady in Red' }));
    expect((await screen.findByLabelText(/name on the label/i)).value).toBe('The Lady in Red');
    expect(screen.getByRole('button', { name: /back to the page/i })).toBeTruthy();
  });

  it('a click on the wall around the pieces opens the section panel instead', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Preview: the wall' }));
    expect(await screen.findByRole('button', { name: /edit the pieces on the wall/i })).toBeTruthy();
    expect(screen.queryByLabelText(/name on the label/i)).toBeNull();
  });

  it('?wall=1&piece= opens straight onto a piece', async () => {
    renderEditor('/admin/editor/gallery-wall?wall=1&piece=pumpkin');
    expect((await screen.findByLabelText(/name on the label/i)).value).toBe('The Pumpkin House');
  });

  it('wall changes are page changes: nothing written until Publish, then the section once', async () => {
    renderEditor('/admin/editor/gallery-wall?wall=1&piece=pumpkin');
    const name = await screen.findByLabelText(/name on the label/i);
    fireEvent.change(name, { target: { value: 'The Pumpkin Cottage' } });
    fireEvent.change(screen.getByLabelText(/tilt/i), { target: { value: '3.5' } });
    expect(contentWrites()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    await screen.findByText(/published — live on the site now/i);
    const w = contentWrites().filter((x) => x.table === 'sections');
    expect(w).toHaveLength(1);
    const pumpkin = w[0].payload.data.pieces.find((p) => p.id === 'pumpkin');
    expect(pumpkin).toMatchObject({ title: 'The Pumpkin Cottage', r: 3.5 });
    await waitFor(() => expect(screen.getByRole('button', { name: /^publish$/i }).disabled).toBe(true));
  });
});
