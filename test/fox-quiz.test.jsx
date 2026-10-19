import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoxGuide from '../src/components/FoxGuide.jsx';
import {
  ANY, QUIZ, classifyDrink, drinkCandidates, matchDrink, matchLine,
  quizPlan, refineOptions, scoreDrink,
} from '../src/lib/foxFun.js';
import { MENU_ITEMS } from '../src/lib/seed.js';
import { SPOTON_ORDER_URL } from '../src/lib/config.js';

/* "Pick my drink": the rules (src/lib/foxFun.js)
   and the panes that draw them (src/components/FoxPlay.jsx). */

const available = MENU_ITEMS.filter((i) => i.available !== false);
const availableNames = new Set(available.map((i) => i.name));
const drinkNames = new Set(drinkCandidates(MENU_ITEMS).map((d) => d.name));
const by = (n) => MENU_ITEMS.find((i) => i.name === n);
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every way through the quiz (each offered answer, and "No preference"). */
function allPaths(menu) {
  const out = [];
  const walk = (ans) => {
    const next = quizPlan(menu, ans).find((q) => !(q.id in ans));
    if (!next) { out.push(ans); return; }
    for (const v of [...next.options.map((o) => o.value), ANY]) walk({ ...ans, [next.id]: v });
  };
  walk({});
  return out;
}

describe('the quiz reads only what the menu data says', () => {
  it('classifies real drinks from their names, SpotOn category and description', () => {
    expect(classifyDrink(by('Cold Brew'))).toEqual({ temp: 'iced', base: ['coffee'], caffeine: 'yes', flavour: ['bold'], milk: 'no' });
    expect(classifyDrink(by('Hot Chocolate'))).toMatchObject({ temp: 'hot', base: ['chocolate', 'nocaf'], caffeine: 'no', milk: 'yes' });
    // "Vanilla or Cookies n Creme (non-caffeinated)", SpotOn "Frozen Drinks"
    expect(classifyDrink(by('Frappe - 16oz'))).toMatchObject({ temp: 'frozen', base: ['nocaf'], caffeine: 'no' });
    expect(classifyDrink(by('Frappe - 16oz')).flavour).toContain('sweet');
    expect(classifyDrink(by('Iced Chai Latte'))).toMatchObject({ temp: 'iced', base: ['tea'], caffeine: 'yes', milk: 'yes' });
    expect(classifyDrink(by('Iced Chai Latte')).flavour).toEqual(expect.arrayContaining(['sweet', 'creamy', 'spiced']));
    expect(classifyDrink(by('Lemonade'))).toMatchObject({ temp: 'iced', caffeine: 'no', milk: 'no' });
    expect(classifyDrink(by('Espresso')).flavour).toEqual(['bold']);
  });

  it('claims nothing it can’t back up', () => {
    // turmeric and plain tea: caffeine not promised either way
    expect(classifyDrink(by('Hot Turmeric Latte')).caffeine).toBeNull();
    expect(classifyDrink(by('Hot Tea')).caffeine).toBeNull();
    expect(classifyDrink(by('Refreshers')).caffeine).toBeNull();
    // the shaken espresso's milk isn't in the data
    expect(classifyDrink(by('Shaken Espresso - 20oz')).milk).toBeNull();
    // a dairy-free flag means no milk
    expect(classifyDrink({ name: 'Oat Latte', dietary_flags: ['dairy-free'] }).milk).toBe('no');
    // the explanation only repeats boxes the drink really ticks
    expect(matchLine(by('Hot Turmeric Latte'), { caffeine: 'no' })).not.toMatch(/caffeine/i);
  });
});

describe('the questions come from today’s menu', () => {
  it('asks temperature, then kind, then flavour, offering only what exists', () => {
    const plan = quizPlan(MENU_ITEMS, {});
    expect(plan.map((q) => q.id)).toEqual(['temp', 'base', 'caffeine', 'flavour', 'milk']);
    expect(plan[0].options.map((o) => o.value)).toEqual(['hot', 'iced', 'frozen']);
    // frozen: no chocolate or fruity frozen drinks on today's menu, so not offered
    const frozen = quizPlan(MENU_ITEMS, { temp: 'frozen' }).find((q) => q.id === 'base');
    expect(frozen.options.map((o) => o.value)).toEqual(['coffee', 'tea', 'nocaf']);
  });

  it('skips a question that wouldn’t narrow anything', () => {
    // every hot coffee has caffeine, so "Caffeine?" isn't asked
    expect(quizPlan(MENU_ITEMS, { temp: 'hot', base: 'coffee' }).map((q) => q.id)).not.toContain('caffeine');
    // every creamy hot coffee has milk, so "Milk in it?" isn't either
    expect(quizPlan(MENU_ITEMS, { temp: 'hot', base: 'coffee', flavour: 'creamy' }).map((q) => q.id)).not.toContain('milk');
    // a menu with no frozen drinks never offers "Frozen"
    const noFrozen = MENU_ITEMS.filter((i) => classifyDrink(i).temp !== 'frozen');
    expect(quizPlan(noFrozen, {})[0].options.map((o) => o.value)).toEqual(['hot', 'iced']);
    // one drink: nothing to ask
    expect(quizPlan([by('Cold Brew')], {})).toEqual([]);
  });

  it('"No preference" narrows nothing', () => {
    const asked = quizPlan(MENU_ITEMS, {}).find((q) => q.id === 'base');
    const skipped = quizPlan(MENU_ITEMS, { temp: ANY }).find((q) => q.id === 'base');
    expect(skipped.options).toEqual(asked.options);
    expect(scoreDrink(classifyDrink(by('Lemonade')), { temp: ANY, base: ANY })).toBe(0);
  });

  it('every path takes 2–5 taps and ends on a real drink that ticks every box', () => {
    const paths = allPaths(MENU_ITEMS);
    expect(paths.length).toBeGreaterThan(50);
    for (const ans of paths) {
      const n = Object.keys(ans).length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(QUIZ.length);
      for (const k of [0, 0.5, 0.99]) {
        const m = matchDrink(MENU_ITEMS, ans, { rand: () => k });
        expect(m.exact).toBe(true);
        expect(drinkNames.has(m.item.name)).toBe(true);
        // two runner-ups, distinct from each other and the pick, all available
        expect(m.runners).toHaveLength(2);
        const names = [m.item.name, ...m.runners.map((r) => r.name)];
        expect(new Set(names).size).toBe(3);
        names.forEach((x) => expect(availableNames.has(x)).toBe(true));
      }
    }
  });
});

describe('scoring and the match', () => {
  it('weights the answers transparently', () => {
    const chai = classifyDrink(by('Iced Chai Latte'));
    // iced +4, tea +3, spiced +2
    expect(scoreDrink(chai, { temp: 'iced', base: 'tea', flavour: 'spiced' })).toBe(9);
    // hot asked of an iced drink: −8; frozen asked of an iced one: only −2
    expect(scoreDrink(chai, { temp: 'hot' })).toBe(-8);
    expect(scoreDrink(chai, { temp: 'frozen' })).toBe(-2);
    // caffeine unknown scores 0 (never promised); wrong scores −8
    expect(scoreDrink(classifyDrink(by('Hot Tea')), { caffeine: 'no' })).toBe(0);
    expect(scoreDrink(classifyDrink(by('Espresso')), { caffeine: 'no' })).toBe(-8);
  });

  it('finds the drink people mean, and explains it in one line', () => {
    const m = matchDrink(MENU_ITEMS, { temp: 'iced', base: 'tea', flavour: 'spiced' }, { rand: seq(0) });
    expect(m.item.name).toBe('Iced Chai Latte');
    expect(m.line).toBe('Iced and spiced tea — that’s our Iced Chai Latte.');
    expect(matchLine(by('Iced Chai Latte'), { temp: 'iced', flavour: 'spiced' })).toBe('Iced and spiced — that’s our Iced Chai Latte.');
    const hot = matchDrink(MENU_ITEMS, { temp: 'hot', base: 'nocaf', flavour: 'fruity' });
    expect(hot.item.name).toBe('Hot Apple Cider');
    expect(hot.line).toBe('Hot, caffeine-free and fruity — that’s our Hot Apple Cider.');
    const bold = matchDrink(MENU_ITEMS, { temp: 'iced', base: 'coffee', flavour: 'bold', milk: 'yes' });
    expect(bold.item.name).toBe('Iced Cortado');
    expect(bold.line).toBe('Iced and bold coffee, with milk — that’s our Iced Cortado.');
  });

  it('owns up when nothing ticks every box', () => {
    const m = matchDrink(MENU_ITEMS, { temp: 'frozen', base: 'chocolate' }, { rand: seq(0) });
    expect(m.exact).toBe(false);
    expect(m.misses.length).toBeGreaterThan(0);
    expect(drinkNames.has(m.item.name)).toBe(true);
  });

  it('never suggests an unavailable drink', () => {
    const banana = by('Banana Split Coffee');
    expect(banana.available).toBe(false);
    for (const ans of allPaths(MENU_ITEMS)) {
      const m = matchDrink(MENU_ITEMS, ans);
      expect([m.item, ...m.runners].map((x) => x.name)).not.toContain('Banana Split Coffee');
    }
    expect(matchDrink([], {})).toBeNull();
  });
});

describe('refining a match', () => {
  const chaiAnswers = { temp: 'iced', base: 'tea', flavour: 'sweet' };

  it('"Less sweet" swaps a sweet pick for a not-sweet one that still fits', () => {
    const first = matchDrink(MENU_ITEMS, chaiAnswers, { rand: seq(0) });
    expect(classifyDrink(first.item).flavour).toContain('sweet');
    const ids = refineOptions(MENU_ITEMS, chaiAnswers, { current: first.item }).map((r) => r.id);
    expect(ids).toContain('less-sweet');
    expect(ids).not.toContain('sweeter'); // it's already sweet
    const less = matchDrink(MENU_ITEMS, chaiAnswers, { refine: ['less-sweet'], rand: seq(0) });
    expect(classifyDrink(less.item)).toMatchObject({ temp: 'iced' });
    expect(classifyDrink(less.item).base).toContain('tea');
    expect(classifyDrink(less.item).flavour).not.toContain('sweet');
    expect(less.line).toMatch(/not too sweet/);
  });

  it('"More like this" steps the shown drink aside and keeps the answers', () => {
    const first = matchDrink(MENU_ITEMS, chaiAnswers, { rand: seq(0) });
    const more = matchDrink(MENU_ITEMS, chaiAnswers, { not: [first.item.name], rand: seq(0) });
    expect(more.item.name).not.toBe(first.item.name);
    expect(more.exact).toBe(true);
    expect(more.runners.map((r) => r.name)).not.toContain(first.item.name);
  });

  it('only offers refinements that would change something', () => {
    const espresso = by('Espresso');
    const ids = refineOptions(MENU_ITEMS, { temp: 'hot', base: 'coffee', flavour: 'bold' }, { current: espresso }).map((r) => r.id);
    expect(ids).not.toContain('stronger'); // already bold
    expect(ids).not.toContain('less-sweet'); // not sweet
    expect(ids).toContain('more');
  });
});

/* ---- in the card ---------------------------------------------------------- */

const renderFox = () => render(<MemoryRouter><FoxGuide /></MemoryRouter>);
const openGame = async (label) => {
  renderFox();
  fireEvent.click(screen.getByRole('button', { name: /ask the fox/i }));
  const card = screen.getByRole('dialog', { name: /Ask the fox/ });
  fireEvent.click(await within(card).findByRole('button', { name: label }));
  return card;
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Pick my drink, in the card', () => {
  it('walks the questions (with Back) to a match, two runner-ups and refinements', async () => {
    const card = await openGame('Pick my drink');
    const quiz = () => within(card).getByTestId('fox-quiz');
    expect(within(quiz()).getByRole('progressbar', { name: 'Question 1 of 5' })).toBeTruthy();
    fireEvent.click(within(quiz()).getByRole('button', { name: 'Hot' }));
    fireEvent.click(within(quiz()).getByRole('button', { name: 'Coffee & espresso' }));
    // caffeine is skipped (every hot coffee has it) — straight to flavour
    expect(within(quiz()).getByRole('heading', { name: 'Which sounds best?' })).toBeTruthy();
    expect(within(quiz()).queryByRole('button', { name: 'Fruity' })).toBeNull(); // no fruity hot coffee
    fireEvent.click(within(quiz()).getByRole('button', { name: 'Bold' }));
    expect(within(quiz()).getByRole('heading', { name: 'Milk in it?' })).toBeTruthy();
    fireEvent.click(within(quiz()).getByRole('button', { name: /Back/ })); // change my mind
    fireEvent.click(within(quiz()).getByRole('button', { name: 'Creamy' }));

    const result = within(card).getByTestId('fox-quiz-result');
    const top = result.querySelector('.fox-match .fox-drink__name').textContent;
    expect(['Hot Latte', 'Cappuccino', 'Cafe Au Lait', 'Flat White']).toContain(top);
    expect(result.textContent).toContain(`Hot and creamy coffee — that’s our ${top}.`);
    expect(result.textContent).toMatch(/Your match/);
    expect(within(result).getByRole('link', { name: new RegExp(`^Order ${esc(top)} on SpotOn`) }).getAttribute('href')).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    const runners = result.querySelectorAll('.fox-runner');
    expect(runners).toHaveLength(2);
    runners.forEach((r) => {
      const n = r.querySelector('.fox-runner__name').textContent;
      expect(availableNames.has(n)).toBe(true);
      expect(n).not.toBe(top);
      expect(r.querySelector('.fox-runner__price').textContent).toMatch(/^\$\d+\.\d\d$/);
      expect(within(r).getByRole('link', { name: new RegExp(`^Order ${esc(n)}`) })).toBeTruthy();
    });

    fireEvent.click(within(result).getByRole('button', { name: 'More like this' }));
    const next = within(card).getByTestId('fox-quiz-result').querySelector('.fox-match .fox-drink__name').textContent;
    expect(next).not.toBe(top);
    expect(availableNames.has(next)).toBe(true);

    fireEvent.click(within(card).getByRole('button', { name: /Start over/ }));
    expect(within(quiz()).getByRole('heading', { name: 'Hot, iced or frozen?' })).toBeTruthy();
  });

  it('lets every question be skipped', async () => {
    const card = await openGame('Pick my drink');
    const quiz = () => within(card).queryByTestId('fox-quiz');
    let taps = 0;
    while (quiz() && taps < 10) {
      fireEvent.click(within(quiz()).getByRole('button', { name: 'No preference' }));
      taps += 1;
    }
    expect(taps).toBe(5);
    const name = within(card).getByTestId('fox-quiz-result').querySelector('.fox-match .fox-drink__name').textContent;
    expect(drinkNames.has(name)).toBe(true);
  });
});
