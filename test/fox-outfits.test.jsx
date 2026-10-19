import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoxGuide from '../src/components/FoxGuide.jsx';
import FoxOutfit from '../src/components/FoxOutfit.jsx';
import {
  HOT_F, WEATHER_KEY, WEATHER_TTL, WEATHER_URL, cachedWeather, fetchWeather, outfitFromUrl, resolveOutfit, seasonFor,
  shopDate, weatherFor,
} from '../src/lib/foxOutfit.js';
import {
  USUAL_KEY, USUAL_MAX_AGE, USUAL_MIN_AGE, articleFor, forgetUsual, loadUsual, readUsual, saveUsual,
} from '../src/lib/yourUsual.js';
import { MENU_ITEMS } from '../src/lib/seed.js';
import { SPOTON_ORDER_URL } from '../src/lib/config.js';

/* The fox's seasonal / weather outfits (src/lib/foxOutfit.js) and "your
   usual" (src/lib/yourUsual.js). */

const by = (n) => MENU_ITEMS.find((i) => i.name === n);
const NOW = Date.UTC(2026, 9, 19, 18, 0);

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('season by date', () => {
  const s = (month, day) => seasonFor({ month, day });
  it('picks each season, including the boundaries', () => {
    expect(s(9, 30)).toBe('september');
    expect(s(10, 1)).toBe('october');
    expect(s(10, 31)).toBe('october');
    expect(s(11, 1)).toBe('winter');
    expect(s(11, 30)).toBe('winter');
    expect(s(12, 1)).toBe('holiday');
    expect(s(12, 26)).toBe('holiday');
    expect(s(12, 27)).toBe('winter');
    expect(s(1, 1)).toBe('winter');
    expect(s(2, 28)).toBe('winter');
    expect(s(2, 29)).toBe('winter');
    expect(s(3, 1)).toBe('spring');
    expect(s(5, 31)).toBe('spring');
    expect(s(6, 1)).toBe('summer');
    expect(s(8, 31)).toBe('summer');
    expect(s(9, 1)).toBe('september');
  });

  it('reads the date in America/New_York, and honours ?foxday=', () => {
    // 03:30 UTC on Nov 1 is still Oct 31 in New Jersey
    expect(shopDate(new Date('2026-11-01T03:30:00Z'), '')).toEqual({ month: 10, day: 31 });
    expect(shopDate(new Date('2026-11-01T05:30:00Z'), '')).toEqual({ month: 11, day: 1 });
    expect(shopDate(new Date('2026-07-01T12:00:00Z'), '?foxday=12-10')).toEqual({ month: 12, day: 10 });
  });

  it('dresses each season, and never with glasses', () => {
    expect(resolveOutfit({ season: 'october' }).parts).toEqual(['pumpkins']);
    expect(resolveOutfit({ season: 'winter' }).parts).toEqual(['scarf']);
    expect(resolveOutfit({ season: 'holiday' }).parts).toEqual(['scarf', 'sprig']);
    expect(resolveOutfit({ season: 'spring' }).parts).toEqual(['flower']);
    expect(resolveOutfit({ season: 'summer' }).parts).toEqual(['sun']);
    expect(resolveOutfit({ season: 'september' }).parts).toEqual(['leaf']);
    expect(resolveOutfit({ season: 'october' }).line).toBe('Pumpkin season at Trouble.');
    for (const season of ['october', 'winter', 'holiday', 'spring', 'summer', 'september']) {
      for (const code of [0, 61, 71]) {
        const o = resolveOutfit({ season, weather: { code, tempF: 95 } });
        expect(o.parts.join(' ')).not.toMatch(/glass|spectacle|shade/i);
      }
    }
  });
});

describe('weather', () => {
  it('maps WMO codes and heat', () => {
    [51, 55, 57, 61, 63, 65, 67, 80, 82, 95, 96, 99].forEach((c) => expect(weatherFor(c, 60)).toBe('rain'));
    [71, 73, 75, 77, 85, 86].forEach((c) => expect(weatherFor(c, 30)).toBe('snow'));
    [0, 1, 2, 3, 45, 48].forEach((c) => expect(weatherFor(c, 70)).toBeNull());
    expect(weatherFor(0, HOT_F)).toBe('hot');
    expect(weatherFor(1, 87.9)).toBeNull();
    expect(weatherFor(61, 95)).toBe('rain'); // rain wins over heat
    expect(weatherFor(0, null)).toBeNull();
    expect(weatherFor(undefined, undefined)).toBeNull();
  });

  it('overrides the season’s beside-piece but keeps what he wears', () => {
    expect(resolveOutfit({ season: 'holiday', weather: { code: 61, tempF: 40 } }).parts).toEqual(['scarf', 'sprig', 'umbrella']);
    expect(resolveOutfit({ season: 'october', weather: { code: 61, tempF: 50 } }).parts).toEqual(['umbrella']);
    expect(resolveOutfit({ season: 'spring', weather: { code: 73, tempF: 31 } }).parts).toEqual(['flower', 'scarf', 'snow']);
    expect(resolveOutfit({ season: 'summer', weather: { code: 0, tempF: 91 } }).parts).toEqual(['iced']);
    expect(resolveOutfit({ season: 'summer', weather: { code: 0, tempF: 80 } }).parts).toEqual(['sun']);
  });

  it('only quotes a temperature from live data', () => {
    expect(resolveOutfit({ season: 'summer', weather: { code: 0, tempF: 91.4 } }).line).toMatch(/91°F/);
    expect(resolveOutfit({ season: 'summer', override: 'hot' }).line).not.toMatch(/\d/);
    expect(resolveOutfit({ season: 'winter', weather: { code: 75, tempF: 28 } }).line).toBe('Bundled up. It’s snowing on Station Ave.');
    expect(resolveOutfit({ season: 'winter', weather: { code: 75, tempF: 28 } }).line).not.toMatch(/\d/);
  });

  it('fetches Open-Meteo once, caches it for 30 minutes, and fails silently', async () => {
    const ok = vi.fn(async () => ({ ok: true, json: async () => ({ current: { weather_code: 63, temperature_2m: 51.2, is_day: 1 } }) }));
    expect(await fetchWeather({ fetchImpl: ok, now: NOW })).toEqual({ code: 63, tempF: 51.2, isDay: true });
    expect(ok).toHaveBeenCalledWith(WEATHER_URL, expect.anything());
    expect(WEATHER_URL).toMatch(/latitude=39\.8773&longitude=-75\.0646/);
    expect(JSON.parse(sessionStorage.getItem(WEATHER_KEY)).code).toBe(63);
    // cached: no second call within the half hour
    expect(await fetchWeather({ fetchImpl: ok, now: NOW + 60_000 })).toMatchObject({ code: 63 });
    expect(ok).toHaveBeenCalledTimes(1);
    expect(cachedWeather(NOW + WEATHER_TTL + 1)).toBeNull();

    sessionStorage.clear();
    expect(await fetchWeather({ fetchImpl: async () => { throw new Error('offline'); }, now: NOW })).toBeNull();
    expect(await fetchWeather({ fetchImpl: async () => ({ ok: false }), now: NOW })).toBeNull();
    expect(await fetchWeather({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }), now: NOW })).toBeNull();
    // a hung request gives up after the timeout
    expect(await fetchWeather({ fetchImpl: () => new Promise(() => {}), now: NOW, timeout: 20 })).toBeNull();
    expect(sessionStorage.getItem(WEATHER_KEY)).toBeNull();
  });

  it('works with storage blocked', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const ok = async () => ({ ok: true, json: async () => ({ current: { weather_code: 0, temperature_2m: 90 } }) });
    expect(await fetchWeather({ fetchImpl: ok, now: NOW })).toMatchObject({ code: 0, tempF: 90 });
    expect(spy).toHaveBeenCalled();
  });
});

describe('?foxOutfit= preview', () => {
  it('accepts only the known looks', () => {
    for (const look of ['rain', 'snow', 'hot', 'october', 'winter', 'holiday', 'spring', 'summer']) {
      expect(outfitFromUrl(`?foxOutfit=${look}`)).toBe(look);
    }
    expect(outfitFromUrl('?foxOutfit=SNOW')).toBe('snow');
    expect(outfitFromUrl('?foxOutfit=sunglasses')).toBeNull();
    expect(outfitFromUrl('?foxOutfit=')).toBeNull();
    expect(outfitFromUrl('')).toBeNull();
  });

  it('forces the look over the season and the live weather', () => {
    expect(resolveOutfit({ season: 'october', weather: { code: 0, tempF: 95 }, override: 'snow' }).parts).toEqual(['scarf', 'snow']);
    expect(resolveOutfit({ season: 'october', weather: { code: 61, tempF: 50 }, override: 'spring' }).parts).toEqual(['flower']);
    expect(resolveOutfit({ season: 'summer', override: 'holiday' }).id).toBe('holiday');
  });

  it('draws the forced look over the launcher fox and says its line', () => {
    window.history.replaceState(null, '', '/?foxOutfit=rain');
    const { container } = render(<MemoryRouter><FoxGuide /></MemoryRouter>);
    const svg = container.querySelector('.fox-guide__figure .fox-outfit');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('data-outfit')).toBe('rain');
    expect(svg.querySelector('.fox-outfit__umbrella')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /ask the fox/i }));
    expect(screen.getByText('Umbrella out. It’s raining on Station Ave.')).toBeTruthy();
  });

  it('adds only a little companion pumpkin when his figure already has one', () => {
    const o = resolveOutfit({ season: 'october' });
    const a = render(<svg><FoxOutfit outfit={o} hasPumpkin /></svg>);
    expect(a.container.querySelectorAll('.fox-outfit__pumpkins > g')).toHaveLength(1);
    cleanup();
    const b = render(<svg><FoxOutfit outfit={o} /></svg>);
    expect(b.container.querySelectorAll('.fox-outfit__pumpkins > g')).toHaveLength(2);
  });
});

describe('your usual', () => {
  const latte = by('Iced Latte');

  it('saves name, price, SpotOn section link, image and time', () => {
    const u = saveUsual(latte, NOW);
    expect(JSON.parse(localStorage.getItem(USUAL_KEY))).toEqual(u);
    expect(u).toMatchObject({ name: 'Iced Latte', price: latte.price, savedAt: NOW });
    expect(u.orderUrl.startsWith(`${SPOTON_ORDER_URL}#group-menu-`)).toBe(true);
    expect(u.image).toMatch(/iced-latte/);
  });

  it('greets only between ~10 minutes and 60 days later, re-resolved against the menu', () => {
    saveUsual({ ...latte, price: 99 }, NOW);
    expect(loadUsual(MENU_ITEMS, NOW + 60_000)).toBeNull(); // just picked it
    const got = loadUsual(MENU_ITEMS, NOW + USUAL_MIN_AGE + 1);
    expect(got.item).toBe(latte); // today's row (today's price), not the stored copy
    expect(loadUsual(MENU_ITEMS, NOW + USUAL_MAX_AGE - 1)).not.toBeNull();
    expect(loadUsual(MENU_ITEMS, NOW + USUAL_MAX_AGE + 1)).toBeNull();
    expect(readUsual()).toBeNull(); // too old: forgotten
  });

  it('quietly forgets a drink that has left the menu', () => {
    saveUsual({ name: 'Discontinued Mocha', price: 5 }, NOW);
    expect(loadUsual(MENU_ITEMS, NOW + USUAL_MIN_AGE * 2)).toBeNull();
    expect(localStorage.getItem(USUAL_KEY)).toBeNull();
    // but an empty / unloaded menu decides nothing
    saveUsual(latte, NOW);
    expect(loadUsual([], NOW + USUAL_MIN_AGE * 2)).toBeNull();
    expect(readUsual()).not.toBeNull();
    forgetUsual();
    expect(readUsual()).toBeNull();
  });

  it('survives junk and blocked storage', () => {
    localStorage.setItem(USUAL_KEY, '{nope');
    expect(readUsual()).toBeNull();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => saveUsual(latte, NOW)).not.toThrow();
    expect(loadUsual(MENU_ITEMS, NOW)).toBeNull();
    expect(() => forgetUsual()).not.toThrow();
  });

  it('chooses a or an', () => {
    expect(articleFor('Iced Latte')).toBe('an');
    expect(articleFor('Americano')).toBe('an');
    expect(articleFor('Espresso')).toBe('an');
    expect(articleFor('Oat Milk Latte')).toBe('an');
    expect(articleFor('Hot Chocolate')).toBe('a');
    expect(articleFor('Cold Brew')).toBe('a');
    expect(articleFor('Frappe - 16oz')).toBe('a');
    expect(articleFor('Unicorn Frappe')).toBe('a');
    expect(articleFor('Hour-long Pour Over')).toBe('an');
    expect(articleFor('8oz Cortado')).toBe('an');
    expect(articleFor('')).toBe('a');
  });

  it('greets a returning visitor in the fox card, and “Something different” forgets it and starts the quiz', async () => {
    localStorage.setItem(USUAL_KEY, JSON.stringify({ name: 'Iced Latte', price: 1, savedAt: Date.now() - 3 * 86_400_000 }));
    render(<MemoryRouter><FoxGuide /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ask the fox/i }));
    expect(await screen.findByText('Back for an Iced Latte?')).toBeTruthy();
    expect(screen.getByText('Saved on this device only.')).toBeTruthy();
    const order = screen.getByRole('link', { name: 'Order Iced Latte on SpotOn (opens in a new tab)' });
    expect(order.getAttribute('target')).toBe('_blank');
    expect(order.getAttribute('href')).toMatch(/#group-menu-/);
    fireEvent.click(screen.getByRole('button', { name: /something different/i }));
    expect(screen.queryByTestId('fox-usual')).toBeNull();
    expect(screen.getByTestId('fox-quiz')).toBeTruthy();
    expect(localStorage.getItem(USUAL_KEY)).toBeNull();
  });

  it('a Surprise pick becomes the usual', async () => {
    render(<MemoryRouter><FoxGuide /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ask the fox/i }));
    fireEvent.click(await screen.findByRole('button', { name: /surprise me/i }));
    const name = screen.getByTestId('fox-surprise').querySelector('.fox-drink__name').textContent;
    expect(readUsual().name).toBe(name);
  });
});
