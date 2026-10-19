import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* The real-chalkboard photo: the hero shows it only while it's switched on,
   has a url and is fresh; every other case is the drawn live-menu board. The
   admin control publishes the documented content_blocks shape. */

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('../src/lib/dataService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getContentBlock: vi.fn(async () => ({})),
}));
const upsert = vi.fn(async () => ({ error: null }));
let stored = null;
vi.mock('../src/lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: stored ? { data: stored } : null, error: null }) }) }),
      upsert: (...args) => upsert(...args),
    }),
  },
}));
vi.mock('../src/admin/lib/uploadImage.js', () => ({
  uploadImage: vi.fn(async () => ({ url: 'https://cdn.test/media/chalkboard/1-board.webp', path: 'chalkboard/1-board.webp', before: 4_000_000, after: 300_000 })),
  deleteMedia: vi.fn(async () => {}),
  formatBytes: (b) => `${b} B`,
}));

const { getContentBlock } = await import('../src/lib/dataService.js');
const { uploadImage, deleteMedia } = await import('../src/admin/lib/uploadImage.js');
const { isChalkboardLive, updatedLabel, daysAgo } = await import('../src/lib/chalkboard.js');
const PastryCaseHero = (await import('../src/components/sections/PastryCaseHero.jsx')).default;
const ChalkboardManager = (await import('../src/admin/managers/ChalkboardManager.jsx')).default;
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const { chalkStatus } = await import('../src/admin/lib/chalkStatus.js');

const DAY = 86400000;
const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();
const PHOTO = 'https://cdn.test/media/chalkboard/today.webp';

afterEach(() => { cleanup(); vi.clearAllMocks(); stored = null; });

function renderHero(data) {
  return render(<MemoryRouter><PastryCaseHero data={data} /></MemoryRouter>);
}
const photoImg = () => screen.queryByRole('img', { name: /chalkboard/i });
const drawnBoard = () => screen.findByText('Sips');

describe('freshness rules', () => {
  const now = new Date('2026-10-20T15:00:00Z'); // Tue, 11am in NJ
  it('counts calendar days on the shop clock, upload day included', () => {
    const block = (at, extra) => ({ enabled: true, url: PHOTO, updated_at: at, ...extra });
    expect(isChalkboardLive(block('2026-10-20T11:00:00Z'), { now })).toBe(true);
    expect(isChalkboardLive(block('2026-10-18T23:00:00Z'), { now })).toBe(true); // Sun 7pm NJ → 2 days
    expect(isChalkboardLive(block('2026-10-17T15:00:00Z'), { now })).toBe(false); // Sat → 3 days: stale
    expect(isChalkboardLive(block('2026-10-17T15:00:00Z', { max_age_days: 5 }), { now })).toBe(true);
    expect(isChalkboardLive(block('2026-10-19T15:00:00Z', { max_age_days: 1 }), { now })).toBe(false);
    // section override beats the block
    expect(isChalkboardLive(block('2026-10-17T15:00:00Z'), { now, maxAgeDays: 7 })).toBe(true);
  });
  it('is off when disabled, url-less, undated or missing', () => {
    expect(isChalkboardLive({ enabled: false, url: PHOTO, updated_at: now.toISOString() }, { now })).toBe(false);
    expect(isChalkboardLive({ enabled: true, url: '', updated_at: now.toISOString() }, { now })).toBe(false);
    expect(isChalkboardLive({ enabled: true, url: PHOTO, updated_at: 'nope' }, { now })).toBe(false);
    expect(isChalkboardLive(null, { now })).toBe(false);
    expect(isChalkboardLive({}, { now })).toBe(false);
  });
  it('labels the age the way a person would', () => {
    expect(updatedLabel('2026-10-20T12:00:00Z', now)).toBe('Updated today');
    expect(updatedLabel('2026-10-19T12:00:00Z', now)).toBe('Updated yesterday');
    expect(updatedLabel('2026-10-18T12:00:00Z', now)).toBe('Updated Sun');
    // 1am UTC Tue is still Monday evening in NJ
    expect(daysAgo('2026-10-20T01:00:00Z', now)).toBe(1);
  });
});

describe('Pastry Case hero: real chalkboard photo', () => {
  it('shows the photo (in place of the drawn board) when enabled and fresh, and opens it full-size', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, caption: 'Pumpkin cold foam is back', updated_at: iso(60_000) });
    renderHero();
    const img = await waitFor(() => { const i = photoImg(); expect(i).toBeTruthy(); return i; });
    expect(img.getAttribute('src')).toBe(PHOTO);
    expect(screen.getByText('Pumpkin cold foam is back')).toBeTruthy();
    expect(screen.getByText('Updated today')).toBeTruthy();
    expect(screen.queryByText('Sips')).toBeNull();
    expect(getContentBlock).toHaveBeenCalledWith('chalkboard_photo');

    const trigger = screen.getByRole('button', { name: /open the photo of our chalkboard/i });
    trigger.focus(); // a real click focuses the button; fireEvent doesn't
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('img').getAttribute('src')).toBe(PHOTO);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close photo' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    ['stale (older than 3 days)', () => ({ enabled: true, url: PHOTO, updated_at: iso(4 * DAY) })],
    ['switched off', () => ({ enabled: false, url: PHOTO, updated_at: iso() })],
    ['without a url', () => ({ enabled: true, url: '', updated_at: iso() })],
    ['missing (no row)', () => ({})],
  ])('falls back to the drawn live-menu board when the photo is %s', async (_, block) => {
    getContentBlock.mockResolvedValue(block());
    renderHero();
    expect(await drawnBoard()).toBeTruthy();
    await waitFor(() => expect(getContentBlock).toHaveBeenCalled());
    expect(photoImg()).toBeNull();
  });

  it('falls back when the fetch fails', async () => {
    getContentBlock.mockRejectedValue(new Error('offline'));
    renderHero();
    expect(await drawnBoard()).toBeTruthy();
    expect(photoImg()).toBeNull();
  });

  it('honors a shorter per-section max age', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, updated_at: iso(2 * DAY) });
    renderHero({ pch_chalk_max_days: 1 });
    expect(await drawnBoard()).toBeTruthy();
    expect(photoImg()).toBeNull();
  });

  it('falls back when the image itself fails to load', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, updated_at: iso() });
    renderHero();
    const img = await waitFor(() => { const i = photoImg(); expect(i).toBeTruthy(); return i; });
    fireEvent.error(img);
    expect(await drawnBoard()).toBeTruthy();
    expect(photoImg()).toBeNull();
  });
});

describe("admin: Today's chalkboard", () => {
  let realImage;
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    realImage = window.Image;
  });
  afterEach(() => {
    window.Image = realImage;
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  const renderAdmin = () =>
    render(
      <MemoryRouter initialEntries={['/admin/chalkboard']}>
        <ToastProvider><UnsavedProvider><ChalkboardManager /></UnsavedProvider></ToastProvider>
      </MemoryRouter>
    );
  const camera = () => screen.findByLabelText(/take a photo of the board/i);
  const putLiveBtn = () => screen.getByRole('button', { name: /put it on the website/i });
  const photo = (name = 'IMG_2041.jpg', type = 'image/jpeg') => new File(['x'], name, { type });
  const alertText = async () => (await screen.findByRole('alert')).textContent;

  it('one giant camera button (phone camera) plus a normal photo pick', async () => {
    renderAdmin();
    const cam = await camera();
    expect(cam.getAttribute('accept')).toBe('image/*');
    expect(cam.getAttribute('capture')).toBe('environment');
    expect(cam.closest('label').className).toMatch(/chalk__camera/);
    const pick = screen.getByLabelText(/choose a photo you already took/i);
    expect(pick.hasAttribute('capture')).toBe(false);
    // nothing to publish until there's a photo
    expect(screen.queryByRole('button', { name: /put it on the website/i })).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/not showing — the drawn menu board is up/i);
  });

  it('happy path: photo → homepage preview → "Put it on the website" publishes exactly once', async () => {
    stored = { enabled: true, url: 'https://cdn.test/media/chalkboard/0-old.webp', path: 'chalkboard/0-old.webp', caption: '', updated_at: iso(4 * DAY), max_age_days: 3 };
    renderAdmin();
    const file = photo();
    fireEvent.change(await camera(), { target: { files: [file] } });

    // the preview is the homepage's own framed, tilted board, marked as not live
    const img = await screen.findByAltText(/preview of the chalkboard photo on the homepage/i);
    expect(img.getAttribute('src')).toBe('blob:preview');
    expect(img.closest('.pch__board--photo')).toBeTruthy();
    expect(screen.getByText('Updated today')).toBeTruthy();
    expect(screen.getAllByText(/not on the website yet/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/retake/i)).toBeTruthy();
    // nothing has left the phone
    expect(uploadImage).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();

    // the optional words are folded away, but work
    expect(screen.getByText(/add a few words under the photo/i).closest('details').open).toBe(false);
    fireEvent.change(screen.getByLabelText(/a few words/i), { target: { value: '  Pumpkin cold foam is back  ' } });
    expect(upsert).not.toHaveBeenCalled();

    const before = Date.now();
    fireEvent.click(putLiveBtn());
    fireEvent.click(screen.getByRole('button', { name: /putting it up|put it on the website/i })); // an impatient double tap
    expect(await screen.findByRole('heading', { name: /it’s on the website/i })).toBeTruthy();

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledWith(file, { preset: 'chalkboard', folder: 'chalkboard' });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'key' });
    expect(row).toMatchObject({ key: 'chalkboard_photo', status: 'published' });
    expect(row.data).toEqual({
      url: 'https://cdn.test/media/chalkboard/1-board.webp',
      path: 'chalkboard/1-board.webp',
      caption: 'Pumpkin cold foam is back',
      updated_at: expect.any(String),
      enabled: true,
      max_age_days: 3,
    });
    expect(Date.parse(row.data.updated_at)).toBeGreaterThanOrEqual(before);
    expect(deleteMedia).toHaveBeenCalledWith('chalkboard/0-old.webp');

    // success screen: see it, go home, status in plain words
    const see = screen.getByRole('link', { name: /see it on the website/i });
    expect(see.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: /back to admin home/i }).getAttribute('href')).toBe('/admin');
    expect(screen.getByRole('status').textContent).toMatch(/on the website now — taken this (morning|afternoon|evening) at \d{1,2}:\d{2}, comes down \w+/i);
  });

  it('Retake swaps the photo without publishing anything', async () => {
    renderAdmin();
    fireEvent.change(await camera(), { target: { files: [photo('a.jpg')] } });
    const second = photo('b.jpg');
    fireEvent.change(screen.getByLabelText(/retake/i), { target: { files: [second] } });
    expect(uploadImage).not.toHaveBeenCalled();
    fireEvent.click(putLiveBtn());
    await screen.findByRole('heading', { name: /it’s on the website/i });
    expect(uploadImage).toHaveBeenCalledWith(second, expect.anything());
  });

  it('how long it stays up is under "More options", defaulting to 3 days', async () => {
    renderAdmin();
    const select = await screen.findByLabelText(/take the photo down after/i);
    expect(select.closest('details').open).toBe(false);
    expect(select.value).toBe('3');
    fireEvent.change(await camera(), { target: { files: [photo()] } });
    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.click(putLiveBtn());
    await screen.findByRole('heading', { name: /it’s on the website/i });
    expect(upsert.mock.calls[0][0].data.max_age_days).toBe(1);
  });

  it('"Take the photo down" is staged until the one big button', async () => {
    stored = { enabled: true, url: PHOTO, path: 'chalkboard/today.webp', caption: 'Hi', updated_at: iso(), max_age_days: 3 };
    renderAdmin();
    fireEvent.click(await screen.findByRole('button', { name: /take the photo down/i }));
    expect(upsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /take it off the website/i }));
    await screen.findByRole('heading', { name: /drawn menu board is back/i });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({ key: 'chalkboard_photo', data: { ...stored, enabled: false } });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/not showing — the drawn menu board is up/i);
  });

  describe('problems are explained in plain words', () => {
    it('a photo that is too big', async () => {
      renderAdmin();
      const big = photo('huge.jpg');
      Object.defineProperty(big, 'size', { value: 22 * 1024 * 1024 });
      fireEvent.change(await camera(), { target: { files: [big] } });
      expect(await alertText()).toMatch(/too big \(22\.0 MB\)/i);
      expect(screen.queryByRole('button', { name: /put it on the website/i })).toBeNull();
    });

    it('a file that is not a photo', async () => {
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' })] } });
      expect(await alertText()).toMatch(/isn’t a photo/i);
    });

    it('an iPhone HEIC this browser cannot open', async () => {
      window.Image = class { set src(_) { setTimeout(() => this.onerror?.(), 0); } };
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo('IMG_0001.HEIC', 'image/heic')] } });
      expect(await alertText()).toMatch(/HEIC.*Most Compatible/s);
      expect(uploadImage).not.toHaveBeenCalled();
    });

    it('a HEIC the browser CAN open (Safari) goes through as normal', async () => {
      window.Image = class { set src(_) { setTimeout(() => this.onload?.(), 0); } };
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo('IMG_0001.HEIC', 'image/heic')] } });
      expect(await screen.findByRole('button', { name: /put it on the website/i })).toBeTruthy();
    });

    it('no connection: keeps the photo and says what to do', async () => {
      upsert.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo()] } });
      fireEvent.click(putLiveBtn());
      expect(await alertText()).toMatch(/no connection.*your photo is still here/i);
      expect(putLiveBtn().disabled).toBe(false);
      expect(screen.getByAltText(/preview of the chalkboard photo/i)).toBeTruthy();
    });

    it('offline before trying: nothing is sent', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo()] } });
      fireEvent.click(putLiveBtn());
      expect(await alertText()).toMatch(/no connection/i);
      expect(uploadImage).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    });

    it('signed out: says so and offers a sign-in link', async () => {
      uploadImage.mockRejectedValueOnce(new Error('JWT expired'));
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo()] } });
      fireEvent.click(putLiveBtn());
      expect(await alertText()).toMatch(/signed out/i);
      expect(screen.getByRole('link', { name: /sign in again/i }).getAttribute('target')).toBe('_blank');
      expect(upsert).not.toHaveBeenCalled();
    });
  });
});

describe('chalkboard status line', () => {
  // Mon Oct 19 2026, 7:42 AM in NJ
  const taken = '2026-10-19T11:42:00Z';
  it('says when it was taken and when it comes down, on the shop clock', () => {
    const now = new Date('2026-10-19T14:00:00Z');
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 3 }, now)).toEqual({
      live: true,
      text: 'On the website now — taken this morning at 7:42, comes down Thursday',
    });
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 1 }, now).text).toMatch(/comes down tomorrow$/);
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 3 }, new Date('2026-10-20T14:00:00Z')).text)
      .toBe('On the website now — taken yesterday at 7:42 AM, comes down Thursday');
  });
  it('says plainly when the drawn board is up', () => {
    const now = new Date('2026-10-23T14:00:00Z');
    expect(chalkStatus({ enabled: false, url: PHOTO, updated_at: taken }, now).text).toBe('Not showing — the drawn menu board is up');
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 3 }, now).text).toMatch(/^Not showing — the last photo \(taken on Mon at 7:42 AM\) has come down/);
    expect(chalkStatus({}, now).text).toBe('Not showing — the drawn menu board is up');
  });
});
