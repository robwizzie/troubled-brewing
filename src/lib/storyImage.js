import { asset } from './config.js';
import { FOX_H, FOX_PATH, FOX_W } from './foxArt.js';
import { isCutout } from './productImage.js';
import { SHOP_HANDLE, SHOP_SITE, personaPhoto } from './drinkPersona.js';

/* The drink-personality card as an Instagram Story: a 1080 x 1920 PNG drawn
   client-side on a canvas.

   layoutStory() decides where everything goes (pure: give it a text
   measurer, get boxes back — tested on its own), and renderStory() paints
   it: paper ground, a gilt frame, the persona, the matched drink in its own
   gilt frame with the fox perched on top, and the shop's wordmark and
   handle. Instagram's own UI covers roughly the top 250px (progress bar,
   name) and the bottom 300px (reply bar), so every word that matters sits
   between SAFE_TOP and SAFE_BOTTOM; only paper, gilt and flourishes live
   outside it.

   The drink: ONLY its real photo (the menu item's image_url), loaded
   crossOrigin="anonymous" so the Supabase upload can be drawn without
   tainting the canvas. There is no stand-in: if the photo fails, or would
   taint the canvas, renderStory rejects (NoPhotoError) and the card offers
   no image to share. Fonts are waited for before any text is drawn. */

export const STORY_W = 1080;
export const STORY_H = 1920;
export const SAFE_TOP = 250;
export const SAFE_BOTTOM = STORY_H - 300;

const X0 = 100;               // content column, left
const CW = STORY_W - 2 * X0;  // content width (880)

export const FONTS = {
  hand: (px) => `700 ${px}px Caveat, "Bradley Hand", cursive`,
  name: (px) => `900 ${px}px Fraunces, Georgia, serif`,
  line: (px) => `italic 500 ${px}px Fraunces, Georgia, serif`,
  drink: (px) => `600 ${px}px Fraunces, Georgia, serif`,
  label: (px) => `700 ${px}px "Work Sans", system-ui, sans-serif`,
  trait: (px) => `600 ${px}px "Work Sans", system-ui, sans-serif`,
  small: (px) => `500 ${px}px "Work Sans", system-ui, sans-serif`,
};

/* The faces the story uses, loaded (or confirmed loaded) before drawing. */
const FACES = [FONTS.hand(60), FONTS.name(120), FONTS.line(44), FONTS.drink(54), FONTS.label(28), FONTS.trait(30), FONTS.small(28)];

export async function ensureFonts(doc = typeof document !== 'undefined' ? document : null) {
  const fonts = doc?.fonts;
  if (!fonts?.load) return;
  await Promise.all(FACES.map((f) => fonts.load(f).catch(() => null)));
  try { await fonts.ready; } catch { /* fine: draw with what we have */ }
}

/* ---- layout ---------------------------------------------------------------- */

/** Words, with a break allowed after a hyphen ("Mischief-|Maker"). */
const tokens = (text) => String(text).split(/\s+/).filter(Boolean)
  .flatMap((w) => w.split(/(?<=-)/).map((part, i, all) => ({ part, glue: i < all.length - 1 })));

/** Greedy word wrap into lines no wider than maxW. */
export function wrapText(measure, text, font, maxW) {
  const lines = [];
  let cur = '';
  let glued = false;
  for (const { part, glue } of tokens(text)) {
    const next = cur ? `${cur}${glued ? '' : ' '}${part}` : part;
    if (cur && measure(next, font) > maxW) { lines.push(cur); cur = part; } else cur = next;
    glued = glue;
  }
  if (cur) lines.push(cur);
  return lines;
}

const widest = (measure, lines, font) => Math.max(0, ...lines.map((l) => measure(l, font)));

/** The name in two lines with the most even break (at a space; at a hyphen
    only in a name without spaces), or null for a one-word name. */
function balancedSplit(measure, text, font) {
  const parts = tokens(text);
  if (parts.length < 2) return null;
  let best = null;
  const spaces = parts.some((p) => !p.glue);
  for (let i = 1; i < parts.length; i += 1) {
    if (spaces && parts[i - 1].glue) continue; // break at a space when there is one
    const join = (xs) => xs.reduce((acc, { part, glue }, k) => acc + part + (k < xs.length - 1 && !glue ? ' ' : ''), '');
    const lines = [join(parts.slice(0, i)), join(parts.slice(i))];
    const w = widest(measure, lines, font);
    if (!best || w < best.w) best = { w, lines };
  }
  return best.lines;
}

/** The biggest size (from `sizes`) whose wrap fits in maxLines and maxW. */
function fit(measure, text, make, sizes, maxW, maxLines) {
  for (const px of sizes) {
    const lines = wrapText(measure, text, make(px), maxW);
    if (lines.length <= maxLines && widest(measure, lines, make(px)) <= maxW) return { px, font: make(px), lines };
  }
  const px = sizes[sizes.length - 1];
  return { px, font: make(px), lines: wrapText(measure, text, make(px), maxW) };
}

const range = (from, to, step) => Array.from({ length: Math.floor((from - to) / step) + 1 }, (_, i) => from - i * step);

/**
 * Where everything goes. `persona` is personaFor()'s result; `measure(text,
 * font)` returns a width in px. Returns boxes in canvas pixels; every box
 * listed in `key` is inside the safe zone and none of them overlap.
 */
export function layoutStory(persona, measure) {
  let y = SAFE_TOP + 16;

  // "The fox says you're a…" — hand-lettered
  const eyebrowText = `The fox says you’re ${persona.article || 'a'}…`;
  const eyebrow = { text: eyebrowText, font: FONTS.hand(60), px: 60, top: y, bottom: y + 66, baseline: y + 50 };
  y = eyebrow.bottom + 6;

  // the persona's name, big: two balanced lines when it has two or more
  // words ("Chai / Charmer"), three for a long one
  const nm = (() => {
    const split = balancedSplit(measure, persona.name, FONTS.name(100));
    if (split) {
      for (const px of range(150, 88, 4)) {
        if (widest(measure, split, FONTS.name(px)) <= CW) return { px, font: FONTS.name(px), lines: split };
      }
    }
    const two = fit(measure, persona.name, FONTS.name, range(132, 96, 4), CW, 2);
    if (two.lines.length <= 2) return two;
    return fit(measure, persona.name, FONTS.name, range(104, 80, 4), CW, 3);
  })();
  const nameLH = Math.round(nm.px * 1.02);
  const name = { ...nm, lineH: nameLH, top: y, bottom: y + nm.lines.length * nameLH, baselines: nm.lines.map((_, i) => y + Math.round(nm.px * 0.8) + i * nameLH) };
  y = name.bottom + 30;

  // the fox's line about you
  const ln = fit(measure, persona.line, FONTS.line, [44, 42, 40, 38], CW - 40, 3);
  const lineLH = Math.round(ln.px * 1.32);
  const line = { ...ln, lineH: lineLH, top: y, bottom: y + ln.lines.length * lineLH, baselines: ln.lines.map((_, i) => y + Math.round(ln.px * 0.95) + i * lineLH) };
  y = line.bottom + 44;

  // footer: rule, wordmark + handle, at the foot of the safe zone
  const footer = { bottom: SAFE_BOTTOM - 12, height: 112 };
  footer.top = footer.bottom - footer.height;
  footer.rule = footer.top - 26;
  const logo = { h: 104, w: Math.round(104 * (504 / 360)) };
  const handle = { text: SHOP_HANDLE, font: FONTS.label(40), px: 40 };
  const site = { text: SHOP_SITE, font: FONTS.small(30), px: 30 };
  const textW = Math.max(measure(handle.text, handle.font), measure(site.text, site.font));
  const footW = logo.w + 34 + textW;
  logo.x = Math.round((STORY_W - footW) / 2);
  logo.y = footer.top + Math.round((footer.height - logo.h) / 2);
  handle.x = logo.x + logo.w + 34;
  site.x = handle.x;
  handle.baseline = footer.top + 50;
  site.baseline = footer.top + 92;
  Object.assign(footer, { logo, handle, site, sep: { x: logo.x + logo.w + 17, top: footer.top + 14, bottom: footer.bottom - 14 } });

  // the middle: the drink's gilt frame (right) with the fox perched on it,
  // and "Your match" + the traits (left)
  const midTop = y;
  const midBottom = footer.rule - 40;
  const room = midBottom - midTop;
  // frame 5:6 (w:h) with the fox on top at 1.04x the frame's width
  const foxK = (FOX_H / FOX_W) * 1.04;
  let fw = Math.floor(room / (6 / 5 + foxK + 0.02));
  fw = Math.max(300, Math.min(440, fw));
  const fh = Math.round(fw * 1.2);
  const foxW = Math.round(fw * 1.04);
  const foxH = Math.round(foxW * (FOX_H / FOX_W));
  const blockH = foxH + fh;
  const blockTop = midTop + Math.max(0, Math.round((room - blockH) / 2));
  const frame = { x: X0 + CW - fw, y: blockTop + foxH, w: fw, h: fh };
  const fox = { x: frame.x + Math.round((fw - foxW) / 2) - Math.round(fw * 0.02), y: blockTop, w: foxW, h: foxH, scale: foxW / FOX_W };

  // the left column
  const colX = X0;
  const colW = frame.x - 48 - colX;
  const label = { text: 'YOUR MATCH', font: FONTS.label(28), px: 28, spacing: 5 };
  const dk = fit(measure, persona.drink || 'Your drink', FONTS.drink, [60, 56, 52, 48, 44, 40], colW, 3);
  const drinkLH = Math.round(dk.px * 1.1);
  const traitFont = FONTS.trait(30);
  const pillH = 58;
  const pillGap = 14;
  const pills = (persona.traits || []).slice(0, 3).map((t) => {
    const text = String(t);
    const w = Math.min(colW, Math.round(measure(text, traitFont) + 52));
    return { text, w, h: pillH };
  });
  const colH = 34 + 18 + dk.lines.length * drinkLH + 30 + 4 + 34 + pills.length * pillH + Math.max(0, pills.length - 1) * pillGap;
  let cy = blockTop + Math.round((blockH - colH) / 2) + Math.round(foxH * 0.12);
  cy = Math.max(cy, midTop);
  label.top = cy; label.baseline = cy + 26; label.bottom = cy + 34; label.x = colX;
  cy = label.bottom + 18;
  const drink = { ...dk, lineH: drinkLH, x: colX, top: cy, bottom: cy + dk.lines.length * drinkLH, baselines: dk.lines.map((_, i) => cy + Math.round(dk.px * 0.82) + i * drinkLH) };
  cy = drink.bottom + 30;
  const rule = { x: colX, y: cy, w: Math.min(140, colW) };
  cy += 4 + 34;
  pills.forEach((p) => { p.x = colX; p.y = cy; p.font = traitFont; cy += pillH + pillGap; });
  const column = { x: colX, w: colW, top: label.top, bottom: pills.length ? pills[pills.length - 1].y + pillH : rule.y };

  const box = (x, top, w, bottom) => ({ x, y: top, w, h: bottom - top });
  const centred = (lines, font) => { const w = widest(measure, lines, font); return (STORY_W - w) / 2; };
  const key = {
    eyebrow: box(centred([eyebrowText], eyebrow.font), eyebrow.top, measure(eyebrowText, eyebrow.font), eyebrow.bottom),
    name: box(centred(name.lines, name.font), name.top, widest(measure, name.lines, name.font), name.bottom),
    line: box(centred(line.lines, line.font), line.top, widest(measure, line.lines, line.font), line.bottom),
    fox: { x: fox.x, y: fox.y, w: fox.w, h: fox.h },
    frame: { ...frame },
    column: box(column.x, column.top, colW, column.bottom),
    footer: box(logo.x, footer.top, footW, footer.bottom),
  };

  return { width: STORY_W, height: STORY_H, eyebrow, name, line, fox, frame, label, drink, rule, pills, column, footer, key };
}

/* ---- drawing helpers ------------------------------------------------------- */

const GILT = ['#f7dc94', '#e3b53f', '#d4ad57', '#a87c1c', '#5e4210'];

function hexRgb(hex) {
  const h = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

/** A tiny deterministic PRNG, so the paper grain is the same every time. */
function prng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function giltGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, GILT[0]); g.addColorStop(0.28, GILT[1]); g.addColorStop(0.5, GILT[2]);
  g.addColorStop(0.78, GILT[3]); g.addColorStop(1, GILT[4]);
  return g;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text with letter-spacing, drawn glyph by glyph (works everywhere). */
function spacedWidth(ctx, text, spacing) {
  return [...text].reduce((w, ch) => w + ctx.measureText(ch).width, 0) + spacing * Math.max(0, text.length - 1);
}
function fillSpaced(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
}

/** A four-pointed sparkle. */
function sparkle(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
  ctx.fill();
  ctx.restore();
}

/* The paper: the theme's ground, lit from the top, with a soft vignette and
   a fine deterministic grain (a small canvas pattern of specks and fibres). */
function drawPaper(ctx, theme, make) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  const lit = ctx.createRadialGradient(STORY_W * 0.5, STORY_H * 0.3, 60, STORY_W * 0.5, STORY_H * 0.4, STORY_H * 0.75);
  lit.addColorStop(0, rgba('#ffffff', theme.dark ? 0.1 : 0.32));
  lit.addColorStop(0.55, rgba('#ffffff', 0));
  lit.addColorStop(1, rgba(theme.bg2, 0.9));
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const tile = make(180, 180);
  const t = tile.getContext('2d');
  if (t) {
    const rnd = prng(20171013);
    for (let i = 0; i < 520; i += 1) {
      const light = rnd() < 0.5;
      t.fillStyle = light ? 'rgba(255, 255, 255, 0.07)' : 'rgba(30, 20, 10, 0.07)';
      const s = rnd() * 1.8 + 0.6;
      t.fillRect(rnd() * 180, rnd() * 180, s, s);
    }
    t.lineWidth = 0.8;
    for (let i = 0; i < 26; i += 1) {
      t.strokeStyle = rnd() < 0.5 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(30, 20, 10, 0.05)';
      const x = rnd() * 180; const y = rnd() * 180; const a = rnd() * Math.PI; const l = 6 + rnd() * 16;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, STORY_W, STORY_H); }
  }
}

/* The gilt border round the whole story, with a fine inner rule and little
   corner rosettes. */
function drawBorder(ctx, theme) {
  const o = 34; const band = 16;
  ctx.save();
  ctx.lineWidth = band;
  ctx.strokeStyle = giltGradient(ctx, 0, 0, STORY_W, STORY_H);
  ctx.strokeRect(o + band / 2, o + band / 2, STORY_W - 2 * o - band, STORY_H - 2 * o - band);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba('#5e4210', 0.8);
  ctx.strokeRect(o, o, STORY_W - 2 * o, STORY_H - 2 * o);
  ctx.strokeRect(o + band, o + band, STORY_W - 2 * (o + band), STORY_H - 2 * (o + band));
  const i = o + band + 14;
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(theme.accent, 0.7);
  ctx.strokeRect(i, i, STORY_W - 2 * i, STORY_H - 2 * i);
  for (const [cx, cy] of [[i, i], [STORY_W - i, i], [i, STORY_H - i], [STORY_W - i, STORY_H - i]]) {
    ctx.fillStyle = theme.bg;
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = giltGradient(ctx, cx - 12, cy - 12, cx + 12, cy + 12);
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba('#5e4210', 0.8); ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

/** A short flourish: a rule with a diamond in the middle. */
function flourish(ctx, cx, y, w, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx - 16, y); ctx.moveTo(cx + 16, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y - 8); ctx.lineTo(cx + 8, y); ctx.lineTo(cx, y + 8); ctx.lineTo(cx - 8, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - w / 2 - 6, y, 3.5, 0, Math.PI * 2); ctx.arc(cx + w / 2 + 6, y, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* The drink's gilt frame: a bevelled gold moulding, a lit cream mat, and the
   photo — an ordinary photo fills the opening (cover), a cutout stands
   whole on the mat (contain). */
function drawDrinkFrame(ctx, f, art) {
  const g = Math.round(f.w * 0.06); // moulding width
  ctx.save();
  ctx.shadowColor = 'rgba(30, 20, 8, 0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  ctx.fillStyle = GILT[3];
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.restore();
  // moulding: four bevelled sides
  const sides = [
    [[f.x, f.y], [f.x + f.w, f.y], [f.x + f.w - g, f.y + g], [f.x + g, f.y + g], ['#f7dc94', '#d4ad57']],
    [[f.x, f.y], [f.x + g, f.y + g], [f.x + g, f.y + f.h - g], [f.x, f.y + f.h], ['#ecc66d', '#c39639']],
    [[f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x + f.w - g, f.y + f.h - g], [f.x + f.w - g, f.y + g], ['#b88a2c', '#7d5a14']],
    [[f.x, f.y + f.h], [f.x + g, f.y + f.h - g], [f.x + f.w - g, f.y + f.h - g], [f.x + f.w, f.y + f.h], ['#a87c1c', '#5e4210']],
  ];
  for (const [a, b, c, d, [c0, c1]] of sides) {
    const gr = ctx.createLinearGradient(a[0], a[1], c[0], c[1]);
    gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(94, 66, 16, 0.9)'; ctx.lineWidth = 2;
  ctx.strokeRect(f.x + 1, f.y + 1, f.w - 2, f.h - 2);
  // a fine bead just inside the moulding
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.75)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(f.x + g * 0.45, f.y + g * 0.45, f.w - g * 0.9, f.h - g * 0.9);

  // the opening
  const o = { x: f.x + g, y: f.y + g, w: f.w - 2 * g, h: f.h - 2 * g };
  const mat = ctx.createRadialGradient(o.x + o.w / 2, o.y + o.h * 0.34, 10, o.x + o.w / 2, o.y + o.h * 0.5, o.h * 0.75);
  mat.addColorStop(0, '#fffdf7'); mat.addColorStop(0.6, '#f7efdc'); mat.addColorStop(1, '#e8d9b8');
  ctx.fillStyle = mat;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  // the photo: an ordinary one fills the opening, a cutout stands whole on the mat
  const iw = art.img.naturalWidth || art.img.width || 1;
  const ih = art.img.naturalHeight || art.img.height || 1;
  ctx.save();
  ctx.beginPath(); ctx.rect(o.x, o.y, o.w, o.h); ctx.clip();
  if (art.kind === 'cutout') {
    const pad = 0.09;
    const s = Math.min((o.w * (1 - 2 * pad)) / iw, (o.h * (1 - 2 * pad)) / ih);
    ctx.shadowColor = 'rgba(58, 40, 14, 0.28)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
    ctx.drawImage(art.img, o.x + (o.w - iw * s) / 2, o.y + (o.h - ih * s) / 2, iw * s, ih * s);
  } else {
    const s = Math.max(o.w / iw, o.h / ih);
    ctx.drawImage(art.img, o.x + (o.w - iw * s) / 2, o.y + (o.h - ih * s) / 2, iw * s, ih * s);
  }
  ctx.restore();
  // inner shadow under the moulding and a soft sheen across the glass
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 44, 16, 0.35)'; ctx.lineWidth = 6;
  ctx.strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6);
  const sheen = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
  sheen.addColorStop(0.3, 'rgba(255, 249, 228, 0)'); sheen.addColorStop(0.42, 'rgba(255, 249, 228, 0.16)'); sheen.addColorStop(0.54, 'rgba(255, 249, 228, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.restore();
}

/** The logo fox (the brand's own drawing, as its traced vector path), in one colour. */
function drawFox(ctx, fox, color, fallbackImg) {
  if (typeof Path2D === 'function') {
    ctx.save();
    ctx.translate(fox.x, fox.y);
    ctx.scale(fox.scale, fox.scale);
    ctx.fillStyle = color;
    ctx.fill(new Path2D(FOX_PATH), 'evenodd');
    ctx.restore();
  } else if (fallbackImg) {
    ctx.drawImage(fallbackImg, fox.x, fox.y, fox.w, fox.h);
  }
}

/** The wordmark (logo-primary.png is ink on white) recoloured: white → clear,
    ink → `color`. Same-origin, so its pixels can be read. */
function tintWordmark(img, color, make) {
  const w = img.naturalWidth || img.width; const h = img.naturalHeight || img.height;
  const c = make(w, h);
  const x = c.getContext('2d');
  if (!x) return null;
  x.drawImage(img, 0, 0, w, h);
  try {
    const data = x.getImageData(0, 0, w, h);
    const [r, g, b] = hexRgb(color);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
      d[i + 3] = Math.round((255 - lum) * (d[i + 3] / 255));
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    x.putImageData(data, 0, 0);
    return c;
  } catch {
    return null;
  }
}

/* ---- images ---------------------------------------------------------------- */

/** Load an image; remote ones are asked for with CORS so they can be drawn. */
export function loadImage(src, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!/^(data|blob):/i.test(src)) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const timer = setTimeout(() => reject(new Error('image timed out')), timeout);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error(`image failed: ${src}`)); };
    img.src = src;
  });
}

/** Would drawing this image taint a canvas? (Reading a pixel back says.) */
export function isReadable(img, make) {
  try {
    const c = make(2, 2);
    const x = c.getContext('2d');
    if (!x) return false;
    x.drawImage(img, 0, 0, 2, 2);
    x.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

/** Thrown when the drink has no photo that can be drawn on the canvas. */
export class NoPhotoError extends Error {
  constructor(message = 'no drawable photo') { super(message); this.name = 'NoPhotoError'; }
}

/** A network-level failure (worth one more try), as opposed to a 404. */
const isNetworkError = (e) => e?.name === 'TypeError' || e?.name === 'NetworkError' || e?.name === 'AbortError' || e?.network === true;

/** Add a cache-busting parameter, so a copy cached without CORS isn't reused. */
export function cacheBust(src, stamp = Date.now()) {
  const [path, hash = ''] = String(src).split('#');
  return `${path}${path.includes('?') ? '&' : '?'}tbstory=${stamp}${hash ? `#${hash}` : ''}`;
}

async function tryTwice(fn) {
  try { return await fn(); } catch (e) {
    if (!isNetworkError(e)) throw e;
    return fn(); // one retry on a network error
  }
}

/* The default ways in. (a) fetch the bytes with CORS, bypassing the HTTP
   cache (an earlier <img> without crossOrigin can't poison it), and decode
   the Blob ourselves; (b) an Image with crossOrigin="anonymous" on a
   cache-busted URL. */
const browserDeps = () => ({
  fetch: typeof fetch === 'function' ? (...a) => fetch(...a) : null,
  bitmap: typeof createImageBitmap === 'function' ? (b) => createImageBitmap(b) : null,
  load: loadImage,
  objectUrl: (b) => URL.createObjectURL(b),
  revoke: (u) => URL.revokeObjectURL(u),
});

/**
 * Load the drink's photo so it can be drawn on a canvas and exported.
 *   (a) fetch(src, { mode: 'cors', cache: 'no-store' }) → Blob →
 *       createImageBitmap (or an object-URL Image), retried once on a
 *       network error;
 *   (b) failing that, new Image() with crossOrigin="anonymous" and a
 *       cache-busting query, retried once.
 * Each result is checked with a pixel read (no taint). Resolves to
 * { img, via: 'fetch' | 'image', cleanup } or null.
 */
export async function loadPhoto(src, deps = {}) {
  const d = { ...browserDeps(), ...deps };
  const make = d.make || defaultCanvas;
  if (d.fetch) {
    try {
      const got = await tryTwice(async () => {
        const res = await d.fetch(src, { mode: 'cors', cache: 'no-store', credentials: 'omit' });
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        const blob = await res.blob();
        if (!blob || !blob.size) throw new Error('empty image');
        if (d.bitmap) {
          try { return { img: await d.bitmap(blob), cleanup: (x) => x.img.close?.() }; } catch { /* decode it as an <img> instead */ }
        }
        const url = d.objectUrl(blob);
        try {
          return { img: await d.load(url), cleanup: () => d.revoke(url) };
        } catch (e) { d.revoke(url); throw e; }
      });
      if (isReadable(got.img, make)) return { img: got.img, via: 'fetch', cleanup: () => got.cleanup?.(got) };
      got.cleanup?.(got);
    } catch { /* (b) next */ }
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const img = await d.load(cacheBust(src, `${Date.now()}${attempt}`));
      if (isReadable(img, make)) return { img, via: 'image', cleanup: () => {} };
      return null; // it loaded but would taint the canvas: retrying won't change that
    } catch { /* one more go */ }
  }
  return null;
}

/**
 * The drink's real photo for the story (its image_url), or null if there is
 * none or every way of loading it failed. A cutout (transparent background,
 * "cutout" in the file name — isCutout) is staged whole on the frame's mat;
 * any other photo fills the frame.
 * Returns { img, kind: 'photo' | 'cutout', src, via, cleanup } or null.
 */
export async function loadDrinkArt(item, deps = {}) {
  const src = personaPhoto(item);
  if (!src) return null;
  const got = await loadPhoto(src, deps);
  return got ? { ...got, kind: isCutout(src) ? 'cutout' : 'photo', src } : null;
}

function defaultCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ---- the story --------------------------------------------------------------- */

/**
 * Draw the story. Options:
 *   persona  personaFor() result (name, article, line, traits, theme, drink)
 *   item     the matched menu row (for its photo)
 *   make     (w, h) => canvas   — injectable for tests
 *   load     (src) => Promise<img> — injectable for tests
 *   fetch, bitmap, objectUrl, revoke — the photo loader's ways in (loadPhoto)
 * Resolves to { canvas, layout, art }; rejects with NoPhotoError when the
 * drink's photo can't be drawn (there is never a stand-in picture).
 */
export async function renderStory({ persona, item, make = defaultCanvas, load = loadImage, fonts = ensureFonts, ...deps } = {}) {
  const theme = persona.theme;
  const canvas = make(STORY_W, STORY_H);
  const ctx = canvas.getContext('2d');
  const [art, wordmark, foxImg] = await Promise.all([
    loadDrinkArt(item, { ...deps, load, make }),
    load(asset('images/brand/logo-primary.png')).catch(() => null),
    typeof Path2D === 'function' ? null : load(asset('images/brand/fox-sipping.png')).catch(() => null),
    fonts(),
  ]);
  if (!art) throw new NoPhotoError();
  const measure = (text, font) => { ctx.font = font; return ctx.measureText(text).width; };
  const L = layoutStory(persona, measure);

  drawPaper(ctx, theme, make);
  drawBorder(ctx, theme);

  // up top (under Instagram's bar): just a few sparkles and a flourish
  flourish(ctx, STORY_W / 2, 196, 260, rgba(theme.accent, 0.75));
  ctx.textBaseline = 'alphabetic';

  // the eyebrow
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.accent;
  ctx.font = L.eyebrow.font;
  ctx.fillText(L.eyebrow.text, STORY_W / 2, L.eyebrow.baseline);

  // the name: big, with a soft shadow so it sits up off the paper
  ctx.save();
  ctx.font = L.name.font;
  ctx.fillStyle = theme.fg;
  ctx.shadowColor = theme.dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(80, 50, 20, 0.16)';
  ctx.shadowOffsetY = 4; ctx.shadowBlur = 10;
  L.name.lines.forEach((l, i) => ctx.fillText(l, STORY_W / 2, L.name.baselines[i]));
  ctx.restore();
  // two sparkles: by the first line's start and the last line's end, only
  // where there's clear room inside the frame
  const firstW = measure(L.name.lines[0], L.name.font);
  const lastW = measure(L.name.lines[L.name.lines.length - 1], L.name.font);
  const sx1 = STORY_W / 2 - firstW / 2 - 40;
  const sx2 = STORY_W / 2 + lastW / 2 + 36;
  if (sx1 > 104) sparkle(ctx, sx1, L.name.top + L.name.px * 0.3, 16, theme.accent);
  if (sx2 < STORY_W - 104) sparkle(ctx, sx2, L.name.bottom - L.name.px * 0.3, 12, theme.accent);

  // the fox's line
  ctx.font = L.line.font;
  ctx.fillStyle = theme.soft;
  L.line.lines.forEach((l, i) => ctx.fillText(l, STORY_W / 2, L.line.baselines[i]));

  // the drink, framed, with the fox up on top raising his cup
  drawDrinkFrame(ctx, L.frame, art);
  releaseArt(art); // drawn: the bitmap / object URL can go
  drawFox(ctx, L.fox, theme.dark ? '#f7f1e4' : '#2c2722', foxImg);

  // "Your match", the drink, the traits
  ctx.textAlign = 'left';
  ctx.font = L.label.font;
  ctx.fillStyle = theme.accent;
  fillSpaced(ctx, L.label.text, L.label.x, L.label.baseline, L.label.spacing);
  ctx.font = L.drink.font;
  ctx.fillStyle = theme.fg;
  L.drink.lines.forEach((l, i) => ctx.fillText(l, L.drink.x, L.drink.baselines[i]));
  ctx.fillStyle = giltGradient(ctx, L.rule.x, L.rule.y, L.rule.x + L.rule.w, L.rule.y + 4);
  ctx.fillRect(L.rule.x, L.rule.y, L.rule.w, 4);
  for (const p of L.pills) {
    ctx.fillStyle = theme.chip;
    roundRect(ctx, p.x, p.y, p.w, p.h, p.h / 2);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.accent, 0.55); ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = p.font;
    ctx.fillStyle = theme.chipFg;
    ctx.fillText(p.text, p.x + 26, p.y + p.h / 2 + 11, p.w - 52);
  }

  // the footer: a flourish, the wordmark, the handle and the site
  const F = L.footer;
  flourish(ctx, STORY_W / 2, F.rule, 420, rgba(theme.accent, 0.8));
  const mark = wordmark ? tintWordmark(wordmark, theme.fg, make) : null;
  if (mark) ctx.drawImage(mark, F.logo.x, F.logo.y, F.logo.w, F.logo.h);
  else if (wordmark) {
    ctx.save();
    if (!theme.dark) ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(wordmark, F.logo.x, F.logo.y, F.logo.w, F.logo.h);
    ctx.restore();
  }
  ctx.fillStyle = rgba(theme.accent, 0.6);
  ctx.fillRect(F.sep.x - 1, F.sep.top, 2, F.sep.bottom - F.sep.top);
  ctx.font = F.handle.font;
  ctx.fillStyle = theme.fg;
  ctx.fillText(F.handle.text, F.handle.x, F.handle.baseline);
  ctx.font = F.site.font;
  ctx.fillStyle = theme.soft;
  ctx.fillText(F.site.text, F.site.x, F.site.baseline);

  // down below (under the reply bar): the address, small, and a flourish
  ctx.textAlign = 'center';
  ctx.font = FONTS.label(24);
  ctx.fillStyle = rgba(theme.fg, 0.55);
  const addr = '514 STATION AVE · HADDON HEIGHTS, NJ';
  const aw = spacedWidth(ctx, addr, 4);
  ctx.textAlign = 'left';
  fillSpaced(ctx, addr, (STORY_W - aw) / 2, 1716, 4);
  flourish(ctx, STORY_W / 2, 1764, 200, rgba(theme.accent, 0.55));

  return { canvas, layout: L, art };
}

function releaseArt(art) {
  try { art?.cleanup?.(); } catch { /* fine */ }
}

/** The story as a PNG Blob. */
export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') { reject(new Error('no toBlob')); return; }
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty image'))), 'image/png');
  });
}

export async function storyBlob(opts) {
  const { canvas } = await renderStory(opts);
  return canvasToBlob(canvas);
}
