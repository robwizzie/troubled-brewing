import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* The fox's hidden tricks (src/lib/foxTricks.js): the 5-tap hat tip, the
   late-night sky, the shop's birthday hat. Each one tracks once a visit. */

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { track } = await import('../src/lib/analytics.js');
const FoxGuide = (await import('../src/components/FoxGuide.jsx')).default;
const {
  TIP_GAP_MS, TIP_LINES, TIP_TAPS, firstThisVisit, nightLook, registerTipTap, resetTrickTracking, trickDay,
} = await import('../src/lib/foxTricks.js');
const { HOURS } = await import('../src/lib/seed.js');

const MON_LATE = new Date('2026-10-20T03:30:00Z'); // Mon 11:30 PM EDT, closed
const MON_EVENING = new Date('2026-10-19T23:30:00Z'); // Mon 7:30 PM EDT, closed but early
const TUE_SMALL_HOURS = new Date('2026-10-20T08:30:00Z'); // Tue 4:30 AM EDT
const TUE_DAWN = new Date('2026-10-20T09:10:00Z'); // Tue 5:10 AM EDT
const MON_MORNING = new Date('2026-10-19T14:15:00Z'); // Mon 10:15 AM EDT, open
const BIRTHDAY = new Date('2026-10-13T16:00:00Z'); // Tue Oct 13 2026, noon EDT

// jsdom has no PointerEvent, so a pointerdown would lose its pointerType
if (typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) { super(type, init); this.pointerType = init.pointerType || 'mouse'; }
  };
}

const renderFox = () => render(<MemoryRouter><FoxGuide /></MemoryRouter>);
const fox = () => screen.getByRole('button', { name: /ask the fox|close the fox/i });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
  resetTrickTracking();
  track.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const trickCalls = (name) => track.mock.calls.filter(([ev, p]) => ev === 'fox_trick' && p?.name === name);

describe('the hat tip: 5 quick taps', () => {
  it('counts five taps in a row, each within the gap, then starts over', () => {
    let s = null;
    const tips = [];
    for (let i = 0; i < 10; i += 1) {
      const r = registerTipTap(s, 1000 + i * 300);
      s = r.state;
      tips.push(r.tip);
    }
    expect(TIP_TAPS).toBe(5);
    expect(tips).toEqual([false, false, false, false, true, false, false, false, false, true]);
  });

  it('a slow tap starts the count again', () => {
    let s = null;
    const at = [0, 200, 400, 600, 600 + TIP_GAP_MS + 1, 1300, 1500, 1700, 1900];
    const tips = at.map((t) => { const r = registerTipTap(s, t); s = r.state; return r.tip; });
    expect(tips.indexOf(true)).toBe(8); // the 5th tap after the pause
    expect(tips.filter(Boolean)).toHaveLength(1);
  });

  it('on the fox: the hat comes off, he says a line, and the card is left alone (tracked once)', () => {
    const { container } = renderFox();
    const btn = fox();
    fireEvent.click(btn); // the first tap opens the card, as always (mouse)
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    for (let i = 0; i < 4; i += 1) fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true'); // still open: no surprise toggle
    expect(container.querySelector('.fox-guide').classList.contains('is-tip')).toBe(true);
    expect(screen.getByTestId('fox-tip')).toBeTruthy();
    expect(TIP_LINES).toContain(container.querySelector('.fox-trick__bubble').textContent);
    expect(trickCalls('hat_tip')).toHaveLength(1);
    for (let i = 0; i < 5; i += 1) fireEvent.click(btn); // again: no second track this visit
    expect(trickCalls('hat_tip')).toHaveLength(1);
  });

  it('on a touch screen the five taps never open the sheet', () => {
    vi.useFakeTimers();
    const { container } = renderFox();
    const btn = fox();
    for (let i = 0; i < 5; i += 1) {
      fireEvent.pointerDown(btn, { pointerType: 'touch' });
      fireEvent.click(btn, { detail: 1 });
      act(() => { vi.advanceTimersByTime(120); });
    }
    act(() => { vi.advanceTimersByTime(2000); });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(trickCalls('hat_tip')).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(container.querySelector('.fox-guide').classList.contains('is-tip')).toBe(false);
  });

  it('a single tap still opens the card on a touch screen', () => {
    vi.useFakeTimers();
    renderFox();
    const btn = fox();
    fireEvent.pointerDown(btn, { pointerType: 'touch' });
    fireEvent.click(btn, { detail: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(trickCalls('hat_tip')).toHaveLength(0);
  });
});

describe('late at night', () => {
  it('the moon is out from 11 PM to 5 AM while the shop is closed', () => {
    expect(nightLook({ hours: HOURS, now: MON_LATE, sleepy: true }).moon).toBe(true);
    expect(nightLook({ hours: HOURS, now: TUE_SMALL_HOURS, sleepy: true }).moon).toBe(true);
    expect(nightLook({ hours: HOURS, now: MON_EVENING, sleepy: true }).moon).toBe(false);
    expect(nightLook({ hours: HOURS, now: TUE_DAWN, sleepy: true }).moon).toBe(false);
    expect(nightLook({ hours: HOURS, now: MON_LATE, sleepy: false }).moon).toBe(false); // open late? no moon
  });

  it('whispers when the shop opens', () => {
    expect(nightLook({ hours: HOURS, now: MON_LATE, sleepy: true }).greeting).toMatch(/^Shh… the beans are sleeping\. We open at \d{1,2}:\d\d [AP]M\.$/);
  });

  it('on the fox: nightcap, moon and stars, and the hushed greeting', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MON_LATE);
    const { container } = renderFox();
    await vi.waitFor(() => expect(container.querySelector('.fox-guide').classList.contains('is-night')).toBe(true));
    expect(container.querySelector('.fox-acc--nightcap')).toBeTruthy();
    expect(screen.getByTestId('fox-night').querySelectorAll('.fox-trick__star')).toHaveLength(3);
    fireEvent.click(fox());
    const card = screen.getByRole('dialog', { name: /Ask the fox/ });
    expect(card.querySelector('.fox-help__say').textContent).toMatch(/Shh… the beans are sleeping/);
    expect(trickCalls('late_night')).toHaveLength(1);
  });

  it('no moon in the morning', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MON_MORNING);
    const { container } = renderFox();
    await vi.waitFor(() => expect(container.querySelector('.fox-guide').classList.contains('is-morning')).toBe(true));
    expect(screen.queryByTestId('fox-night')).toBeNull();
    expect(trickCalls('late_night')).toHaveLength(0);
  });
});

describe('the shop’s birthday (Oct 13)', () => {
  it('counts the years from 2017', () => {
    expect(trickDay(new Date(2026, 9, 13, 12)).anniversary).toBe(9);
    expect(trickDay(new Date(2030, 9, 13, 12)).anniversary).toBe(13);
    expect(trickDay(new Date(2026, 9, 13, 12)).greeting).toBe('We turn 9 today! Thanks for nine years of Trouble.');
    expect(trickDay(new Date(2026, 9, 12, 12)).anniversary).toBeNull();
    expect(trickDay(new Date(2026, 9, 14, 12)).greeting).toBeNull();
    expect(trickDay(new Date(2017, 9, 13, 12)).anniversary).toBeNull(); // opening day itself
  });

  it('an ordinary Friday the 13th is just an ordinary day for the tricks', () => {
    const fri = new Date(2026, 10, 13, 12); // Fri Nov 13 2026
    expect(fri.getDay()).toBe(5);
    expect(trickDay(fri)).toEqual({ anniversary: null, greeting: null });
  });

  it('on the fox: a party hat on his top hat and "We turn 9 today!"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(BIRTHDAY);
    const { container } = renderFox();
    expect(container.querySelector('.fox-guide').classList.contains('is-party')).toBe(true);
    expect(screen.getByTestId('fox-party-hat')).toBeTruthy();
    fireEvent.click(fox());
    const card = screen.getByRole('dialog', { name: /Ask the fox/ });
    expect(within(card).getByText(/We turn 9 today!/)).toBeTruthy();
    expect(trickCalls('anniversary')).toHaveLength(1);
  });

  it('?foxday=10-13 previews it', () => {
    window.history.pushState({}, '', '/?foxday=10-13');
    try {
      renderFox();
      expect(screen.getByTestId('fox-party-hat')).toBeTruthy();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });
});

describe('tracking', () => {
  it('each trick counts once a visit', () => {
    expect(firstThisVisit('hat_tip')).toBe(true);
    expect(firstThisVisit('hat_tip')).toBe(false);
    expect(firstThisVisit('late_night')).toBe(true);
  });

  it('the removed tricks are gone: no Konami / "trouble" and no Friday-13th cat', async () => {
    const mod = await import('../src/lib/foxTricks.js');
    expect(mod.createSecretKeys).toBeUndefined();
    expect(mod.KONAMI).toBeUndefined();
    const { container } = renderFox();
    ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 't', 'r', 'o', 'u', 'b', 'l', 'e']
      .forEach((key) => fireEvent.keyDown(document, { key }));
    expect(container.querySelector('[class*="confetti-fall"], [class*="hearts"], [data-testid="fox-cat"]')).toBeNull();
    expect(track.mock.calls.filter(([ev]) => ev === 'fox_trick')).toHaveLength(0);
  });
});
