import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';

/* "Make a wish for the menu": the anti-spam layers, the fox's reply, the
   one-a-day rule, the graceful send, the admin's grouping / CSV helpers,
   the pane's form → fold → drop → thank-you flow, and the migration. */

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const rpc = vi.hoisted(() => ({ fn: null }));
vi.mock('../src/lib/supabase.js', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: (...args) => rpc.fn(...args) },
}));
const { track } = await import('../src/lib/analytics.js');
const W = await import('../src/lib/wishes.js');
const FoxWish = (await import('../src/components/FoxWish.jsx')).default;
const { FOLD_MS, DROP_MS } = await import('../src/components/FoxWish.jsx');

const ok = (over = {}) => W.checkWish({ category: 'drink', text: 'Lavender honey latte', elapsedMs: 5000, ...over });

beforeEach(() => {
  localStorage.clear();
  track.mockClear();
  rpc.fn = vi.fn(async () => ({ data: 'ok', error: null }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('anti-spam, client side', () => {
  it('a normal wish passes, cleaned up', () => {
    const r = W.checkWish({ category: 'pastry', text: '  pistachio   croissant ', why: ' so  good\n', name: ' Sam ', elapsedMs: 4000 });
    expect(r).toEqual({ ok: true, wish: { category: 'pastry', text: 'pistachio croissant', why: 'so good', name: 'Sam' } });
  });

  it('bot signals are silent: the honeypot, and a form filled in under ~3s', () => {
    expect(ok({ honeypot: 'http://spam' })).toEqual({ ok: false, silent: true, code: 'honeypot' });
    expect(ok({ elapsedMs: 900 })).toEqual({ ok: false, silent: true, code: 'too-fast' });
    expect(W.MIN_FORM_MS).toBe(3000);
  });

  it('blocks links, emails and phone numbers in any field', () => {
    for (const bad of ['buy at www.cheap.test', 'see https://x.io', 'spam.com rules', 'mail me a@b.co', 'call 856-555-0199', 'text +1 (856) 555 0199']) {
      const r = ok({ text: bad });
      expect(r.ok, bad).toBe(false);
      expect(r.code, bad).toBe('contact');
    }
    expect(ok({ why: 'more at bit.ly/x' }).field).toBe('why');
    expect(ok({ name: 'sam@x.com' }).field).toBe('name');
    expect(ok({ text: '2 shot latte, 16 oz' }).ok).toBe(true); // ordinary numbers are fine
  });

  it('a small rude-word list, whole words only (cocktails and shitake survive)', () => {
    expect(ok({ text: 'fucking latte' }).code).toBe('rude');
    expect(ok({ text: 'sh1t coffee' }).code).toBe('rude');
    expect(ok({ why: 'because this place is shit' }).code).toBe('rude');
    expect(ok({ text: 'Espresso cocktail night' }).ok).toBe(true);
    expect(ok({ text: 'Shitake mushroom panini' }).ok).toBe(true);
    expect(ok({ text: 'Scunthorpe sausage roll' }).ok).toBe(true);
  });

  it('rejects gibberish: no vowels, the same character 6+ times, mostly symbols', () => {
    expect(W.isGibberish('sdfghjkl')).toBe(true);
    expect(W.isGibberish('latteeeeee')).toBe(true);
    expect(W.isGibberish('!!!??? ###')).toBe(true);
    expect(W.isGibberish('ok')).toBe(true);
    expect(W.isGibberish('Cold brew float')).toBe(false);
    expect(W.isGibberish('Iced chai, extra spicy')).toBe(false);
    expect(ok({ text: 'qwrtzp' }).code).toBe('gibberish');
    expect(ok({ text: '' }).code).toBe('empty');
  });

  it('caps the lengths and whitelists the category', () => {
    const r = W.checkWish({ category: 'weapons', text: 'a'.repeat(3) + ' latte '.repeat(30), why: 'tasty '.repeat(40), name: 'Bartholomew '.repeat(5), elapsedMs: 5000 });
    expect(r.ok).toBe(true);
    expect(r.wish.category).toBe('other');
    expect(r.wish.text.length).toBeLessThanOrEqual(80);
    expect(r.wish.why.length).toBeLessThanOrEqual(140);
    expect(r.wish.name.length).toBeLessThanOrEqual(30);
  });

  it('one wish per browser per shop day', () => {
    const mon = new Date('2026-10-19T15:00:00Z');
    expect(W.wishedToday(mon)).toBe(false);
    W.markWished(mon);
    expect(W.wishedToday(new Date('2026-10-20T03:00:00Z'))).toBe(true); // 11 PM same shop day
    expect(W.wishedToday(new Date('2026-10-20T13:00:00Z'))).toBe(false); // tomorrow
  });

  it('keeps one random browser token, and never anything personal', () => {
    const t = W.browserToken();
    expect(t).toMatch(/^[a-z0-9-]{16,64}$/i);
    expect(W.browserToken()).toBe(t);
  });
});

describe('sending', () => {
  it('calls submit_wish with the cleaned wish and the token', async () => {
    const r = await W.sendWish({ category: 'food', text: 'Caprese panini', why: '', name: 'Ana' });
    expect(r.sent).toBe(true);
    const [fn, args] = rpc.fn.mock.calls[0];
    expect(fn).toBe('submit_wish');
    expect(args).toEqual({ p_category: 'food', p_text: 'Caprese panini', p_why: null, p_first_name: 'Ana', p_token: W.browserToken() });
  });

  it('never throws before the migration runs, or when offline', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.fn = vi.fn(async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.submit_wish' } }));
    await expect(W.sendWish({ category: 'drink', text: 'Mocha' })).resolves.toEqual({ sent: false, reason: 'error' });
    rpc.fn = vi.fn(() => Promise.reject(new Error('offline')));
    await expect(W.sendWish({ category: 'drink', text: 'Mocha' })).resolves.toEqual({ sent: false, reason: 'error' });
    await expect(W.sendWish({ category: 'drink', text: 'Mocha' }, { configured: false })).resolves.toEqual({ sent: false, reason: 'not-configured' });
    warn.mockRestore();
  });
});

describe('the fox’s reply', () => {
  it('puts the wish in his line, with the right article', () => {
    expect(W.foxReply({ category: 'drink', text: 'Lavender Honey Latte' }, () => 0)).toBe('Ooh, a Lavender Honey Latte? I’ll slip it to Tom and Cat.');
    expect(W.foxReply({ category: 'drink', text: 'oat cortado' }, () => 0)).toBe('Ooh, an oat cortado? I’ll slip it to Tom and Cat.');
    expect(W.withArticle('the old scones back')).toBe('the old scones back');
    expect(W.foxReply({ category: 'other', text: 'Board games' }, () => 0)).not.toMatch(/Board games\?/);
    const lines = new Set(Array.from({ length: 4 }, (_, i) => W.foxReply({ category: 'drink', text: 'Mocha' }, () => i / 4)));
    expect(lines.size).toBe(4);
  });
});

describe('admin helpers', () => {
  const rows = [
    { id: 1, category: 'drink', text: 'Lavender latte', status: 'new', created_at: '2026-10-18T10:00:00Z' },
    { id: 2, category: 'drink', text: 'Lavender lattes please!', status: 'new', created_at: '2026-10-17T10:00:00Z' },
    { id: 3, category: 'drink', text: 'Iced lavender latte', status: 'considering', created_at: '2026-10-16T10:00:00Z' },
    { id: 4, category: 'pastry', text: 'Pistachio croissant', status: 'new', created_at: '2026-10-15T10:00:00Z' },
    { id: 5, category: 'pastry', text: 'pistachio croissants', status: 'new', created_at: '2026-09-01T10:00:00Z' },
    { id: 6, category: 'food', text: 'Oat milk', status: 'hidden', created_at: '2026-10-18T10:00:00Z' },
    { id: 7, category: 'drink', text: 'Oat milk latte', status: 'new', created_at: '2026-10-18T11:00:00Z' },
  ];

  it('normalises wishes: lowercase, no punctuation, no filler, singular', () => {
    expect(W.wishTokens('Lavender LATTES, please!')).toEqual(['lavender', 'latte']);
    expect(W.wishTokens('I would love some pastries')).toEqual(['pastry']);
  });

  it('groups similar wishes, most-wished first, leaving hidden ones out', () => {
    const g = W.groupWishes(rows);
    expect(g[0]).toMatchObject({ label: 'Lavender Latte', count: 3, category: 'drink' });
    expect(g[0].ids.sort()).toEqual([1, 2, 3]);
    expect(g[1]).toMatchObject({ label: 'Pistachio Croissant', count: 2 });
    expect(g.flatMap((x) => x.ids)).not.toContain(6);
    expect(g.find((x) => x.ids.includes(7)).count).toBe(1); // "oat milk latte" isn't a lavender latte
  });

  it('counts the last 30 days by kind', () => {
    expect(W.countByCategory(rows, { now: new Date('2026-10-19T12:00:00Z') })).toEqual({ drink: 4, pastry: 1, food: 0, other: 0 });
  });

  it('dates read like a person would say them', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(W.relativeDate('2026-10-19T11:59:40Z', now)).toBe('just now');
    expect(W.relativeDate('2026-10-19T09:00:00Z', now)).toBe('3 hours ago');
    expect(W.relativeDate('2026-10-18T10:00:00Z', now)).toBe('yesterday');
    expect(W.relativeDate('2026-10-17T10:00:00Z', now)).toBe('2 days ago');
  });

  it('exports CSV that a spreadsheet can’t be tricked by', () => {
    const csv = W.wishesToCsv([
      { created_at: '2026-10-18', category: 'drink', text: 'Latte, "big"', why: '=HYPERLINK("x")', first_name: '', status: 'not_now', admin_note: null },
    ]);
    const [head, row] = csv.split('\r\n');
    expect(head).toBe('Date,Category,Wish,Why,First name,Status,Private note');
    expect(row).toBe('2026-10-18,Drink,"Latte, ""big""","\'=HYPERLINK(""x"")",,Not now,');
  });
});

/* ---- the pane --------------------------------------------------------------- */

const renderWish = (props = {}) => render(<MemoryRouter><FoxWish {...props} /></MemoryRouter>);
const motion = (on) => {
  const prev = window.matchMedia;
  window.matchMedia = (q) => ({ ...prev(q), matches: on ? false : q.includes('prefers-reduced-motion') });
  return () => { window.matchMedia = prev; };
};

describe('the wish pane', () => {
  it('is an accessible form: illustrated kind chips, labelled fields, limits, no email or phone', () => {
    renderWish();
    const kinds = screen.getAllByRole('radio');
    expect(kinds.map((r) => r.closest('label').textContent)).toEqual(['Drink', 'Pastry & treats', 'Food', 'Something else']);
    expect(kinds[0].checked).toBe(true);
    expect(kinds[0].closest('label').querySelector('svg')).toBeTruthy();
    const wish = screen.getByLabelText('Your wish');
    expect(wish.maxLength).toBe(80);
    expect(wish.placeholder).toBe('A maple oat latte…');
    expect(screen.getByLabelText(/Why\?/).maxLength).toBe(140);
    expect(screen.getByLabelText(/First name/).maxLength).toBe(30);
    expect(document.querySelector('input[type="email"], input[type="tel"]')).toBeNull();
    const hp = document.querySelector('input[name="website"]');
    expect(hp.tabIndex).toBe(-1);
    expect(hp.closest('[aria-hidden="true"]')).toBeTruthy();
    fireEvent.click(kinds[1]);
    expect(screen.getByLabelText('Your wish').placeholder).toBe('A pistachio croissant…');
  });

  it('a real wish: sent, tracked, thanked, and "wish again tomorrow" (reduced motion skips the fold)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // the first reply line, which quotes the wish
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    renderWish();
    fireEvent.change(screen.getByLabelText('Your wish'), { target: { value: 'Lavender Honey Latte' } });
    now.mockReturnValue(1_005_000);
    fireEvent.click(screen.getByRole('button', { name: 'Drop it in the hat' }));
    now.mockRestore();
    expect(screen.getByTestId('fox-wish').dataset.stage).toBe('thanks');
    expect(screen.getByText('Ooh, a Lavender Honey Latte? I’ll slip it to Tom and Cat.')).toBeTruthy();
    expect(screen.getByText('You can wish again tomorrow.')).toBeTruthy();
    expect(document.activeElement.textContent).toBe('Into the hat it goes!');
    expect(rpc.fn).toHaveBeenCalledWith('submit_wish', expect.objectContaining({ p_text: 'Lavender Honey Latte', p_category: 'drink' }));
    expect(track).toHaveBeenCalledWith('wish_submitted', { category: 'drink' });
    cleanup();
    renderWish(); // the same day: already wished
    expect(screen.getByTestId('fox-wish').dataset.stage).toBe('already');
    expect(screen.getByText(/You can wish again tomorrow/)).toBeTruthy();
  });

  it('a too-fast (bot) submit gets the same thank-you but sends nothing', () => {
    renderWish();
    fireEvent.change(screen.getByLabelText('Your wish'), { target: { value: 'Mocha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Drop it in the hat' }));
    expect(screen.getByTestId('fox-wish').dataset.stage).toBe('thanks');
    expect(rpc.fn).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalledWith('wish_submitted', expect.anything());
  });

  it('a link gets a gentle hint on that field, and focus goes there', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    renderWish();
    now.mockReturnValue(10_000);
    fireEvent.change(screen.getByLabelText('Your wish'), { target: { value: 'Latte' } });
    fireEvent.change(screen.getByLabelText(/Why\?/), { target: { value: 'see www.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Drop it in the hat' }));
    now.mockRestore();
    expect(screen.getByRole('alert').textContent).toMatch(/doesn’t take links, emails or phone numbers/);
    expect(screen.getByLabelText(/Why\?/).getAttribute('aria-invalid')).toBe('true');
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    expect(document.activeElement).toBe(screen.getByLabelText(/Why\?/));
    expect(rpc.fn).not.toHaveBeenCalled();
  });

  it('with motion: the note folds, drops into the hat, then the thank-you', () => {
    const restore = motion(true);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date('2026-10-19T15:00:00Z'));
    try {
      renderWish();
      fireEvent.change(screen.getByLabelText('Your wish'), { target: { value: 'Maple oat latte' } });
      act(() => { vi.advanceTimersByTime(4000); });
      fireEvent.click(screen.getByRole('button', { name: 'Drop it in the hat' }));
      // the button presses down first…
      expect(screen.getByRole('button', { name: 'Drop it in the hat' }).className).toMatch(/is-pressed/);
      act(() => { vi.advanceTimersByTime(130); });
      // …then the note (with the wish on it) folds
      expect(screen.getByTestId('fox-wish').dataset.stage).toBe('fold');
      const note = document.querySelector('.fox-wish__note');
      expect(note.querySelector('.fox-wish__note-text').textContent).toBe('Maple oat latte');
      expect(document.querySelector('.fox-wish__hat--back')).toBeTruthy();
      expect(document.querySelector('.fox-wish__hat--front')).toBeTruthy();
      act(() => { vi.advanceTimersByTime(FOLD_MS); });
      // the same note flies on into the hat (not a new element), sparkles ready
      expect(screen.getByTestId('fox-wish').dataset.stage).toBe('drop');
      expect(document.querySelector('.fox-wish__note')).toBe(note);
      expect(document.querySelectorAll('.fox-wish__spark').length).toBeGreaterThanOrEqual(6);
      act(() => { vi.advanceTimersByTime(DROP_MS); });
      expect(screen.getByTestId('fox-wish').dataset.stage).toBe('thanks');
    } finally {
      restore();
    }
  });
});

describe('the migration', () => {
  const sql = readFileSync('supabase/migrations/2026-10-19-wishes.sql', 'utf8');

  it('is idempotent, with the table, statuses and RLS as specified', () => {
    expect(sql).toMatch(/create table if not exists public\.wishes/);
    for (const col of ['category', 'text', 'why', 'first_name', 'token_hash', 'status', 'created_at', 'updated_at', 'admin_note']) {
      expect(sql).toMatch(new RegExp(`\\n  ${col}\\s`));
    }
    expect(sql).toMatch(/'new', 'considering', 'added', 'not_now', 'hidden'/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.wishes from anon/);
    expect(sql).toMatch(/drop policy if exists "admin read wishes"/);
    expect(sql).toMatch(/for select to authenticated using \(true\)/);
    expect(sql).toMatch(/for update to authenticated using \(true\) with check \(true\)/);
    expect(sql).not.toMatch(/to anon using/);
  });

  it('submit_wish is SECURITY DEFINER, rate-limited, de-duped, and stores no IP', () => {
    expect(sql).toMatch(/create or replace function public\.submit_wish/);
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/>= 3 then/);
    expect(sql).toMatch(/>= 200 then/);
    expect(sql).toMatch(/'duplicate'/);
    expect(sql).toMatch(/md5\('tb-wish:'/);
    expect(sql).toMatch(/grant execute on function public\.submit_wish\(text, text, text, text, text\) to anon/);
    expect(sql.toLowerCase()).not.toMatch(/inet|ip_address|x-forwarded|request\.headers|email text|phone text/);
  });
});
