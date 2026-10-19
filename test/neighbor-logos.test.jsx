import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
const { mediaUrl } = await import('../src/lib/config.js');
const { logoFor, orderBusinesses } = await import('../src/lib/localBusinesses.js');
const { LOCAL_BUSINESSES: BUSINESSES } = await import('../src/lib/seed.js');
const StationAveStrip = (await import('../src/components/sections/StationAveStrip.jsx')).default;

afterEach(() => cleanup());

const BASE = import.meta.env.BASE_URL;
const ROWS = [
  { id: 'a', name: "Anthony's Creative Italian Cuisine", category: 'restaurant', address: '512 Station Ave', url: 'https://a.example/', logo_url: '/images/neighbors/anthonys.png' },
  { id: 'l', name: "Lula's Empanadas", category: 'restaurant', address: '516 Station Ave', url: 'https://l.example/', logo_url: 'https://cdn.example/lulas.png' },
  { id: 'n', name: 'No Logo Shop', category: 'retail', address: '530 Station Ave', url: 'https://n.example/', logo_url: '' },
];
const strip = () => render(<MemoryRouter><StationAveStrip ordered={orderBusinesses(ROWS, 'street')} /></MemoryRouter>);

describe('neighbor logo urls', () => {
  it('resolves site-relative paths under the deploy base and leaves absolute ones alone', () => {
    expect(mediaUrl('/images/neighbors/anthonys.png')).toBe(`${BASE}images/neighbors/anthonys.png`);
    expect(mediaUrl('images/neighbors/ralphs.jpg')).toBe(`${BASE}images/neighbors/ralphs.jpg`);
    expect(mediaUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
    expect(mediaUrl('//cdn.example/x.png')).toBe('//cdn.example/x.png');
    expect(mediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(mediaUrl('')).toBe('');
    expect(mediaUrl(null)).toBe('');
  });

  it('knows the self-hosted logos (ground colour, shape, WebP twin) and treats hotlinks generically', () => {
    const a = logoFor('/images/neighbors/anthonys.png');
    expect(a).toMatchObject({ src: `${BASE}images/neighbors/anthonys.png`, webp: `${BASE}images/neighbors/anthonys.webp`, bg: '#000000' });
    expect(a.ratio).toBeGreaterThan(1.5);
    expect(logoFor('/images/neighbors/ralphs.jpg')).toMatchObject({ bg: '#47403a', ratio: 1 });
    expect(logoFor('/images/neighbors/april-robin.png').bg).toBe('#dacce0');
    const hot = logoFor('https://cdn.example/lulas.png');
    expect(hot).toMatchObject({ src: 'https://cdn.example/lulas.png', webp: null, bg: null, ratio: null });
    // an unknown file we host gets no guessed .webp twin
    expect(logoFor('/images/neighbors/someone-new.png').webp).toBeNull();
    expect(logoFor('')).toBeNull();
  });

  it('the seed points the five supplied logos at the self-hosted files, and each one is known', () => {
    const by = (re) => BUSINESSES.find((b) => re.test(b.name))?.logo_url;
    expect(by(/^Anthony/)).toBe('/images/neighbors/anthonys.png');
    expect(by(/^Ralph/)).toBe('/images/neighbors/ralphs.jpg');
    expect(by(/^South Jersey/)).toBe('/images/neighbors/south-jersey-special.png');
    expect(by(/^Jane/)).toBe('/images/neighbors/janes-tea-house.png');
    expect(by(/^April Robin/)).toBe('/images/neighbors/april-robin.png');
    expect(by(/^Lula/)).toMatch(/^https:\/\/images\.squarespace-cdn\.com\//);
    for (const re of [/^Anthony/, /^Ralph/, /^South Jersey/, /^Jane/, /^April Robin/]) expect(logoFor(by(re)).bg).toBeTruthy();
  });
});

describe('logo sign boards on the storefronts', () => {
  it('hangs the real logo as the sign, with the business name as alt text and no monogram blade', () => {
    const { container } = strip();
    const img = screen.getByRole('img', { name: "Anthony's Creative Italian Cuisine logo" });
    expect(img.getAttribute('src')).toBe(`${BASE}images/neighbors/anthonys.png`);
    expect(img.closest('picture').querySelector('source').getAttribute('srcset')).toBe(`${BASE}images/neighbors/anthonys.webp`);
    const shop = img.closest('.shop');
    const sign = img.closest('.shop__sign');
    expect(sign.classList.contains('shop__sign--logo')).toBe(true);
    expect(sign.style.getPropertyValue('--logo-bg')).toBe('#000000');
    expect(shop.querySelector('.shop__blade')).toBeNull();
    expect(shop.querySelector('.shop__name')).toBeNull();
    // the hotlinked logo also becomes a board (cream, shape measured on load)
    const lula = screen.getByRole('img', { name: "Lula's Empanadas logo" });
    expect(lula.closest('.shop__sign').classList.contains('shop__sign--plain')).toBe(true);
    // no logo at all → the painted name and the round monogram sign
    const plain = container.querySelector('[data-stop="n"]');
    expect(plain.querySelector('.shop__name').textContent).toBe('No Logo Shop');
    expect(plain.querySelector('.shop__mono').textContent).toBe('NL');
  });

  it('falls back to the painted name and monogram when the logo fails to load', () => {
    const { container } = strip();
    const img = screen.getByRole('img', { name: "Lula's Empanadas logo" });
    fireEvent.error(img);
    expect(screen.queryByRole('img', { name: "Lula's Empanadas logo" })).toBeNull();
    const shop = container.querySelector('[data-stop="l"]');
    expect(shop.querySelector('.shop__name').textContent).toBe('Lula’s');
    expect(shop.querySelector('.shop__mono').textContent).toBe('LE');
    expect(shop.querySelector('.shop__sign--logo')).toBeNull();
  });

  it('measures a hotlinked logo on load to choose a square or wide board', () => {
    strip();
    const img = screen.getByRole('img', { name: "Lula's Empanadas logo" });
    Object.defineProperty(img, 'naturalWidth', { value: 300 });
    Object.defineProperty(img, 'naturalHeight', { value: 300 });
    fireEvent.load(img);
    const sign = img.closest('.shop__sign');
    expect(sign.classList.contains('shop__sign--square')).toBe(true);
    expect(sign.style.getPropertyValue('--logo-ar')).toBe('1.0000');
  });
});
