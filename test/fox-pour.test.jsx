import { describe, it, expect, beforeEach, afterEach, onTestFinished, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoxGuide from '../src/components/FoxGuide.jsx';
import { POUR_MS, drinkCandidates, drinkLook } from '../src/lib/foxFun.js';
import { MENU_ITEMS } from '../src/lib/seed.js';
import { SPOTON_ORDER_URL } from '../src/lib/config.js';

/* "Surprise me" as a pour, the fox's button in its two states (resting /
   close), the paw tab, and the card making room for a game. */

const by = (n) => MENU_ITEMS.find((i) => i.name === n);
const drinkNames = new Set(drinkCandidates(MENU_ITEMS).map((d) => d.name));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('how the pour looks', () => {
  it('picks the cup from what the drink is', () => {
    expect(drinkLook(by('Espresso'))).toMatchObject({ vessel: 'mug', ice: false, frozen: false, steam: true, heart: false });
    expect(drinkLook(by('Cappuccino'))).toMatchObject({ vessel: 'mug', steam: true, heart: true });
    expect(drinkLook(by('Iced Latte'))).toMatchObject({ vessel: 'glass', ice: true, steam: false, heart: false });
    expect(drinkLook(by('Frozen Chai'))).toMatchObject({ vessel: 'glass', ice: false, frozen: true, steam: false });
    expect(drinkLook(by('Hot Chocolate'))).toMatchObject({ vessel: 'mug', heart: false }); // no latte art on cocoa
  });

  it('pours each drink in its own colour', () => {
    const fill = (n) => drinkLook(by(n)).fill;
    expect(fill('Espresso')).toBe('#3d2517');
    expect(fill('Cold Brew')).toBe('#3d2517');
    expect(fill('Hot Matcha Latte')).toBe('#8daa58');
    expect(fill('Iced Chai Latte')).toBe('#c99360');
    expect(fill('Hot Chocolate')).toBe('#5e3826');
    expect(fill('Lemonade')).toBe('#f2da6a');
    expect(fill('Hot Latte')).not.toBe(fill('Espresso')); // milky is lighter
    // every drink on the menu gets a real colour and a cup
    drinkCandidates(MENU_ITEMS).forEach((d) => {
      const l = drinkLook(d);
      expect(l.fill).toMatch(/^#[0-9a-f]{6}$/);
      expect(['mug', 'glass']).toContain(l.vessel);
      if (l.vessel === 'mug') expect(l.ice || l.frozen).toBe(false);
    });
  });
});

/* ---- in the card ---------------------------------------------------------- */

const renderFox = () => render(<MemoryRouter><FoxGuide /></MemoryRouter>);
const fox = () => screen.getByRole('button', { name: /ask the fox|close the fox/i });
const openCard = async () => {
  fireEvent.click(fox());
  const card = screen.getByRole('dialog', { name: /Ask the fox/ });
  await within(card).findByRole('button', { name: 'Surprise me' });
  return card;
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Surprise me pours a drink', () => {
  it('has a coffee-cup tile, not dice', async () => {
    renderFox();
    const card = await openCard();
    const tile = within(card).getByRole('button', { name: 'Surprise me' });
    expect(tile.querySelector('.fox-help__tile-ico')).toBeTruthy();
    expect(tile.querySelector('.fox-help__tile-spark')).toBeTruthy();
  });

  it('with reduced motion: no pour, the full cup and card fade straight in', async () => {
    renderFox();
    const card = await openCard();
    fireEvent.click(within(card).getByRole('button', { name: 'Surprise me' }));
    const pane = within(card).getByTestId('fox-surprise');
    expect(pane.classList.contains('is-instant')).toBe(true);
    expect(pane.classList.contains('is-pouring')).toBe(false);
    const name = pane.querySelector('.fox-drink__name').textContent;
    expect(drinkNames.has(name)).toBe(true);
    expect(pane.querySelector('.fox-pour__cup')).toBeTruthy();
    expect(within(pane).getByRole('link', { name: new RegExp(`^Order ${esc(name)}`) }).getAttribute('href')).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(within(pane).getByRole('button', { name: /Pick again/ }).disabled).toBe(false);
    fireEvent.click(within(pane).getByRole('button', { name: /Pick again/ }));
    expect(pane.querySelector('.fox-drink__name').textContent).not.toBe(name);
  });

  it('with motion: pours (buttons asleep), ticks once as it settles, then wakes; Pick again pours anew', async () => {
    const realMatchMedia = window.matchMedia;
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    onTestFinished(() => { window.matchMedia = realMatchMedia; });
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    onTestFinished(() => { delete navigator.vibrate; });

    renderFox();
    const card = await openCard();
    vi.useFakeTimers();
    fireEvent.click(within(card).getByRole('button', { name: 'Surprise me' }));
    const pane = within(card).getByTestId('fox-surprise');
    expect(pane.classList.contains('is-pouring')).toBe(true);
    const name = pane.querySelector('.fox-drink__name').textContent;
    expect(drinkNames.has(name)).toBe(true);
    const look = drinkLook(by(name));
    const cup = pane.querySelector('.fox-pour__cup');
    expect(cup.classList.contains(`is-${look.vessel}`)).toBe(true);
    expect(cup.querySelector('.fox-pour__stream').getAttribute('fill')).toBe(look.fill);
    expect(pane.querySelectorAll('.fox-pour__ice').length).toBe(look.ice ? 5 : 0);
    expect(within(pane).getByRole('button', { name: /Pick again/ }).disabled).toBe(true);

    act(() => { vi.advanceTimersByTime(POUR_MS - 360); });
    expect(vibrate).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(20); });
    expect(vibrate).toHaveBeenCalledWith(10);
    act(() => { vi.advanceTimersByTime(400); });
    expect(pane.classList.contains('is-pouring')).toBe(false);
    expect(vibrate).toHaveBeenCalledTimes(1);

    const firstCard = pane.querySelector('.fox-pour');
    fireEvent.click(within(pane).getByRole('button', { name: /Pick again/ }));
    expect(pane.classList.contains('is-pouring')).toBe(true);
    expect(pane.querySelector('.fox-pour')).not.toBe(firstCard); // a fresh pour, replayed from the top
    expect(pane.querySelector('.fox-drink__name').textContent).not.toBe(name);
    act(() => { vi.advanceTimersByTime(POUR_MS + 10); });
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('gives a game the room: the chips fold into a Questions tile while it is up', async () => {
    renderFox();
    const card = await openCard();
    expect(card.querySelector('.fox-help__chips')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Pick my drink' }));
    expect(card.classList.contains('is-game')).toBe(true);
    expect(card.querySelector('.fox-help__chips')).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: 'Questions' }));
    expect(card.classList.contains('is-game')).toBe(false);
    expect(card.querySelector('.fox-help__chips')).toBeTruthy();
  });
});

describe('the fox’s button', () => {
  it('resting: his framed card with the full drawing, no close badge', () => {
    const { container } = renderFox();
    const btn = fox();
    expect(btn.querySelector('.fox-guide__card .fox-guide__figure svg.fox-guide__art')).toBeTruthy();
    expect(btn.querySelector('.fox-guide__closex')).toBeNull();
    expect(container.querySelector('.fox-guide__face')).toBeNull(); // no medallion
  });

  it('open: the same card is the close button, with a × badge', async () => {
    renderFox();
    await openCard();
    const btn = screen.getByRole('button', { name: /close the fox/i });
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.querySelector('.fox-guide__closex')).toBeTruthy();
    // a second later (a quick second tap would be a pet, not a close)
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 2000);
    fireEvent.click(btn);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fox().querySelector('.fox-guide__closex')).toBeNull();
  });

  it('hidden: a framed tab with his whole head, centred (a vector crop, not a clipped background)', () => {
    localStorage.setItem('tb-fox-hidden', '1');
    renderFox();
    const tab = screen.getByRole('button', { name: 'Bring back the fox' });
    const bust = tab.querySelector('.fox-guide__peek svg.fox-guide__bust');
    expect(bust).toBeTruthy();
    expect(bust.getAttribute('viewBox')).toBe('99 -3 94 94');
  });
});
