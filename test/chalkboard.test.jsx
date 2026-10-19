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
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  const renderAdmin = () => render(<ToastProvider><ChalkboardManager /></ToastProvider>);

  it('offers the phone camera and a normal file pick', async () => {
    renderAdmin();
    const camera = await screen.findByLabelText(/take a photo/i);
    expect(camera.getAttribute('accept')).toBe('image/*');
    expect(camera.getAttribute('capture')).toBe('environment');
    const pick = screen.getByLabelText(/choose a photo/i);
    expect(pick.getAttribute('accept')).toBe('image/*');
    expect(pick.hasAttribute('capture')).toBe(false);
  });

  it('previews, compresses + uploads under chalkboard/, and publishes the documented shape', async () => {
    stored = { enabled: true, url: 'https://cdn.test/media/chalkboard/0-old.webp', path: 'chalkboard/0-old.webp', caption: '', updated_at: iso(DAY), max_age_days: 3 };
    renderAdmin();
    const file = new File(['x'], 'IMG_2041.HEIC.jpg', { type: 'image/jpeg' });
    fireEvent.change(await screen.findByLabelText(/choose a photo/i), { target: { files: [file] } });
    expect(screen.getByAltText(/preview of the new chalkboard photo/i).getAttribute('src')).toBe('blob:preview');
    expect(uploadImage).not.toHaveBeenCalled(); // nothing leaves the phone before Publish

    fireEvent.change(screen.getByLabelText(/a few words/i), { target: { value: '  Pumpkin cold foam is back  ' } });
    const before = Date.now();
    fireEvent.click(screen.getByRole('button', { name: /publish this photo/i }));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));

    expect(uploadImage).toHaveBeenCalledWith(file, { preset: 'chalkboard', folder: 'chalkboard' });
    const [row, opts] = upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'key' });
    expect(row.key).toBe('chalkboard_photo');
    expect(row.status).toBe('published');
    expect(row.data).toEqual({
      url: 'https://cdn.test/media/chalkboard/1-board.webp',
      path: 'chalkboard/1-board.webp',
      caption: 'Pumpkin cold foam is back',
      updated_at: expect.any(String),
      enabled: true,
      max_age_days: 3,
    });
    expect(new Date(row.data.updated_at).toISOString()).toBe(row.data.updated_at);
    expect(Date.parse(row.data.updated_at)).toBeGreaterThanOrEqual(before);
    // yesterday's photo is tidied away
    expect(deleteMedia).toHaveBeenCalledWith('chalkboard/0-old.webp');
    expect(await screen.findByText(/showing on the homepage/i)).toBeTruthy();
  });

  it('"Remove" goes back to the drawn board (enabled false, photo kept)', async () => {
    stored = { enabled: true, url: PHOTO, path: 'chalkboard/today.webp', caption: 'Hi', updated_at: iso(), max_age_days: 3 };
    renderAdmin();
    fireEvent.click(await screen.findByRole('button', { name: /go back to the drawn board/i }));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][0]).toMatchObject({ key: 'chalkboard_photo', data: { ...stored, enabled: false } });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(await screen.findByText(/not showing/i)).toBeTruthy();
  });

  it('shows when it was last updated', async () => {
    stored = { enabled: true, url: PHOTO, updated_at: '2026-10-19T13:05:00Z', max_age_days: 7 };
    renderAdmin();
    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/Oct 19/);
    expect(status.textContent).toMatch(/9:05/);
  });
});
