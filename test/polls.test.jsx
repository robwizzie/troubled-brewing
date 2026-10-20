import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* "This or that" polls: the fox's poll card (FoxPoll) and the admin's
   "This or that polls" screen. Supabase is a recording fake: `db` holds the
   rows, `missing` makes every polls query fail like a missing table, and
   `log` lists every write. */

const fake = vi.hoisted(() => {
  const state = { db: {}, log: [], missing: false, votes: { a: 0, b: 0 }, voteError: null, rpcLog: [] };
  const missingErr = { code: 'PGRST205', message: "Could not find the table 'public.polls' in the schema cache" };
  function from(table) {
    let op = 'select';
    const filters = [];
    const run = () => {
      if (state.missing && (table === 'polls' || table === 'poll_votes')) return { data: null, error: missingErr };
      if (op === 'select') {
        const r = (state.db[table] || []).filter((row) => filters.every(([c, v]) => String(row[c]) === String(v)));
        return { data: r, error: null };
      }
      if (op === 'insert' && table === 'poll_votes') return { data: null, error: state.voteError };
      return { data: null, error: null };
    };
    const b = {
      select: () => b,
      insert: (p) => { op = 'insert'; state.log.push({ table, op, payload: p }); return b; },
      update: (p) => { op = 'update'; state.log.push({ table, op, payload: p, filters }); return b; },
      eq: (c, v) => { filters.push([c, v]); return b; },
      order: () => b,
      gte: () => b,
      limit: () => b,
      maybeSingle: async () => { const r = run(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  }
  const supabase = {
    from,
    rpc: async (fn, args) => {
      state.rpcLog.push({ fn, args });
      if (state.missing) return { data: null, error: { code: 'PGRST202', message: 'function not found' } };
      const { a, b } = state.votes;
      return { data: [{ a, b, total: a + b }], error: null };
    },
    auth: {
      getUser: async () => ({ data: { user: { email: 'owner@test' } } }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
  return { state, supabase };
});

vi.mock('../src/lib/supabase.js', () => ({ isSupabaseConfigured: true, supabase: fake.supabase, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));

const { track } = await import('../src/lib/analytics.js');
const polls = await import('../src/lib/polls.js');
const FoxPoll = (await import('../src/components/FoxPoll.jsx')).default;
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnsavedProvider, EditScreen } = await import('../src/admin/lib/publishing.jsx');
const PollsManager = (await import('../src/admin/managers/PollsManager.jsx')).default;
const { shopNow } = await import('../src/lib/hours.js');

const today = shopNow().isoDate;
const POLL = { id: 'p1', question: 'Iced or hot today?', option_a: 'Iced', option_b: 'Hot', icon_a: 'iced', icon_b: 'hot', starts_on: null, ends_on: null, status: 'published', created_at: '2026-10-01T00:00:00Z' };
const writes = (table) => fake.state.log.filter((w) => w.table === table);

beforeEach(() => {
  fake.state.db = {};
  fake.state.log.length = 0;
  fake.state.rpcLog.length = 0;
  fake.state.missing = false;
  fake.state.voteError = null;
  fake.state.votes = { a: 0, b: 0 };
  window.localStorage.clear();
  track.mockClear();
});
afterEach(() => cleanup());

/* ------------------------------------------------------------------------- */
describe('poll rules', () => {
  it('picks the running poll that started most recently, on the shop’s clock', () => {
    const list = [
      { ...POLL, id: 'old', starts_on: '2026-10-01' },
      { ...POLL, id: 'new', starts_on: '2026-10-18' },
      { ...POLL, id: 'future', starts_on: '2026-10-25' },
      { ...POLL, id: 'over', starts_on: '2026-10-10', ends_on: '2026-10-12' },
      { ...POLL, id: 'draft', status: 'draft', starts_on: '2026-10-19' },
      { ...POLL, id: 'ended', status: 'ended' },
    ];
    expect(polls.pickActivePoll(list, '2026-10-19').id).toBe('new');
    expect(polls.pickActivePoll(list, '2026-10-12').id).toBe('over');
    expect(polls.pickActivePoll([], '2026-10-19')).toBeNull();
    expect(polls.pollPhase(list[2], '2026-10-19')).toBe('scheduled');
    expect(polls.pollPhase(list[3], '2026-10-19')).toBe('finished');
    expect(polls.pollPhase(list[5], '2026-10-19')).toBe('ended');
  });

  it('percentages always add up to 100', () => {
    expect(polls.percents(1, 2)).toEqual({ a: 33, b: 67, total: 3 });
    expect(polls.percents(0, 0)).toEqual({ a: 0, b: 0, total: 0 });
    expect(polls.percents(5, 0)).toEqual({ a: 100, b: 0, total: 5 });
  });

  it('has six menu-based suggestions with icons from the set, and no emoji', () => {
    expect(polls.SUGGESTED_POLLS).toHaveLength(6);
    const ids = new Set(polls.POLL_ICONS.map((i) => i.id));
    for (const s of polls.SUGGESTED_POLLS) {
      expect(ids.has(s.icon_a) && ids.has(s.icon_b)).toBe(true);
      expect(`${s.question}${s.option_a}${s.option_b}`).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('makes one random voter id per browser, and survives storage failing', () => {
    const a = polls.voterId();
    expect(a).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(polls.voterId()).toBe(a);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(polls.voterId()).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(polls.myVote('p1')).toBeNull();
    spy.mockRestore();
  });
});

/* ------------------------------------------------------------------------- */
describe('the fox’s poll card', () => {
  it('shows today’s poll with two big buttons', async () => {
    fake.state.db.polls = [POLL];
    render(<FoxPoll />);
    expect(await screen.findByRole('heading', { name: 'Iced or hot today?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iced' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hot' })).toBeTruthy();
    expect(screen.queryByText(/votes so far/)).toBeNull();
  });

  it('a vote sends only the poll, the choice and a random id, then shows the bars', async () => {
    fake.state.db.polls = [POLL];
    fake.state.votes = { a: 6, b: 4 }; // after this vote
    render(<FoxPoll />);
    fireEvent.click(await screen.findByRole('button', { name: 'Iced' }));
    expect(await screen.findByText('10 votes so far')).toBeTruthy();
    const [w] = writes('poll_votes');
    expect(Object.keys(w.payload).sort()).toEqual(['choice', 'poll_id', 'voter_hash']);
    expect(w.payload).toMatchObject({ poll_id: 'p1', choice: 'a' });
    expect(w.payload.voter_hash).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText(/your pick/)).toBeTruthy();
    expect(screen.getByText(/You and most folks agree: Iced\./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Iced' })).toBeNull();
    expect(track).toHaveBeenCalledWith('poll_vote', expect.objectContaining({ choice: 'Iced' }));
  });

  it('one vote per browser: coming back shows the results, never the buttons', async () => {
    fake.state.db.polls = [POLL];
    fake.state.votes = { a: 1, b: 3 };
    render(<FoxPoll />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hot' }));
    await screen.findByText('4 votes so far');
    cleanup();
    render(<FoxPoll />);
    expect(await screen.findByText('4 votes so far')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Hot' })).toBeNull();
    expect(writes('poll_votes')).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem(polls.VOTED_KEY))).toEqual({ p1: 'b' });
  });

  it('a second vote the database turns away (same browser id) still shows results', async () => {
    fake.state.db.polls = [POLL];
    fake.state.voteError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    fake.state.votes = { a: 2, b: 2 };
    render(<FoxPoll />);
    fireEvent.click(await screen.findByRole('button', { name: 'Iced' }));
    expect(await screen.findByText(/Dead heat/)).toBeTruthy();
  });

  it('a failed vote keeps the buttons and says so', async () => {
    fake.state.db.polls = [POLL];
    fake.state.voteError = { code: '42501', message: 'new row violates row-level security policy' };
    render(<FoxPoll />);
    fireEvent.click(await screen.findByRole('button', { name: 'Iced' }));
    expect(await screen.findByText(/didn’t go through/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iced' })).toBeTruthy();
    expect(polls.myVote('p1')).toBeNull();
  });

  it('is hidden when no poll is running', async () => {
    fake.state.db.polls = [{ ...POLL, starts_on: '2999-01-01' }];
    const { container } = render(<FoxPoll />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe('');
  });

  it('is hidden, without errors, before the migration runs (no polls table)', async () => {
    fake.state.missing = true;
    const err = vi.spyOn(console, 'error');
    const { container } = render(<FoxPoll />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe('');
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

/* ------------------------------------------------------------------------- */
function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={['/admin/polls']}>
      <ToastProvider>
        <UnsavedProvider>
          <EditScreen><PollsManager /></EditScreen>
        </UnsavedProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}
const publishBtn = () => screen.getByRole('button', { name: /^publish$/i });

describe('admin: This or that polls', () => {
  it('suggestions only fill the form; nothing is written until Publish', async () => {
    fake.state.db.polls = [];
    renderAdmin();
    await screen.findByRole('heading', { name: 'This or that polls' });
    const ideas = screen.getByText(/Need ideas\?/).closest('details');
    expect(within(ideas).getAllByRole('button')).toHaveLength(6);
    fireEvent.click(within(ideas).getByRole('button', { name: /Matcha or chai\?/ }));
    expect(screen.getByLabelText('Question', { selector: 'input' }).value).toBe('Matcha or chai?');
    expect(fake.state.log).toHaveLength(0);
    expect(publishBtn().disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Add this poll' }));
    expect(screen.getByText('New, not published yet')).toBeTruthy();
    // choose when it runs: now, until ended
    fireEvent.click(screen.getByLabelText('Now, until I end it'));
    expect(fake.state.log).toHaveLength(0);
    expect(publishBtn().disabled).toBe(false);

    fireEvent.click(publishBtn());
    await screen.findByText(/published — live on the site now/i);
    const ins = writes('polls').filter((w) => w.op === 'insert');
    expect(ins).toHaveLength(1);
    expect(ins[0].payload).toMatchObject({
      question: 'Matcha or chai?', option_a: 'Matcha', option_b: 'Chai', icon_a: 'leaf', icon_b: 'spice',
      status: 'published', starts_on: today, ends_on: null,
    });
    expect(ins[0].payload.id).toBeUndefined();
  });

  it('a poll added but left “Not yet” is saved as a draft (hidden) on Publish', async () => {
    fake.state.db.polls = [];
    renderAdmin();
    await screen.findByRole('heading', { name: 'This or that polls' });
    fireEvent.change(screen.getByLabelText('Question', { selector: 'input' }), { target: { value: 'Muffin or scone?' } });
    fireEvent.change(screen.getByLabelText('First answer', { selector: 'input' }), { target: { value: 'Muffin' } });
    fireEvent.change(screen.getByLabelText('Second answer', { selector: 'input' }), { target: { value: 'Scone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this poll' }));
    fireEvent.click(publishBtn());
    await screen.findByText(/published — live on the site now/i);
    expect(writes('polls')[0].payload).toMatchObject({ question: 'Muffin or scone?', status: 'draft', icon_a: null });
  });

  it('shows results, and End now / Archive wait for Publish', async () => {
    fake.state.db.polls = [POLL];
    fake.state.votes = { a: 3, b: 1 };
    renderAdmin();
    expect(await screen.findByText('In the fox now')).toBeTruthy();
    expect(await screen.findByText('4 votes in all')).toBeTruthy();
    expect(screen.getByText(/75%/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /End now/ }));
    expect(fake.state.log).toHaveLength(0);
    expect(screen.getByText('Changed — not live yet')).toBeTruthy();
    fireEvent.click(publishBtn());
    await screen.findByText(/published — live on the site now/i);
    const up = writes('polls').filter((w) => w.op === 'update');
    expect(up).toHaveLength(1);
    expect(up[0].payload.status).toBe('ended');
    expect(up[0].filters).toEqual([['id', 'p1']]);
  });

  it('Discard puts everything back', async () => {
    fake.state.db.polls = [POLL];
    renderAdmin();
    await screen.findByText('In the fox now');
    fireEvent.click(screen.getByRole('button', { name: /Archive/ }));
    expect(screen.getAllByText('Archived').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^discard$/i }));
    fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));
    expect(await screen.findByText('In the fox now')).toBeTruthy();
    expect(fake.state.log).toHaveLength(0);
  });

  it('before the migration runs it explains, instead of erroring', async () => {
    fake.state.missing = true;
    renderAdmin();
    expect(await screen.findByText('Not switched on yet')).toBeTruthy();
    expect(screen.getByText(/2026-10-19-polls-and-stats\.sql/)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------------- */
describe('in the fox’s card', () => {
  it('sits on the home view under the game tiles, and folds away for a game', async () => {
    const FoxGuide = (await import('../src/components/FoxGuide.jsx')).default;
    fake.state.db.polls = [POLL];
    window.localStorage.setItem('tb-fox-met', '1');
    render(<MemoryRouter><FoxGuide /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Ask the fox/ }));
    const q = await screen.findByRole('heading', { name: 'Iced or hot today?' }, { timeout: 3000 });
    const tiles = screen.getByRole('list', { name: 'Fox games' });
    // after the tiles in the card, before the questions
    expect(tiles.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(tiles).getByRole('button', { name: /Pick my drink/ }));
    expect(screen.queryByRole('heading', { name: 'Iced or hot today?' })).toBeNull();
  });
});
