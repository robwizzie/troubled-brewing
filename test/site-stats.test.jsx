import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* First-party, cookieless stats (src/lib/siteStats.js) and the admin's
   "Site stats" page. Supabase is configured with a fake URL/key; fetch and
   sendBeacon are spies, so we can read exactly what would leave the browser. */

const fake = vi.hoisted(() => ({ rows: [], error: null }));

vi.mock('../src/lib/supabase.js', () => {
  const b = {
    select: () => b, gte: () => b, order: () => b, limit: () => b,
    then: (res, rej) => Promise.resolve(fake.error ? { data: null, error: fake.error } : { data: fake.rows, error: null }).then(res, rej),
  };
  return {
    isSupabaseConfigured: true,
    supabase: { from: () => b },
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJ.test.key',
  };
});

const stats = await import('../src/lib/siteStats.js');
const { track } = await import('../src/lib/analytics.js');
const { summarize, isoMinus } = await import('../src/admin/lib/stats.js');
const SiteStats = (await import('../src/admin/managers/SiteStats.jsx')).default;

let fetchSpy;
const sent = () => fetchSpy.mock.calls.map(([url, opts]) => ({ url, opts, rows: JSON.parse(opts.body) }));

beforeEach(() => {
  vi.useFakeTimers();
  stats._resetStatsForTests();
  fetchSpy = vi.fn(() => Promise.resolve({ ok: true }));
  vi.stubGlobal('fetch', fetchSpy);
  window.history.replaceState(null, '', '/menu');
  Object.defineProperty(window.navigator, 'webdriver', { value: false, configurable: true });
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

describe('track() also counts, privately', () => {
  it('records whitelisted events with only a small key — never item names or titles', () => {
    track('order_now_click', { location: 'fox_quiz', item: 'Iced Chai Latte' });
    track('add_to_calendar', { method: 'google', event_title: 'Open Mic Night' });
    vi.advanceTimersByTime(stats.FLUSH_MS);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [{ url, opts, rows }] = sent();
    expect(url).toBe('https://proj.supabase.co/rest/v1/rpc/increment_stats');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('omit');
    expect(opts.headers['Content-Type']).toBe('text/plain');
    expect(rows.map((r) => [r.e, r.k, r.n])).toEqual([['order_now_click', 'fox_quiz', 1], ['add_to_calendar', 'google', 1]]);
    expect(opts.body).not.toMatch(/Chai|Open Mic/);
    expect(rows[0].d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ignores events that are not on the list', () => {
    track('fox_hide');
    track('gallery_piece_open', { piece: 'x', title: 'A painting' });
    stats.recordStat('anything_else', {});
    vi.advanceTimersByTime(stats.FLUSH_MS * 2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('turns free text into plain tokens or "other", and unknown pages into /other', () => {
    expect(stats.statPath('/menu/')).toBe('/menu');
    expect(stats.statPath('/MENU?x=1')).toBe('/menu');
    expect(stats.statPath('/some/typo-page')).toBe('/other');
    expect(stats.STAT_EVENTS.outbound_click({ dest: 'social_instagram' })).toBe('social_instagram');
    expect(stats.STAT_EVENTS.outbound_click({ dest: 'Mrs. Smith’s bakery' })).toBe('other');
    expect(stats.STAT_EVENTS.fox_question({ question: 'quiz' })).toBe('quiz');
  });

  it('buckets Order clicks by where they came from', () => {
    expect(stats.orderSource('fox_quiz', '/menu')).toBe('fox_quiz');
    expect(stats.orderSource('fox', '/')).toBe('surprise');
    expect(stats.orderSource('menu_pairings_strip', '/menu')).toBe('pairings');
    expect(stats.orderSource('hero', '/')).toBe('home');
    expect(stats.orderSource('menu_list', '/menu')).toBe('menu');
    expect(stats.orderSource('nav-bar', '/events')).toBe('nav');
    expect(stats.orderSource('cta', '/events')).toBe('other');
  });

  it('batches: many events, one request every few seconds, counts added up', () => {
    track('menu_view');
    track('menu_view');
    track('order_now_click', { location: 'menu_list' });
    vi.advanceTimersByTime(stats.FLUSH_MS - 10);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sent()[0].rows.map((r) => [r.e, r.k, r.n])).toEqual([['menu_view', '', 2], ['order_now_click', 'menu', 1]]);
    track('menu_view');
    vi.advanceTimersByTime(stats.FLUSH_MS);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('on page hide it sends through sendBeacon (text/plain, key in the query)', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'sendBeacon', { value: beacon, configurable: true });
    track('gift_card_click', { location: 'gift-cards-hero' });
    window.dispatchEvent(new Event('pagehide'));
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0];
    expect(url).toBe('https://proj.supabase.co/rest/v1/rpc/increment_stats?apikey=eyJ.test.key');
    expect(blob.type).toBe('text/plain');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(stats.FLUSH_MS);
    expect(fetchSpy).not.toHaveBeenCalled(); // already sent
    delete window.navigator.sendBeacon;
  });

  it('never sends from /admin', () => {
    window.history.replaceState(null, '', '/admin/stats');
    track('order_now_click', { location: 'menu_list' });
    stats.recordStat('page_view', { path: '/admin/stats' });
    vi.advanceTimersByTime(stats.FLUSH_MS * 2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never sends from automated browsers (navigator.webdriver)', () => {
    Object.defineProperty(window.navigator, 'webdriver', { value: true, configurable: true });
    track('menu_view');
    vi.advanceTimersByTime(stats.FLUSH_MS * 2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses no cookies or storage, and fails silently', () => {
    fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
    const before = document.cookie;
    track('menu_view');
    expect(() => vi.advanceTimersByTime(stats.FLUSH_MS)).not.toThrow();
    expect(document.cookie).toBe(before);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe('nothing is sent without Supabase', () => {
  it('is a no-op when the site has no database configured', async () => {
    vi.resetModules();
    vi.doMock('../src/lib/supabase.js', () => ({ isSupabaseConfigured: false, supabase: null, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
    const s = await import('../src/lib/siteStats.js');
    s.recordStat('menu_view', {});
    vi.advanceTimersByTime(s.FLUSH_MS * 2);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.doUnmock('../src/lib/supabase.js');
  });
});

/* ---- the admin page ------------------------------------------------------ */
const TODAY = '2026-10-19';
function sampleRows() {
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const day = isoMinus(TODAY, i);
    rows.push({ day, event: 'page_view', key: '/', count: 40 + i });
    rows.push({ day, event: 'page_view', key: '/menu', count: 20 });
  }
  rows.push({ day: TODAY, event: 'order_now_click', key: 'fox_quiz', count: 23 });
  rows.push({ day: TODAY, event: 'order_now_click', key: 'menu', count: 9 });
  rows.push({ day: TODAY, event: 'fox_question', key: 'quiz', count: 31 });
  rows.push({ day: TODAY, event: 'fox_quiz_done', key: '', count: 26 });
  rows.push({ day: TODAY, event: 'poll_vote', key: '', count: 12 });
  rows.push({ day: TODAY, event: 'gift_card_click', key: 'gift-cards-hero', count: 4 });
  rows.push({ day: isoMinus(TODAY, 30), event: 'page_view', key: '/', count: 999 }); // outside 7 days
  return rows;
}

describe('summarize()', () => {
  it('adds up the period and writes one plain-English line', () => {
    const s = summarize(sampleRows(), 7, TODAY);
    expect(s.daily).toHaveLength(7);
    expect(s.views).toBe(7 * 60 + 21);
    expect(s.topPages[0]).toMatchObject({ path: '/', label: 'Home' });
    expect(s.orders).toBe(32);
    expect(s.fox).toMatchObject({ quizStarted: 31, quizFinished: 26, pollVotes: 12 });
    expect(s.extras.giftCards).toBe(4);
    expect(s.summary).toMatch(/The fox quiz led to 23 order clicks\./);
    expect(s.summary).toMatch(/this week/);
  });

  it('says so when there is nothing yet', () => {
    expect(summarize([], 30, TODAY).summary).toMatch(/No visits counted in the last 30 days yet/);
  });
});

describe('the Site stats page', () => {
  beforeEach(() => vi.useRealTimers());

  it('renders from sample data', () => {
    render(<MemoryRouter><SiteStats sample={sampleRows()} today={TODAY} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Site stats' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/The fox quiz led to 23 order clicks/);
    expect(screen.getByText(/Sample numbers/)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Pages opened per day' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Top pages' }).textContent).toMatch(/Home/);
    expect(screen.getByRole('list', { name: /Order clicks by where/ }).textContent).toMatch(/Fox quiz23/);
    expect(screen.getByText('Gift card clicks').nextElementSibling.textContent).toBe('4');
    fireEvent.click(screen.getByRole('button', { name: '30 days' }));
    expect(screen.getByRole('status').textContent).toMatch(/in the last 30 days/);
  });

  it('reads site_stats for the chosen range', async () => {
    fake.rows = sampleRows();
    fake.error = null;
    render(<MemoryRouter><SiteStats today={TODAY} /></MemoryRouter>);
    expect(await screen.findByText(/The fox quiz led to 23 order clicks/)).toBeTruthy();
  });

  it('before the migration runs it explains instead of erroring', async () => {
    fake.error = { code: 'PGRST205', message: "Could not find the table 'public.site_stats' in the schema cache" };
    render(<MemoryRouter><SiteStats today={TODAY} /></MemoryRouter>);
    expect(await screen.findByText('Not switched on yet')).toBeTruthy();
    fake.error = null;
  });

  it('a real error gets a friendly message and a retry', async () => {
    fake.error = { code: '500', message: 'boom' };
    render(<MemoryRouter><SiteStats today={TODAY} /></MemoryRouter>);
    expect(await screen.findByText('Couldn’t load the numbers')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    fake.error = null;
  });
});
