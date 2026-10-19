import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoxGuide from '../src/components/FoxGuide.jsx';
import {
  DAILY, backLine, closedOrderNote, dailyFact, drinkCandidates, foxMood, pickSurprise,
} from '../src/lib/foxFun.js';
import { HOURS, MENU_ITEMS } from '../src/lib/seed.js';
import { SPOTON_ORDER_URL } from '../src/lib/config.js';

const MON_MORNING = new Date('2026-10-19T14:15:00Z'); // Mon 10:15 AM EDT
const MON_AFTERNOON = new Date('2026-10-19T18:00:00Z'); // Mon 2:00 PM EDT
const FRI_EVENING = new Date('2026-10-23T22:00:00Z'); // Fri 6:00 PM EDT (closed at 5)
const SAT_EVENING = new Date('2026-10-24T22:30:00Z'); // Sat 6:30 PM EDT (Sunday opens 8)
const MAY = new Date(2026, 4, 6, 12);

const available = MENU_ITEMS.filter((i) => i.available !== false);
const availableNames = new Set(available.map((i) => i.name));

describe('Surprise me', () => {
  it('only ever picks an available, priced drink', () => {
    const pool = drinkCandidates(MENU_ITEMS);
    expect(pool.length).toBeGreaterThan(10);
    pool.forEach((d) => {
      expect(d.available).not.toBe(false);
      expect(d.price).toBeGreaterThan(0);
      expect(['espresso', 'specialty', 'seasonal']).toContain(d.category);
      expect(d.name).not.toMatch(/pup cup|water cup/i);
    });
    // Banana Split Coffee is on the list but unavailable — never picked
    expect(MENU_ITEMS.find((i) => i.name === 'Banana Split Coffee').available).toBe(false);
    for (let k = 0; k < 200; k += 1) {
      const pick = pickSurprise(MENU_ITEMS, { rand: () => k / 200 });
      expect(availableNames.has(pick.name)).toBe(true);
      expect(pick.name).not.toBe('Banana Split Coffee');
    }
  });

  it('picks something different on "Pick again", and falls back to food if there are no drinks', () => {
    const first = pickSurprise(MENU_ITEMS, { rand: () => 0 });
    expect(pickSurprise(MENU_ITEMS, { rand: () => 0, not: first.name }).name).not.toBe(first.name);
    const foodOnly = available.filter((i) => i.category === 'food');
    expect(pickSurprise(foodOnly, { rand: () => 0 }).category).toBe('food');
    expect(pickSurprise([], {})).toBeNull();
  });

  it('after closing, says when they can order it', () => {
    expect(closedOrderNote(HOURS, [], MON_MORNING)).toBeNull();
    expect(closedOrderNote(HOURS, [], FRI_EVENING)).toBe('We’re closed right now. Order it when we open tomorrow at 7:30 AM.');
    expect(closedOrderNote(HOURS, [], SAT_EVENING)).toMatch(/tomorrow at 8:00 AM/);
  });
});

describe('Today’s fox fact', () => {
  it('is the same all day (on the shop’s clock) and changes from day to day', () => {
    const a = dailyFact(new Date('2026-10-19T11:00:00Z'), MENU_ITEMS); // 7 AM EDT
    const b = dailyFact(new Date('2026-10-20T03:30:00Z'), MENU_ITEMS); // 11:30 PM EDT, same shop day
    expect(a.date).toBe('2026-10-19');
    expect(b.date).toBe('2026-10-19');
    expect(b.id).toBe(a.id);
    const ids = new Set(Array.from({ length: 30 }, (_, d) => dailyFact(new Date(Date.UTC(2026, 9, 1 + d, 16)), MENU_ITEMS).id));
    expect(ids.size).toBeGreaterThan(8);
  });

  it('has only checkable entries, riddles with answers, and nothing about glasses', () => {
    DAILY.forEach((d) => {
      expect(d.text.length).toBeGreaterThan(10);
      expect(`${d.text} ${d.answer || ''}`).not.toMatch(/glasses|spectacles|monocle/i);
      if (d.kind === 'riddle') expect(d.answer).toBeTruthy();
      if (d.item) expect(availableNames.has(d.item)).toBe(true);
    });
    const ids = DAILY.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops a menu riddle while its item is unavailable', () => {
    const noPup = MENU_ITEMS.map((i) => (i.name === 'Pup Cup!' ? { ...i, available: false } : i));
    for (let d = 0; d < 60; d += 1) {
      expect(dailyFact(new Date(Date.UTC(2026, 0, 1 + d, 16)), noPup).id).not.toBe('pup');
    }
  });
});

describe('his mood follows the shop’s clock', () => {
  it('is sleepy after closing, with the real next opening', () => {
    const m = foxMood({ hours: HOURS, now: SAT_EVENING, today: MAY });
    expect(m).toMatchObject({ sleepy: true, morning: false, october: false });
    expect(m.next).toMatchObject({ inDays: 1, time: '8:00 AM' });
    expect(backLine(m.next)).toBe('Zzz… back tomorrow at 8:00 AM!');
    // a holiday closure counts too
    const closedToday = [{ override_date: '2026-10-19', open_time: null, close_time: null, label: 'Closed' }];
    expect(foxMood({ hours: HOURS, overrides: closedToday, now: MON_MORNING, today: MAY }).sleepy).toBe(true);
  });

  it('has his morning coffee before 11, and not after', () => {
    expect(foxMood({ hours: HOURS, now: MON_MORNING, today: MAY })).toMatchObject({ sleepy: false, morning: true });
    expect(foxMood({ hours: HOURS, now: MON_AFTERNOON, today: MAY })).toMatchObject({ sleepy: false, morning: false });
  });

  it('gets his pumpkin in October only', () => {
    expect(foxMood({ hours: HOURS, now: MON_AFTERNOON, today: new Date(2026, 9, 1) }).october).toBe(true);
    expect(foxMood({ hours: HOURS, now: MON_AFTERNOON, today: new Date(2026, 9, 31) }).october).toBe(true);
    expect(foxMood({ hours: HOURS, now: MON_AFTERNOON, today: new Date(2026, 10, 1) }).october).toBe(false);
  });
});

/* the quiz and the Surprise reel: test/fox-quiz.test.jsx */

/* ---- in the card ---------------------------------------------------------- */

const renderFox = () => render(<MemoryRouter><FoxGuide /></MemoryRouter>);
const fox = () => screen.getByRole('button', { name: /ask the fox/i });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const openCard = async () => {
  fireEvent.click(fox());
  const card = screen.getByRole('dialog', { name: /Ask the fox/ });
  await within(card).findByRole('button', { name: 'Surprise me' });
  return card;
};

describe('the games in the fox’s card', () => {
  it('Surprise me shows a real available drink with its price and a SpotOn order link', async () => {
    renderFox();
    const card = await openCard();
    fireEvent.click(within(card).getByRole('button', { name: 'Surprise me' }));
    const pane = within(card).getByTestId('fox-surprise');
    const name = pane.querySelector('.fox-drink__name').textContent;
    expect(availableNames.has(name)).toBe(true);
    expect(pane.querySelector('.fox-drink__price').textContent).toMatch(/^\$\d+\.\d\d$/);
    expect(within(pane).getByRole('link', { name: new RegExp(`Order ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).getAttribute('href')).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    fireEvent.click(within(pane).getByRole('button', { name: /Pick again/ }));
    expect(pane.querySelector('.fox-drink__name').textContent).not.toBe(name);
  });

  it('the daily fact has a dot until it’s been seen today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MON_MORNING);
    renderFox();
    expect(fox().getAttribute('aria-label')).toMatch(/new fox fact today/);
    const card = await openCard();
    fireEvent.click(within(card).getByRole('button', { name: /Fox fact/ }));
    const pane = within(card).getByTestId('fox-fact');
    expect(pane.textContent).toContain(dailyFact(MON_MORNING, MENU_ITEMS).text);
    expect(localStorage.getItem('tb-fox-fact-seen')).toBe('2026-10-19');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fox().getAttribute('aria-label')).not.toMatch(/new fox fact/);
  });

  it('a tap opens the card, quick taps don’t close it, and there is no badge, tail or confetti', async () => {
    renderFox();
    const btn = fox();
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    for (let i = 2; i <= 12; i += 1) fireEvent.click(btn); // quick taps
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByTestId('fox-award')).toBeNull();
    expect(screen.queryByText('Trouble-maker')).toBeNull();
    expect(document.querySelector('.fox-acc--tail, .fox-guide__confetti')).toBeNull();
    expect(localStorage.getItem('tb-fox-pets')).toBeNull();
  });

  it('sleeps in a nightcap after closing and says when he’s back', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SAT_EVENING);
    const { container } = renderFox();
    await screen.findByRole('button', { name: /ask the fox/i });
    await vi.waitFor(() => expect(container.querySelector('.fox-guide').classList.contains('is-sleepy')).toBe(true));
    expect(container.querySelector('.fox-acc--nightcap')).toBeTruthy();
    const card = await openCard();
    expect(card.querySelector('.fox-help__say').textContent).toMatch(/back tomorrow at 8:00 AM/);
  });

  it('is awake (no nightcap) in the morning', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MON_MORNING);
    const { container } = renderFox();
    await vi.waitFor(() => expect(container.querySelector('.fox-guide').classList.contains('is-morning')).toBe(true));
    expect(container.querySelector('.fox-acc--nightcap')).toBeNull();
  });
});
