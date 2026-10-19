import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';

/* The wish list, the fox's tricks and his deep links in the shop's own site
   stats: the events are counted (with small keys), the database whitelist
   agrees, and Site stats shows "Table card scans" and "Menu wishes". */

vi.mock('../src/lib/supabase.js', () => {
  const b = { select: () => b, gte: () => b, order: () => b, limit: () => b, then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej) };
  return { isSupabaseConfigured: true, supabase: { from: () => b, rpc: async () => ({ data: 'ok', error: null }) }, SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_ANON_KEY: 'eyJ.test.key' };
});

const stats = await import('../src/lib/siteStats.js');
const { track } = await import('../src/lib/analytics.js');
const { summarize } = await import('../src/admin/lib/stats.js');
const SiteStats = (await import('../src/admin/managers/SiteStats.jsx')).default;
const FoxGuide = (await import('../src/components/FoxGuide.jsx')).default;

let fetchSpy;
const sentRows = () => fetchSpy.mock.calls.flatMap(([, opts]) => JSON.parse(opts.body)).map((r) => [r.e, r.k]);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  stats._resetStatsForTests();
  fetchSpy = vi.fn(() => Promise.resolve({ ok: true }));
  vi.stubGlobal('fetch', fetchSpy);
  window.history.replaceState(null, '', '/');
  Object.defineProperty(window.navigator, 'webdriver', { value: false, configurable: true });
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); cleanup(); });

describe('counted in site stats', () => {
  it('wish_submitted, fox_trick and fox_deeplink carry only a small key', () => {
    track('wish_submitted', { category: 'pastry' });
    track('fox_trick', { name: 'hat_tip' });
    track('fox_deeplink', { to: 'quiz', src: 'table' });
    track('fox_deeplink', { to: 'page', src: 'table' });
    track('fox_deeplink', { to: 'wish' });
    vi.advanceTimersByTime(stats.FLUSH_MS);
    expect(sentRows()).toEqual([
      ['wish_submitted', 'pastry'], ['fox_trick', 'hat_tip'],
      ['fox_deeplink', 'table:quiz'], ['fox_deeplink', 'table:page'], ['fox_deeplink', 'direct:wish'],
    ]);
  });

  it('a table-card deep link on first load is counted once, before App’s analytics has run', () => {
    window.history.replaceState(null, '', '/?fox=quiz&src=table');
    render(<MemoryRouter initialEntries={['/?fox=quiz&src=table']}><FoxGuide /></MemoryRouter>);
    vi.advanceTimersByTime(stats.FLUSH_MS);
    expect(sentRows().filter(([e]) => e === 'fox_deeplink')).toEqual([['fox_deeplink', 'table:quiz']]);
    expect(window.location.search).toBe('');
  });

  it('a NEW migration extends the database whitelist with the same three events', () => {
    const sql = readFileSync('supabase/migrations/2026-10-19-stats-events-wishes.sql', 'utf8');
    expect(sql).toMatch(/create or replace function public.increment_stat\(/);
    expect(sql).toMatch(/create or replace function public.increment_stats\(text\)/);
    expect(sql).toMatch(/grant execute on function public.increment_stats\(text\) to anon, authenticated/);
    expect(readFileSync('supabase/migrations/2026-10-19-polls-and-stats.sql', 'utf8')).not.toMatch(/'fox_deeplink'/); // the live one is untouched
    for (const e of ['wish_submitted', 'fox_trick', 'fox_deeplink']) {
      expect(Object.keys(stats.STAT_EVENTS)).toContain(e);
      expect(sql).toMatch(new RegExp(`'${e}'`));
    }
  });
});

describe('Site stats page', () => {
  const today = '2026-10-19';
  const rows = [
    { day: today, event: 'fox_deeplink', key: 'table:quiz', count: 5 },
    { day: today, event: 'fox_deeplink', key: 'table:page', count: 3 },
    { day: today, event: 'fox_deeplink', key: 'direct:wish', count: 4 }, // not a table card
    { day: '2026-10-18', event: 'wish_submitted', key: 'drink', count: 6 },
    { day: today, event: 'wish_submitted', key: 'pastry', count: 1 },
    { day: '2026-01-01', event: 'wish_submitted', key: 'drink', count: 99 }, // out of range
  ];

  it('sums table-card scans and menu wishes', () => {
    const s = summarize(rows, 7, today);
    expect(s.extras.tableScans).toBe(8);
    expect(s.extras.wishes).toBe(7);
  });

  it('shows "Table card scans" and "Menu wishes" tiles', async () => {
    vi.useRealTimers();
    render(<MemoryRouter><SiteStats sample={rows} /></MemoryRouter>);
    const tile = async (label) => (await screen.findByText(label)).closest('.stats-tile');
    expect((await tile('Table card scans')).querySelector('.stats-tile__num')).toBeTruthy();
    expect((await tile('Menu wishes')).querySelector('.stats-tile__num')).toBeTruthy();
  });
});
