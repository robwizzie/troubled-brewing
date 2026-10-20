import { describe, it, expect, vi } from 'vitest';
import {
  FONTS, SAFE_BOTTOM, SAFE_TOP, STORY_H, STORY_W, ensureFonts, layoutStory, loadDrinkArt, renderStory, wrapText,
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

const img = (src) => ({ src, naturalWidth: 400, naturalHeight: 500 });

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

describe('renderStory', () => {
  it('draws a 1080 x 1920 canvas with the persona, the handle and the drink photo', async () => {
    const { canvas, log } = fakeCanvas();
    const persona = personaFor({ item: by('Iced Matcha Latte') });
    const item = { ...by('Iced Matcha Latte'), image_url: 'https://x.supabase.co/storage/v1/object/public/menu/m.jpg' };
    const load = vi.fn(async (src) => img(src));
    const fonts = vi.fn(async () => {});
    const out = await renderStory({ persona, item, cupSvg: '<svg/>', make: canvas, load, fonts });
    expect(out.canvas.width).toBe(STORY_W);
    expect(out.canvas.height).toBe(STORY_H);
    expect([STORY_W, STORY_H]).toEqual([1080, 1920]);
    expect(fonts).toHaveBeenCalled();
    expect(out.art.kind).toBe('photo');
    const texts = log.filter((l) => l[0] === 'fillText').map((l) => l[1]);
    expect(texts).toContain('Matcha');
    expect(texts).toContain('Mischief-Maker');
    expect(texts).toContain('@troublebrewingcoffee');
    expect(texts).toContain('troublebrewingcoffeehouse.com');
    expect(texts.join(' ')).toContain('Iced Matcha Latte');
    expect(texts.join(' ')).not.toMatch(/\$/);
    expect(log.some((l) => l[0] === 'drawImage' && l[1].src === item.image_url)).toBe(true);
  });

  it('falls back to the illustrated cup when the photo fails to load', async () => {
    const { canvas, log } = fakeCanvas();
    const persona = personaFor({ item: by('Cold Brew') });
    const item = { ...by('Cold Brew'), image_url: 'https://x.supabase.co/storage/v1/object/public/menu/missing.jpg' };
    const load = vi.fn(async (src) => {
      if (!src.startsWith('data:image/svg') && !src.includes('/brand/')) throw new Error('404');
      return img(src);
    });
    const out = await renderStory({ persona, item, cupSvg: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>', make: canvas, load, fonts: async () => {} });
    expect(out.art.kind).toBe('drawn');
    // both photo sources (image_url, then the drop-in file) were tried first
    expect(load.mock.calls.map((c) => c[0]).filter((u) => !u.includes('/brand/')).slice(0, 2)).toEqual([item.image_url, expect.stringContaining('images/drinks/cold-brew.jpg')]);
    expect(log.some((l) => l[0] === 'drawImage' && l[1].src.startsWith('data:image/svg+xml'))).toBe(true);
  });

  it('falls back to the cup when the photo would taint the canvas', async () => {
    const { canvas } = fakeCanvas({ taint: true });
    const item = { ...by('Iced Matcha Latte'), image_url: 'https://elsewhere.example/m.jpg' };
    const art = await loadDrinkArt(item, { cupSvg: '<svg/>', load: async (src) => img(src), make: canvas });
    expect(art.kind).toBe('drawn');
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
