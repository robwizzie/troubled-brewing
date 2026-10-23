import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/* Unread counts: new wishes (wishes.status = 'new') and unread messages
   (submissions.read = false), from the real tables, shown as badges in the
   sidebar and on the home rows, as one "New since you last looked" line, and
   as "(n)" in the tab title. They refresh on focus and clear when the data
   does. */

const db = vi.hoisted(() => ({ tables: {}, queries: [] }));
vi.mock('../src/lib/supabase.js', () => {
  const from = (table) => {
    const filters = [];
    let head = false;
    const rows = () => (db.tables[table] || []).filter((r) => filters.every(([c, v]) => r[c] === v));
    const b = {
      select: (_cols, opts) => { head = Boolean(opts?.head); return b; },
      eq: (c, v) => { filters.push([c, v]); return b; },
      order: () => b,
      limit: () => b,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then: (res, rej) => {
        db.queries.push({ table, filters: [...filters], head });
        return Promise.resolve({ data: head ? null : rows(), error: null, count: rows().length }).then(res, rej);
      },
    };
    return b;
  };
  const user = { id: 'u1', email: 'katie@example.com' };
  const auth = {
    getSession: async () => ({ data: { session: { user } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({}),
  };
  return { isSupabaseConfigured: true, supabase: { from, auth } };
});
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));

const { AuthProvider } = await import('../src/admin/lib/auth.jsx');
const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnreadProvider, fetchUnreadCounts, unreadLabel, titleWithCount, REFRESH_MS } = await import('../src/admin/lib/unread.jsx');
const AdminLayout = (await import('../src/admin/AdminLayout.jsx')).default;
const AdminHome = (await import('../src/admin/AdminHome.jsx')).default;
const { supabase } = await import('../src/lib/supabase.js');

function renderAdmin(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <UnsavedProvider>
            <UnreadProvider>
              <Routes>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminHome />} />
                  <Route path="*" element={<h1>Some screen</h1>} />
                </Route>
              </Routes>
            </UnreadProvider>
          </UnsavedProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  db.queries = [];
  db.tables = {
    wishes: [
      { id: 'w1', text: 'latte', status: 'new' },
      { id: 'w2', text: 'chai', status: 'considering' },
    ],
    submissions: [
      { id: 's1', read: false },
      { id: 's2', read: false },
      { id: 's3', read: true },
    ],
  };
  window.localStorage.clear();
  document.title = 'Admin · Trouble Brewing';
});
afterEach(cleanup);

describe('unread counts', () => {
  it('counts new wishes and unread messages from the real columns', async () => {
    expect(await fetchUnreadCounts(supabase)).toEqual({ wishes: 1, inbox: 2 });
    const q = db.queries.filter((x) => x.head);
    expect(q).toEqual(expect.arrayContaining([
      { table: 'wishes', filters: [['status', 'new']], head: true },
      { table: 'submissions', filters: [['read', false]], head: true },
    ]));
  });

  it('says it in plain words and puts the total in the tab title', () => {
    expect(unreadLabel('wishes', 1)).toBe('1 new wish');
    expect(unreadLabel('inbox', 2)).toBe('2 new messages');
    expect(titleWithCount('Admin', 3)).toBe('(3) Admin');
    expect(titleWithCount('(3) Admin', 1)).toBe('(1) Admin');
    expect(titleWithCount('(3) Admin', 0)).toBe('Admin');
    expect(REFRESH_MS).toBeLessThanOrEqual(60000);
  });

  it('shows badges in the sidebar and on the home rows, a "new since" line, and (3) in the title', async () => {
    renderAdmin();
    const nav = screen.getByRole('navigation', { name: /admin sections/i });
    expect(await within(nav).findByLabelText('1 new wish')).toBeTruthy();
    expect(within(nav).getByLabelText('2 new messages')).toBeTruthy();

    const news = screen.getByRole('region', { name: /new since you last looked/i });
    expect(within(news).getByRole('link', { name: /1 new wish/i }).getAttribute('href')).toBe('/admin/wishes');
    expect(within(news).getByRole('link', { name: /2 new messages/i }).getAttribute('href')).toBe('/admin/inbox');

    const main = screen.getByRole('main');
    const wishRow = within(main).getByRole('link', { name: /read the menu wishes/i });
    expect(wishRow.querySelector('.countbadge').textContent).toBe('1');
    // the tab title is written in an effect after the badges render
    await waitFor(() => expect(document.title).toBe('(3) Admin · Trouble Brewing'));
  });

  it('clears when the items are marked, as soon as the window gets focus back', async () => {
    renderAdmin();
    await screen.findByRole('region', { name: /new since you last looked/i });
    db.tables.wishes[0].status = 'considering';
    db.tables.submissions.forEach((s) => { s.read = true; });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(screen.queryByRole('region', { name: /new since you last looked/i })).toBeNull());
    expect(screen.getByRole('navigation', { name: /admin sections/i }).querySelector('.countbadge')).toBeNull();
    expect(document.title).toBe('Admin · Trouble Brewing');
  });

  it('checks again every minute', async () => {
    const spy = vi.spyOn(window, 'setInterval');
    renderAdmin();
    await screen.findByRole('region', { name: /new since you last looked/i });
    expect(spy.mock.calls.some(([, ms]) => ms === REFRESH_MS)).toBe(true);
    spy.mockRestore();
  });

  it('shows nothing new when there is nothing new', async () => {
    db.tables.wishes = [];
    db.tables.submissions = [];
    renderAdmin();
    await waitFor(() => expect(db.queries.some((q) => q.head)).toBe(true));
    expect(screen.queryByRole('region', { name: /new since you last looked/i })).toBeNull();
    expect(document.querySelector('.countbadge')).toBeNull();
  });
});
