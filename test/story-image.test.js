import { describe, it, expect, vi } from 'vitest';
import {
  FONTS, NoPhotoError, SAFE_BOTTOM, SAFE_TOP, STORY_H, STORY_W, cacheBust, ensureFonts, layoutStory, loadDrinkArt, loadPhoto, renderStory, wrapText,
} from '../src/lib/storyImage.js';
import { PERSONAS, personaFor } from '../src/lib/drinkPersona.js';
import { MENU_ITEMS } from '../src/lib/seed.js';

/* The Instagram Story image (src/lib/storyImage.js). jsdom has no canvas,
   so a small fake one records what's drawn; the layout is tested on its own
   with a deterministic text measurer. */

const by = (n) => MENU_ITEMS.find((i) => i.name === n);
const pxOf = (font) => Number(/(\d+)px/.exec(font)?.[1] || 10);
// a deliberately generous measurer (wider than real glyphs) so the layout is tested on the safe side
const measure = (text, font) => String(text).length * pxOf(font) * (/Fraunces/.test(font) ? 0.6 : 0.58);

function fakeCanvas({ taint = false } = {}) {
  const log = [];
  const grad = () => ({ addColorStop() {} });
  const ctx = new Proxy({
    font: '10px x',
    measureText(t) { return { width: measure(t, this.font) }; },
    createLinearGradient: grad,
    createRadialGradient: grad,
    createPattern: () => ({}),
    getImageData(x, y, w, h) {
      if (taint && log.some((l) => l[0] === 'drawImage' && l[1]?.src?.startsWith('https://'))) throw new DOMException('tainted', 'SecurityError');
      return { data: new Uint8ClampedArray(w * h * 4) };
    },
  }, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => { log.push([k, ...args]); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return { canvas: (w, h) => ({ width: w, height: h, getContext: () => ctx, toBlob: (cb) => cb(new Blob(['png'], { type: 'image/png' })) }), log };
}

const img = (src, w = 400, h = 500) => ({ src, naturalWidth: w, naturalHeight: h });
const PHOTO = 'https://x.supabase.co/storage/v1/object/public/media/menu_items/1729-iced-matcha-latte.jpg';
const CUTOUT = 'https://x.supabase.co/storage/v1/object/public/media/menu_items/1729-hot-latte-cutout.webp';
const netErr = () => new TypeError('Failed to fetch');
const okRes = (type = 'image/jpeg') => ({ ok: true, status: 200, blob: async () => new Blob(['bytes'], { type }) });
/** Loader deps: fetch → Blob → "bitmap" (a stand-in image), all recorded. */
function deps({ fetch, bitmap, load, w = 400, h = 500 } = {}) {
  const urls = [];
  return {
    fetch: vi.fn(fetch || (async () => okRes())),
    bitmap: vi.fn(bitmap || (async (b) => ({ ...img(`bitmap:${b.type}`, w, h), width: w, height: h, close: vi.fn() }))),
    load: vi.fn(load || (async (src) => img(src, w, h))),
    objectUrl: vi.fn((b) => { const u = `blob:${urls.length}`; urls.push(b); return u; }),
    revoke: vi.fn(),
  };
}

describe('the Story layout', () => {
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it('keeps every key element inside Instagram’s safe zone, inside the canvas, and apart', () => {
    for (const p of PERSONAS) {
      for (const drink of ['Cold Brew', 'Iced Matcha Latte', 'Shaken Espresso - 20oz', 'Coconut Water Americano']) {
        const L = layoutStory({ ...p, article: 'a', drink }, measure);
        const boxes = Object.entries(L.key);
        for (const [name, b] of boxes) {
          expect([p.id, name, b.y >= SAFE_TOP]).toEqual([p.id, name, true]);
          expect([p.id, name, b.y + b.h <= SAFE_BOTTOM]).toEqual([p.id, name, true]);
          expect(b.x).toBeGreaterThanOrEqual(80);
          expect(b.x + b.w).toBeLessThanOrEqual(STORY_W - 80);
        }
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            expect([p.id, drink, boxes[i][0], boxes[j][0], overlap(boxes[i][1], boxes[j][1])]).toEqual([p.id, drink, boxes[i][0], boxes[j][0], false]);
          }
        }
        // the name is big, and the drink frame a real size
        expect(L.name.px).toBeGreaterThanOrEqual(80);
        expect(L.frame.w).toBeGreaterThanOrEqual(300);
      }
    }
  });

  it('wraps at spaces and after hyphens, never wider than asked', () => {
    const lines = wrapText(measure, 'Breakfast-All-Day Bandit', FONTS.name(120), 760);
    expect(lines.join('').replace(/\s/g, '')).toBe('Breakfast-All-DayBandit');
    lines.forEach((l) => expect(measure(l, FONTS.name(120))).toBeLessThanOrEqual(760));
  });
});

describe('loading the drink photo for the canvas', () => {
  const make = () => fakeCanvas().canvas;

  it('(a) fetches the bytes with CORS and no cache, then decodes the Blob', async () => {
    const d = deps();
    const got = await loadPhoto(PHOTO, { ...d, make: make() });
    expect(got.via).toBe('fetch');
    expect(d.fetch).toHaveBeenCalledTimes(1);
    expect(d.fetch).toHaveBeenCalledWith(PHOTO, expect.objectContaining({ mode: 'cors', cache: 'no-store' }));
    expect(d.bitmap).toHaveBeenCalledWith(expect.any(Blob));
    expect(d.load).not.toHaveBeenCalled();
  });

  it('decodes through an object-URL Image when createImageBitmap can’t', async () => {
    const d = deps({ bitmap: async () => { throw new Error('no webp bitmaps here'); } });
    const got = await loadPhoto(PHOTO, { ...d, make: make() });
    expect(got.via).toBe('fetch');
    expect(d.load).toHaveBeenCalledWith('blob:0');
    got.cleanup();
    expect(d.revoke).toHaveBeenCalledWith('blob:0');
  });

  it('retries the fetch once on a network error', async () => {
    let n = 0;
    const d = deps({ fetch: async () => { n += 1; if (n === 1) throw netErr(); return okRes(); } });
    const got = await loadPhoto(PHOTO, { ...d, make: make() });
    expect(got.via).toBe('fetch');
    expect(d.fetch).toHaveBeenCalledTimes(2);
  });

  it('(b) falls back to a crossOrigin Image on a cache-busted URL, retried once', async () => {
    let tries = 0;
    const d = deps({
      fetch: async () => { throw netErr(); },
      load: async (src) => { tries += 1; if (tries === 1) throw new Error('image failed'); return img(src); },
    });
    const got = await loadPhoto(PHOTO, { ...d, make: make() });
    expect(got.via).toBe('image');
    expect(d.fetch).toHaveBeenCalledTimes(2); // (a) and its one retry
    expect(d.load).toHaveBeenCalledTimes(2); // (b) and its one retry
    d.load.mock.calls.forEach(([u]) => { expect(u.startsWith(`${PHOTO}?tbstory=`)).toBe(true); });
    expect(cacheBust('https://a/b.jpg?w=2', 'x')).toBe('https://a/b.jpg?w=2&tbstory=x');
  });

  it('does not retry the fetch on a 404, and gives up when every way fails', async () => {
    const d = deps({ fetch: async () => ({ ok: false, status: 404, blob: async () => new Blob([]) }), load: async () => { throw new Error('404'); } });
    expect(await loadPhoto(PHOTO, { ...d, make: make() })).toBeNull();
    expect(d.fetch).toHaveBeenCalledTimes(1);
    expect(d.load).toHaveBeenCalledTimes(2);
  });

  it('refuses a photo that would taint the canvas (and never swaps in the cup)', async () => {
    const d = deps({ fetch: async () => { throw netErr(); } });
    expect(await loadPhoto('https://elsewhere.example/m.jpg', { ...d, make: fakeCanvas({ taint: true }).canvas })).toBeNull();
  });

  it('only ever uses the item’s own image_url — no drop-in file, no drawing', async () => {
    const d = deps();
    expect(await loadDrinkArt(by('Cold Brew'), { ...d, make: make() })).toBeNull();
    expect(d.fetch).not.toHaveBeenCalled();
    expect(d.load).not.toHaveBeenCalled();
    const art = await loadDrinkArt({ ...by('Hot Latte'), image_url: CUTOUT }, { ...d, make: make() });
    expect(art.kind).toBe('cutout');
    expect((await loadDrinkArt({ ...by('Iced Matcha Latte'), image_url: PHOTO }, { ...d, make: make() })).kind).toBe('photo');
  });
});

describe('renderStory', () => {
  const brand = async (src) => img(src);
  const artDraw = (log, L) => log.filter((l) => l[0] === 'drawImage' && String(l[1]?.src || '').startsWith('bitmap:'))
    .map(([, , x, y, w, h]) => ({ x, y, w, h, frame: L.frame })).filter((a) => a.w > 10); // (not the 2x2 taint check)

  it('draws a 1080 x 1920 canvas with the persona, the handle and the drink photo (fetched)', async () => {
    const { canvas, log } = fakeCanvas();
    const persona = personaFor({ item: by('Iced Matcha Latte') });
    const item = { ...by('Iced Matcha Latte'), image_url: PHOTO };
    const fonts = vi.fn(async () => {});
    const d = deps();
    const out = await renderStory({ persona, item, make: canvas, fonts, ...d, load: brand });
    expect([out.canvas.width, out.canvas.height]).toEqual([STORY_W, STORY_H]);
    expect([STORY_W, STORY_H]).toEqual([1080, 1920]);
    expect(fonts).toHaveBeenCalled();
    expect(out.art).toMatchObject({ kind: 'photo', via: 'fetch' });
    const texts = log.filter((l) => l[0] === 'fillText').map((l) => l[1]);
    expect(texts).toContain('Matcha');
    expect(texts).toContain('Mischief-Maker');
    expect(texts).toContain('@troublebrewingcoffee');
    expect(texts).toContain('troublebrewingcoffeehouse.com');
    expect(texts.join(' ')).toContain('Iced Matcha Latte');
    expect(texts.join(' ')).not.toMatch(/\$/);
    expect(artDraw(log, out.layout)).toHaveLength(1);
  });

  it('a regular photo fills (and crops to) the frame; a cutout stands whole inside it', async () => {
    const persona = personaFor({ item: by('Hot Latte') });
    // a wide photo: cover-fill overflows the frame's width (then clipped)
    let f = fakeCanvas();
    let out = await renderStory({ persona, item: { ...by('Hot Latte'), image_url: PHOTO }, make: f.canvas, fonts: async () => {}, ...deps({ w: 900, h: 400 }), load: brand });
    let [a] = artDraw(f.log, out.layout);
    expect(a.h).toBeGreaterThanOrEqual(out.layout.frame.h * 0.85);
    expect(a.w).toBeGreaterThan(out.layout.frame.w);
    // the same image as a cutout: contained, nothing cut off, centred on the mat
    f = fakeCanvas();
    out = await renderStory({ persona, item: { ...by('Hot Latte'), image_url: CUTOUT }, make: f.canvas, fonts: async () => {}, ...deps({ w: 900, h: 400 }), load: brand });
    [a] = artDraw(f.log, out.layout);
    const fr = out.layout.frame;
    expect(out.art.kind).toBe('cutout');
    expect(a.x).toBeGreaterThan(fr.x);
    expect(a.x + a.w).toBeLessThan(fr.x + fr.w);
    expect(a.y).toBeGreaterThan(fr.y);
    expect(a.y + a.h).toBeLessThan(fr.y + fr.h);
    expect(Math.abs(a.x + a.w / 2 - (fr.x + fr.w / 2))).toBeLessThan(1);
  });

  it('never draws a stand-in: if every way to the photo fails, it rejects with NoPhotoError', async () => {
    const { canvas, log } = fakeCanvas();
    const d = deps({ fetch: async () => { throw netErr(); }, load: async (src) => { if (src.includes('/brand/')) return img(src); throw new Error('404'); } });
    await expect(renderStory({ persona: personaFor({ item: by('Cold Brew') }), item: { ...by('Cold Brew'), image_url: PHOTO }, make: canvas, fonts: async () => {}, ...d }))
      .rejects.toBeInstanceOf(NoPhotoError);
    expect(log.some((l) => l[0] === 'drawImage' && /^data:image\/svg/.test(l[1]?.src || ''))).toBe(false);
    // and a drink with no image_url at all
    await expect(renderStory({ persona: personaFor({ item: by('Cold Brew') }), item: by('Cold Brew'), make: canvas, fonts: async () => {}, ...deps() }))
      .rejects.toBeInstanceOf(NoPhotoError);
  });

  it('waits for the brand fonts before drawing', async () => {
    const load = vi.fn(async () => []);
    let ready = false;
    const doc = { fonts: { load, ready: new Promise((r) => setTimeout(() => { ready = true; r(); }, 5)) } };
    await ensureFonts(doc);
    expect(ready).toBe(true);
    const faces = load.mock.calls.map((c) => c[0]).join(' | ');
    expect(faces).toMatch(/Fraunces/);
    expect(faces).toMatch(/Work Sans/);
    expect(faces).toMatch(/Caveat/);
  });
});
