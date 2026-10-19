import '../styles/fox-outfit.css';
import { FOX_H, FOX_W } from '../lib/foxArt.js';

/* The fox's outfit (which pieces: src/lib/foxOutfit.js), drawn as small
   inline SVG over the launcher fox. The overlay sits inside his figure, in
   the drawing's own coordinates (0 0 FOX_W FOX_H), so it turns, leans,
   sips and hops with him: a scarf stays round his neck and a flower stays
   in his hat band. Pieces may overlap the card's padding a little. Everything sits on the hat band, round the
   neck or in the empty corners of the medallion: nothing covers his face,
   and he never gets glasses of any kind.

   Palette: sage #545f33, gold #d4ad57 / #a87c1c, cream #f7f1e4,
   ink #2c2722, raspberry #b0436e. */

const INK = '#2c2722';
const SAGE = '#545f33';
const GOLD = '#d4ad57';
const GOLD_DEEP = '#a87c1c';
const CREAM = '#f7f1e4';
const RASP = '#b0436e';

/** A knit scarf round his neck, one end hanging down his chest. */
function Scarf() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__scarf">
      {/* the hanging end, down his chest (behind the wrap) */}
      <path d="M166 104 L182 101 L185 131 L169 133 Z" fill={RASP} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M167.4 113 L183 110.6 M168.4 123 L184 120.6" stroke={CREAM} strokeWidth="3.4" />
      <path d="M172 134 L172 139 M177 133.4 L177.3 138.4 M182 132.6 L182.6 137.6" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      {/* the wrap, round his neck from throat to nape */}
      <path d="M136 98 C156 107 184 99 203 79 L208 93 C188 113 158 119 134 112 Z" fill={RASP} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M150 104 L149 116.5 M166 103 L167 116 M182 97 L186 109 M195 88 L200.5 99.5" stroke={CREAM} strokeWidth="3.2" />
    </g>
  );
}

/** Holly: two sage leaves and three raspberry berries tucked in the hat band. */
function Sprig() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__sprig" transform="translate(192 30) scale(1.5)">
      <path d="M0 0 C-2 -6 -8 -10 -15 -10 C-13 -7 -15 -4 -12 -2 C-9 0 -5 1 0 0 Z" fill={SAGE} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M0 0 C3 -6 9 -11 16 -12 C14 -8 16 -5 13 -2 C10 1 5 1 0 0 Z" fill={SAGE} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="-3" cy="2" r="3.4" fill={RASP} stroke={INK} strokeWidth="1.4" />
      <circle cx="3.5" cy="2.5" r="3.4" fill={RASP} stroke={INK} strokeWidth="1.4" />
      <circle cx="0.5" cy="-3.5" r="3.2" fill={RASP} stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

/** A small flower in the hat band, with one leaf. */
function Flower() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__flower" transform="translate(193 28) scale(1.5)">
      <path d="M0 2 C6 4 11 2 14 -3 C8 -5 3 -3 0 2 Z" fill={SAGE} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-5.6" rx="3.9" ry="5.4" transform={`rotate(${a})`} fill={RASP} stroke={INK} strokeWidth="1.4" />
      ))}
      <circle r="3.2" fill={GOLD} stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

const PUMPKIN = (fill, ribs = INK) => (
  <>
    <path d="M20 9 C19 5 21 3 24 2" fill="none" stroke={SAGE} strokeWidth="4.4" strokeLinecap="round" />
    <ellipse cx="20" cy="22" rx="17" ry="12" fill={fill} stroke="#191512" strokeWidth="4" />
    <path d="M20 10 C13 14 13 30 20 34 M20 10 C27 14 27 30 20 34 M11 12 C6 17 7 29 12 32 M29 12 C34 17 33 29 28 32" fill="none" stroke={ribs} strokeWidth="2.6" opacity="0.7" />
  </>
);

/** Pumpkins on the rail by his cup. In October his card already has one
    at its corner (FoxPlay's Pumpkin); then only the little gold one is added. */
function Pumpkins({ hasOne }) {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__pumpkins">
      {!hasOne && <g transform="translate(28 106) scale(0.8)">{PUMPKIN('#e9973f')}</g>}
      <g transform={hasOne ? 'translate(42 108) scale(0.78)' : 'translate(60 113) scale(0.62)'}>{PUMPKIN(GOLD)}</g>
    </g>
  );
}

/** A little sun in the empty corner behind his hat. */
function Sun() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__sun" transform="translate(230 28) scale(1.55)">
      <g stroke={GOLD_DEEP} strokeWidth="2.6" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M0 -10.5 L0 -14.5" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r="7.4" fill={GOLD} stroke={INK} strokeWidth="1.8" />
    </g>
  );
}

/** An iced drink on the rail beside him: dome lid, raspberry straw, ice. */
function Iced() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__iced" transform="translate(218 111) scale(1.25)">
      <path d="M2 -27 L8 -43" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M2 -27 L8 -43" stroke={RASP} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-8.5 -26 L8.5 -26 L6.5 0 L-6.5 0 Z" fill="#fffdf7" />
      <path d="M-8 -19 L8 -19 L6.5 0 L-6.5 0 Z" fill={GOLD} />
      <rect x="-5" y="-17.5" width="4.6" height="4.6" rx="1" fill={CREAM} stroke={INK} strokeWidth="0.9" transform="rotate(-12 -2.7 -15)" />
      <rect x="0.8" y="-15.5" width="4.6" height="4.6" rx="1" fill={CREAM} stroke={INK} strokeWidth="0.9" transform="rotate(14 3 -13)" />
      <path d="M-7.6 -12 L7.6 -12 L7.1 -6 L-7.1 -6 Z" fill={SAGE} />
      <path d="M-8.5 -26 L8.5 -26 L6.5 0 L-6.5 0 Z" fill="none" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M-10 -26 C-9 -33 9 -33 10 -26 Z" fill="#fffdf7" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
    </g>
  );
}

/** A small sage umbrella above his snout, gold panel seams. */
function Umbrella() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__umbrella" transform="translate(116 4) rotate(12) scale(1.3)">
      <path d="M0 -2 L0 18 C0 23 -6 23 -6 19" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-22 0 C-21 -13 -10 -20 0 -20 C10 -20 21 -13 22 0 C19 -3.5 14 -3.5 11 0 C8 -3.5 3 -3.5 0 0 C-3 -3.5 -8 -3.5 -11 0 C-14 -3.5 -19 -3.5 -22 0 Z"
        fill={SAGE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M0 -20 C-6 -14 -9 -7 -11 0 M0 -20 C6 -14 9 -7 11 0" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <path d="M0 -20 L0 -24" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

const FLAKES = [
  { x: 22, y: 14, s: 1.6, d: 0 },
  { x: 108, y: 2, s: 1.3, d: 1.6 },
  { x: 40, y: 44, s: 1.2, d: 3.1 },
  { x: 228, y: 18, s: 1.5, d: 0.8 },
  { x: 250, y: 52, s: 1.2, d: 2.4 },
  { x: 18, y: 84, s: 1.3, d: 4 },
];

/** Snowflakes in the empty corners, drifting down slowly. */
function Snow() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__snow">
      {FLAKES.map((f) => (
        <g key={`${f.x},${f.y}`} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
          <g className="fox-outfit__flake" style={{ animationDelay: `${f.d}s` }}>
            <path d="M0 -6 L0 6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
            <path d="M0 -6 L0 6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" stroke="#fffdf7" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </g>
      ))}
    </g>
  );
}

/** A single autumn leaf drifting into the corner behind his hat. */
function Leaf() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__leaf" transform="translate(230 30) rotate(-24) scale(1.9)">
      <path d="M0 -11 C7 -7 9 1 0 11 C-9 1 -7 -7 0 -11 Z" fill={GOLD_DEEP} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M0 -8 L0 14 M0 -1 L4 -4 M0 4 L-4 1" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

const PARTS = { scarf: Scarf, sprig: Sprig, flower: Flower, sun: Sun, iced: Iced, umbrella: Umbrella, snow: Snow, leaf: Leaf };

/**
 * The overlay. `outfit` comes from useFoxOutfit(); `hasPumpkin` says his
 * figure is already drawing its own October pumpkin.
 */
export default function FoxOutfit({ outfit, hasPumpkin = false }) {
  const parts = outfit?.parts || [];
  if (!parts.length) return null;
  return (
    <svg className={`fox-outfit fox-outfit--${outfit.id}`} viewBox={`0 0 ${FOX_W} ${FOX_H}`} aria-hidden="true" focusable="false" data-outfit={outfit.id}>
      {parts.map((p) => {
        if (p === 'pumpkins') return <Pumpkins key={p} hasOne={hasPumpkin} />;
        const Part = PARTS[p];
        return Part ? <Part key={p} /> : null;
      })}
    </svg>
  );
}

/** His one line about the outfit, under the card's greeting. */
export function FoxOutfitLine({ outfit }) {
  if (!outfit?.line || !outfit.parts?.length) return null;
  return <p className="fox-outfit__line">{outfit.line}</p>;
}
