import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnnouncementBanner from '../src/components/AnnouncementBanner.jsx';
import RainyBanner from '../src/components/RainyBanner.jsx';
import useFoxOutfit from '../src/lib/useFoxOutfit.js';
import { WEATHER_KEY } from '../src/lib/foxOutfit.js';
import { DISMISS_KEY, RAINY_COPY, bannerKind, dismiss, isDismissed, kindFor, previewKind, shopDay } from '../src/lib/rainyBanner.js';
import { SPOTON_ORDER_URL } from '../src/lib/config.js';

/* The rainy-day "order ahead" banner (src/lib/rainyBanner.js +
   src/components/RainyBanner.jsx). Weather comes from the fox's cached live
   call, so tests seed that sessionStorage cache; open/closed comes from the
   seed hours (Mon 7:30 AM – 7:00 PM) on a faked shop clock. */

const ann = vi.hoisted(() => ({ block: { enabled: false, message: '' } }));
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('../src/lib/dataService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getContentBlock: vi.fn(async (key) => (key === 'announcement_banner' ? ann.block : {})),
}));

const OPEN = new Date('2026-10-19T18:00:00Z'); // Mon 2:00 PM in Haddon Heights
const CLOSED = new Date('2026-10-20T03:00:00Z'); // Mon 11:00 PM

const at = (d) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(d); };
const weather = (code) => sessionStorage.setItem(WEATHER_KEY, JSON.stringify({ code, tempF: 40, isDay: true, at: Date.now() }));
const url = (q) => window.history.replaceState(null, '', `/${q}`);

function shell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AnnouncementBanner fallback={<RainyBanner />} />
    </MemoryRouter>
  );
}

const banner = () => screen.queryByRole('status', { name: /(rainy|snowy) day note/i });
// let the hours + announcement promises settle, then assert nothing showed
const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); await new Promise((r) => setTimeout(r, 20)); };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  ann.block = { enabled: false, message: '' };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  url('');
});

describe('rules', () => {
  it('counts rain, drizzle, storms and snow, not heat or dry skies', () => {
    [51, 53, 61, 65, 80, 95, 99].forEach((code) => expect(kindFor({ code })).toBe('rain'));
    [71, 75, 77, 85, 86].forEach((code) => expect(kindFor({ code })).toBe('snow'));
    [0, 1, 2, 3, 45].forEach((code) => expect(kindFor({ code, tempF: 99 })).toBeNull());
    expect(kindFor(null)).toBeNull();
  });

  it('needs wet weather AND open, and steps aside for admin, the announcement or a dismissal', () => {
    const rain = { code: 61 };
    expect(bannerKind({ weather: rain, open: true })).toBe('rain');
    expect(bannerKind({ weather: { code: 73 }, open: true })).toBe('snow');
    expect(bannerKind({ weather: rain, open: false })).toBeNull();
    expect(bannerKind({ weather: rain, open: null })).toBeNull(); // hours still loading
    expect(bannerKind({ weather: { code: 0 }, open: true })).toBeNull();
    expect(bannerKind({ weather: rain, open: true, dismissed: true })).toBeNull();
    expect(bannerKind({ weather: rain, open: true, admin: true })).toBeNull();
    expect(bannerKind({ weather: rain, open: true, announcement: true })).toBeNull();
    // a preview ignores the hours and the weather
    expect(bannerKind({ preview: 'snow', open: false })).toBe('snow');
    expect(bannerKind({ preview: 'rain', admin: true })).toBeNull();
  });

  it('reads the preview from ?weather= or the fox’s ?foxOutfit=, and ignores anything else', () => {
    expect(previewKind('?weather=rain')).toBe('rain');
    expect(previewKind('?weather=SNOW')).toBe('snow');
    expect(previewKind('?foxOutfit=rain')).toBe('rain');
    expect(previewKind('?foxOutfit=snow')).toBe('snow');
    expect(previewKind('?foxOutfit=hot')).toBeNull();
    expect(previewKind('?weather=hail')).toBeNull();
    expect(previewKind('?weather=<script>')).toBeNull();
    expect(previewKind('')).toBeNull();
  });

  it('dismisses for the shop’s day, and resets the next day', () => {
    dismiss(new Date('2026-10-19T14:00:00Z'));
    expect(localStorage.getItem(DISMISS_KEY)).toBe('2026-10-19');
    expect(isDismissed(new Date('2026-10-20T03:59:00Z'))).toBe(true); // 11:59 PM in NJ
    expect(isDismissed(new Date('2026-10-20T04:01:00Z'))).toBe(false); // 12:01 AM next day
    expect(shopDay(new Date('2026-10-20T03:00:00Z'))).toBe('2026-10-19');
  });

  it('survives storage that throws', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => dismiss()).not.toThrow();
    expect(isDismissed()).toBe(false);
    get.mockRestore(); set.mockRestore();
  });
});

describe('<RainyBanner>', () => {
  it('shows the rain copy and an order-ahead link when it rains and the shop is open', async () => {
    at(OPEN); weather(61);
    shell();
    const bar = await screen.findByRole('status', { name: /rainy day note/i });
    expect(bar.textContent).toContain(RAINY_COPY.rain.message);
    const link = screen.getByRole('link', { name: /order ahead/i });
    expect(link.getAttribute('href')).toBe(SPOTON_ORDER_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toMatch(/noopener/);
    expect(screen.getByRole('button', { name: /dismiss rainy day note/i })).toBeTruthy();
  });

  it('shows the snow copy when it snows and the shop is open', async () => {
    at(OPEN); weather(75);
    shell();
    const bar = await screen.findByRole('status', { name: /snowy day note/i });
    expect(bar.textContent).toContain(RAINY_COPY.snow.message);
    expect(bar.closest('.rainy').dataset.kind).toBe('snow');
  });

  it('stays hidden when the shop is closed', async () => {
    at(CLOSED); weather(61);
    shell();
    await settle();
    expect(banner()).toBeNull();
  });

  it('stays hidden on a dry day, or with no weather at all', async () => {
    at(OPEN); weather(2);
    shell();
    await settle();
    expect(banner()).toBeNull();
    cleanup(); sessionStorage.clear();
    shell();
    await settle();
    expect(banner()).toBeNull();
  });

  it('stays hidden on /admin', async () => {
    at(OPEN); weather(61);
    shell('/admin/home');
    await settle();
    expect(banner()).toBeNull();
  });

  it('gives way to the owner’s announcement banner', async () => {
    at(OPEN); weather(61);
    ann.block = { enabled: true, message: 'Closing early for the parade!' };
    shell();
    await screen.findByText('Closing early for the parade!');
    await settle();
    expect(banner()).toBeNull();
  });

  it('× hides it for the rest of the day; it is back the next day', async () => {
    at(OPEN); weather(61);
    shell();
    fireEvent.click(await screen.findByRole('button', { name: /dismiss rainy day note/i }));
    expect(banner()).toBeNull();
    expect(localStorage.getItem(DISMISS_KEY)).toBe('2026-10-19');

    cleanup();
    shell(); // later the same day
    await settle();
    expect(banner()).toBeNull();

    cleanup();
    vi.setSystemTime(new Date('2026-10-20T15:00:00Z')); // Tue 11:00 AM, still raining
    weather(63);
    shell();
    expect(await screen.findByRole('status', { name: /rainy day note/i })).toBeTruthy();
  });

  it('?weather=rain|snow previews it even when closed and dry', async () => {
    at(CLOSED);
    url('?weather=snow');
    shell();
    expect((await screen.findByRole('status', { name: /snowy day note/i })).textContent).toContain(RAINY_COPY.snow.message);
    cleanup();
    url('?weather=rain');
    shell();
    expect(await screen.findByRole('status', { name: /rainy day note/i })).toBeTruthy();
  });

  it('?foxOutfit=rain previews it too, and ?weather= dresses the fox to match', async () => {
    at(CLOSED);
    url('?foxOutfit=rain');
    shell();
    expect(await screen.findByRole('status', { name: /rainy day note/i })).toBeTruthy();

    url('?weather=snow');
    expect(renderHook(() => useFoxOutfit()).result.current.weather).toBe('snow');
    url('?weather=rain');
    expect(renderHook(() => useFoxOutfit()).result.current.parts).toContain('umbrella');
    url('?weather=hail');
    expect(renderHook(() => useFoxOutfit()).result.current.weather).toBeNull();
  });
});
