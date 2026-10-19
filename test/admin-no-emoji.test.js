import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/* The admin uses real icons (Lucide, via react-icons/lu), never emoji or
   symbol characters standing in for icons. This scans every admin source
   file — code, copy, comments and CSS — for emoji (any Extended_Pictographic
   codepoint or the emoji variation selector) and for the dingbats that used
   to pose as icons (menu bars, ticks, crosses, stars, triangles, arrows). */

const ROOT = path.resolve('src/admin');
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{20E3}]/u;
const ICON_GLYPHS = /[☰✓✔✕✖✗✘★☆▲▼▴▾▶▸◀◂↑↓↗↖↘↙↻↺✦✧]/u;

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return files(p);
    return /\.(jsx?|css)$/.test(d.name) ? [p] : [];
  });
}

describe('no emoji in the admin', () => {
  const all = files(ROOT);

  it('finds the admin sources', () => {
    expect(all.length).toBeGreaterThan(30);
  });

  it.each(all.map((f) => [path.relative(ROOT, f), f]))('%s has no emoji or icon glyphs', (_name, file) => {
    const hits = [];
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const ch of line) {
        if (EMOJI.test(ch) || ICON_GLYPHS.test(ch)) hits.push(`line ${i + 1}: ${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase()})`);
      }
    });
    expect(hits).toEqual([]);
  });

  it('the scan really catches emoji', () => {
    expect(EMOJI.test('📷')).toBe(true);
    expect(EMOJI.test('✏️')).toBe(true);
    expect(ICON_GLYPHS.test('☆')).toBe(true);
    expect(EMOJI.test('Change hours — 7:30 AM')).toBe(false);
  });
});
