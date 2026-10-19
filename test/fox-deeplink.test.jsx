import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/* Fox deep links for the printed QR table cards: ?fox=open|quiz|surprise|wish
   (+ &src=table) open his card straight to a view on any page, are tracked,
   and are cleaned out of the address bar. */

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { track } = await import('../src/lib/analytics.js');
const FoxGuide = (await import('../src/components/FoxGuide.jsx')).default;
const { MenuWish } = await import('../src/components/FoxWish.jsx');
const { FOX_VIEWS, parseFoxLink, stripFoxParams } = await import('../src/lib/foxDeepLink.js');

const renderAt = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="*" element={<><MenuWish /><FoxGuide /></>} /></Routes>
  </MemoryRouter>,
);
const card = () => screen.getByRole('dialog', { name: /Ask the fox|Make a wish/ });
const deeplinks = () => track.mock.calls.filter(([ev]) => ev === 'fox_deeplink').map(([, p]) => p);

let replace;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
  track.mockClear();
  replace = vi.spyOn(window.history, 'replaceState');
});
afterEach(() => { cleanup(); replace.mockRestore(); window.history.pushState({}, '', '/'); });

describe('parsing', () => {
  it('knows the four views, any case, and a short src', async () => {
    expect(FOX_VIEWS).toEqual(['open', 'quiz', 'surprise', 'wish']);
    expect(parseFoxLink('?fox=quiz&src=table')).toEqual({ view: 'quiz', src: 'table' });
    expect(parseFoxLink('?fox=SURPRISE')).toEqual({ view: 'surprise', src: null });
    expect(parseFoxLink('?fox=wish&src=menu')).toEqual({ view: 'wish', src: 'menu' });
    expect(parseFoxLink('?fox=open&src=a%20very%20long%20source%20name%20indeed')).toEqual({ view: 'open', src: null });
    expect(parseFoxLink('?fox=dance&src=table')).toEqual({ view: 'open', src: 'table' }); // unknown: home view
    expect(parseFoxLink('?fox=')).toEqual({ view: 'open', src: null });
    expect(parseFoxLink('?src=table')).toEqual({ view: null, src: 'table' }); // tracked, opens nothing
    expect(parseFoxLink('?src=<script>')).toBeNull();
    expect(parseFoxLink('?preview=1')).toBeNull();
    expect(parseFoxLink('')).toBeNull();
  });

  it('strips only fox and src from the address', async () => {
    expect(stripFoxParams('https://x.test/menu?fox=quiz&src=table')).toBe('/menu');
    expect(stripFoxParams('https://x.test/menu?preview=1&fox=wish#drinks')).toBe('/menu?preview=1#drinks');
  });
});

describe('opening the card', () => {
  it('?fox=open opens the home view and tracks the table-card scan', async () => {
    window.history.pushState({}, '', '/events?fox=open&src=table');
    renderAt('/events?fox=open&src=table');
    expect(screen.getByRole('button', { name: /close the fox/i }).getAttribute('aria-expanded')).toBe('true');
    expect(card().querySelector('.fox-help__say').textContent).toMatch(/What can I help you with|Ask me anything/);
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'open', src: 'table' }]));
    expect(replace).toHaveBeenCalledWith(expect.anything(), '', '/events');
  });

  it('?fox=quiz opens "Pick my drink"', async () => {
    window.history.pushState({}, '', '/?fox=quiz&src=table');
    renderAt('/?fox=quiz&src=table');
    expect(await within(card()).findByTestId('fox-quiz')).toBeTruthy();
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'quiz', src: 'table' }]));
    expect(replace.mock.calls.at(-1)[2]).toBe('/');
  });

  it('?fox=surprise pours a surprise', async () => {
    window.history.pushState({}, '', '/menu?fox=surprise');
    renderAt('/menu?fox=surprise');
    expect(await within(card()).findByTestId('fox-surprise')).toBeTruthy();
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'surprise' }]));
    expect(replace.mock.calls.at(-1)[2]).toBe('/menu');
  });

  it('?fox=wish opens the wish form with focus in the text field, even if the fox was hidden', async () => {
    localStorage.setItem('tb-fox-hidden', '1');
    window.history.pushState({}, '', '/?fox=wish&src=table');
    renderAt('/?fox=wish&src=table');
    expect(within(card()).getByTestId('fox-wish').dataset.stage).toBe('form');
    expect(card().getAttribute('aria-labelledby')).toBeTruthy();
    expect(within(card()).getByRole('heading', { name: 'Make a wish' })).toBeTruthy();
    const input = within(card()).getByLabelText('Your wish');
    await waitFor(() => expect(document.activeElement).toBe(input));
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'wish', src: 'table' }]));
    expect(localStorage.getItem('tb-fox-hidden')).toBe('1'); // their saved choice is untouched
  });

  it('an unknown ?fox= value opens the home view, without errors', async () => {
    window.history.pushState({}, '', '/?fox=dance&src=table');
    renderAt('/?fox=dance&src=table');
    expect(card().querySelector('.fox-help__say').textContent).toMatch(/What can I help you with|Ask me anything/);
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'open', src: 'table' }]));
  });

  it('/menu?src=table opens nothing, but counts the scan once and cleans the address', async () => {
    window.history.pushState({}, '', '/menu?src=table');
    renderAt('/menu?src=table');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'page', src: 'table' }]));
    expect(replace.mock.calls.at(-1)[2]).toBe('/menu');
  });

  it('a first-time visitor’s hello bubble never covers a deep link', async () => {
    vi.useFakeTimers();
    try {
      localStorage.removeItem('tb-fox-met');
      renderAt('/?fox=quiz&src=table');
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.queryByText(/I’m the Trouble fox/)).toBeNull();
      fireEvent.keyDown(document, { key: 'Escape' });
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.queryByText(/I’m the Trouble fox/)).toBeNull();
      expect(deeplinks()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('while the menu is still loading, says so instead of an empty card, then shows the quiz', async () => {
    const menu = await import('../src/lib/menuService.js');
    let release;
    const slow = vi.spyOn(menu, 'getMenu').mockImplementation(() => new Promise((r) => { release = r; }));
    try {
      renderAt('/?fox=quiz&src=table');
      expect(card().querySelector('.fox-help__say').textContent).toMatch(/checking today’s menu/);
      await waitFor(() => expect(release).toBeTypeOf('function'));
      const { MENU_ITEMS } = await import('../src/lib/seed.js');
      await act(async () => { release(MENU_ITEMS); });
      expect(await within(card()).findByTestId('fox-quiz')).toBeTruthy();
    } finally {
      slow.mockRestore();
    }
  });

  it('a page without ?fox leaves him closed and tracks nothing', async () => {
    renderAt('/menu');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(deeplinks()).toEqual([]);
    expect(replace).not.toHaveBeenCalled();
  });

  it('?fox=wish still opens the fox’s wish on a page that has its own wish block', async () => {
    window.history.pushState({}, '', '/menu?fox=wish&src=table');
    renderAt('/menu?fox=wish&src=table');
    expect(screen.getByRole('heading', { name: /Don’t see your favorite/ })).toBeTruthy();
    expect(within(card()).getByTestId('fox-wish').dataset.stage).toBe('form');
    await waitFor(() => expect(deeplinks()).toEqual([{ to: 'wish', src: 'table' }]));
  });
});
