import { describe, it, expect, afterEach, onTestFinished, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { DrinkPhoto, PourCup, SurprisePane, QuizPane } from '../src/components/FoxPlay.jsx';
import FoxUsual from '../src/components/FoxUsual.jsx';
import { POUR_MS, drinkLook } from '../src/lib/foxFun.js';
import { MENU_ITEMS } from '../src/lib/seed.js';
import { USUAL_KEY } from '../src/lib/yourUsual.js';

/* Real drink photos in the fox's games: a gilt-framed photo when the item
   has one, the drawn cup while it loads / when it fails / when there's none,
   and in Surprise me the photo only takes over once the pour is done. */

const by = (n) => MENU_ITEMS.find((i) => i.name === n);
const PHOTO = 'https://x.supabase.co/storage/v1/object/public/menu/1729-iced-latte.jpg';
const withPhoto = (n, url = PHOTO) => ({ ...by(n), image_url: url });
const motion = () => {
  const real = window.matchMedia;
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  onTestFinished(() => { window.matchMedia = real; });
};

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('DrinkPhoto', () => {
  it('with an image_url: the drawn cup holds the frame until the photo loads, then the photo shows', () => {
    const { container } = render(<DrinkPhoto item={withPhoto('Iced Latte')} />);
    const frame = container.querySelector('.fox-photo');
    const img = frame.querySelector('img');
    expect(img.getAttribute('src')).toBe(PHOTO);
    expect(img.getAttribute('alt')).toBe('Iced Latte');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(frame.dataset.photo).toBe('drawn');
    expect(frame.querySelector('.fox-photo__art .fox-pour__cup.is-still')).toBeTruthy();
    expect(img.getAttribute('aria-hidden')).toBe('true'); // not announced till it shows
    fireEvent.load(img);
    expect(frame.dataset.photo).toBe('photo');
    expect(frame.classList.contains('has-photo')).toBe(true);
    expect(img.hasAttribute('aria-hidden')).toBe(false);
    expect(frame.classList.contains('is-cutout')).toBe(false);
  });

  it('without one: tries the drop-in file, then settles on the drawing — no broken image', () => {
    const { container } = render(<DrinkPhoto item={by('Cold Brew')} />);
    const frame = container.querySelector('.fox-photo');
    const img = frame.querySelector('img');
    expect(img.getAttribute('src')).toMatch(/images\/drinks\/cold-brew\.jpg$/);
    fireEvent.error(img);
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.dataset.photo).toBe('drawn');
    expect(frame.querySelector('.fox-pour__cup.is-glass')).toBeTruthy();
  });

  it('a photo that fails falls back silently through every source to the drawing', () => {
    const { container } = render(<DrinkPhoto item={withPhoto('Hot Latte', 'https://x/broken.jpg')} size="sm" />);
    const frame = container.querySelector('.fox-photo');
    expect(frame.classList.contains('fox-photo--sm')).toBe(true);
    fireEvent.error(frame.querySelector('img'));
    expect(frame.querySelector('img').getAttribute('src')).toMatch(/hot-latte\.jpg$/);
    fireEvent.error(frame.querySelector('img'));
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.querySelector('.fox-pour__cup.is-mug')).toBeTruthy();
  });

  it('a cutout is marked so it stands whole on the mat', () => {
    const { container } = render(<DrinkPhoto item={withPhoto('Iced Latte', 'https://x/1-iced-latte-cutout.webp')} />);
    expect(container.querySelector('.fox-photo').classList.contains('is-cutout')).toBe(true);
  });

  it('holds a loaded photo back until it is ready', () => {
    const { container, rerender } = render(<DrinkPhoto item={withPhoto('Iced Latte')} ready={false} />);
    fireEvent.load(container.querySelector('img'));
    expect(container.querySelector('.fox-photo').dataset.photo).toBe('drawn');
    rerender(<DrinkPhoto item={withPhoto('Iced Latte')} ready />);
    expect(container.querySelector('.fox-photo').dataset.photo).toBe('photo');
  });
});

describe('the drawn cups', () => {
  it('iced: a glass with ice, condensation and a straw; layered when it has milk', () => {
    const { container } = render(<PourCup look={drinkLook(by('Iced Matcha Latte'))} />);
    const cup = container.querySelector('svg.fox-pour__cup.is-glass');
    expect(cup.querySelectorAll('.fox-pour__ice').length).toBe(5);
    expect(cup.querySelector('.fox-pour__straw')).toBeTruthy();
    expect(cup.querySelector('.fox-pour__drops')).toBeTruthy();
    expect(cup.querySelector('.fox-pour__citrus')).toBeNull();
    expect(drinkLook(by('Iced Matcha Latte'))).toMatchObject({ milk: true, citrus: null });
  });

  it('lemonade and refreshers get a citrus wheel; hot drinks a mug with steam', () => {
    expect(drinkLook(by('Lemonade'))).toMatchObject({ citrus: 'lemon', top: expect.any(String) });
    expect(drinkLook(by('Refreshers'))).toMatchObject({ citrus: 'orange' });
    const { container } = render(<PourCup look={drinkLook(by('Lemonade'))} />);
    expect(container.querySelector('.fox-pour__citrus')).toBeTruthy();
    cleanup();
    const hot = render(<PourCup look={drinkLook(by('Cappuccino'))} />).container;
    expect(hot.querySelector('.fox-pour__cup.is-mug .fox-pour__heart')).toBeTruthy();
    expect(hot.querySelector('.fox-pour__steam')).toBeTruthy();
    expect(drinkLook(by('Espresso')).crema).toBe(true);
  });

  it('a still cup has no pour stream', () => {
    const { container } = render(<PourCup look={drinkLook(by('Iced Latte'))} still />);
    expect(container.querySelector('.fox-pour__stream')).toBeNull();
  });
});

const oneDrink = (item) => [...MENU_ITEMS.filter((i) => !['espresso', 'specialty', 'seasonal'].includes(i.category)), item];

describe('Surprise me with a real photo', () => {
  it('with motion: pours the drawn cup first, then the photo takes over', () => {
    motion();
    vi.useFakeTimers();
    const { getByTestId } = render(<SurprisePane menu={oneDrink(withPhoto('Iced Latte'))} />);
    const pane = getByTestId('fox-surprise');
    const frame = pane.querySelector('.fox-photo.fox-pour__frame');
    expect(frame.querySelector('.fox-pour__stage .fox-pour__cup:not(.is-still)')).toBeTruthy();
    fireEvent.load(frame.querySelector('img')); // loaded mid-pour
    expect(frame.dataset.photo).toBe('drawn');
    act(() => { vi.advanceTimersByTime(POUR_MS + 10); });
    expect(frame.dataset.photo).toBe('photo');
    expect(frame.querySelector('img').getAttribute('alt')).toBe('Iced Latte');
  });

  it('with reduced motion: no pour; the photo shows as soon as it loads', () => {
    const { getByTestId } = render(<SurprisePane menu={oneDrink(withPhoto('Iced Latte'))} />);
    const pane = getByTestId('fox-surprise');
    expect(pane.classList.contains('is-instant')).toBe(true);
    const frame = pane.querySelector('.fox-photo');
    expect(frame.querySelector('.fox-surprise__spark')).toBeNull();
    fireEvent.load(frame.querySelector('img'));
    expect(frame.dataset.photo).toBe('photo');
  });

  it('no photo: the poured cup stays, framed, as the final state', () => {
    const { getByTestId } = render(<SurprisePane menu={oneDrink(by('Cold Brew'))} />);
    const frame = getByTestId('fox-surprise').querySelector('.fox-photo');
    fireEvent.error(frame.querySelector('img'));
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.querySelector('.fox-pour__cup.is-glass')).toBeTruthy();
  });
});

describe('the quiz match and your usual use the photo', () => {
  it('quiz: the match and runner-ups are framed photos', () => {
    const menu = MENU_ITEMS.map((i) => (i.category === 'food' ? i : { ...i, image_url: `https://x/${i.id}.jpg` }));
    const { container, getByRole } = render(<QuizPane menu={menu} />);
    // skip every question
    for (let n = 0; n < 6 && !container.querySelector('[data-testid="fox-quiz-result"]'); n += 1) fireEvent.click(getByRole('button', { name: 'No preference' }));
    const match = container.querySelector('.fox-match .fox-photo.fox-photo--md');
    const img = match.querySelector('img');
    expect(img.getAttribute('src')).toMatch(/^https:\/\/x\//);
    fireEvent.load(img);
    expect(match.dataset.photo).toBe('photo');
    expect(container.querySelectorAll('.fox-runner .fox-photo.fox-photo--sm').length).toBe(2);
  });

  it('your usual: the photo in a small frame', () => {
    const item = withPhoto('Iced Latte');
    localStorage.setItem(USUAL_KEY, JSON.stringify({ name: 'Iced Latte', price: 4.5, savedAt: Date.now() - 3600e3 }));
    const { getByTestId } = render(<FoxUsual menu={[item]} />);
    const frame = getByTestId('fox-usual').querySelector('.fox-photo.fox-photo--sm');
    fireEvent.load(frame.querySelector('img'));
    expect(frame.dataset.photo).toBe('photo');
    expect(frame.querySelector('img').getAttribute('alt')).toBe('Iced Latte');
  });
});
