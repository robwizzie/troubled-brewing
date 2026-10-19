import '../styles/fox-outfit.css';
import { FOX_VIEW } from './FoxPlay.jsx';

/* The fox's outfit (which pieces: src/lib/foxOutfit.js), drawn as small
   inline SVG over the launcher fox. The overlay uses the drawing's own
   coordinates (FOX_VIEW) and turns, leans, sips and hops exactly as his
   figure does (fox-outfit.css), so a scarf stays round his neck and a
   flower stays in his hat band. Everything sits on the hat band, round the
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
      <path d="M153 86 L165 85 L167 113 L155 114 Z" fill={RASP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M154 95 L165.6 94.2 M154.6 104 L166.2 103.2" stroke={CREAM} strokeWidth="2.6" />
      <path d="M157 114.5 L157 119 M161 114.2 L161 118.8 M165 114 L165.2 118.6" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      {/* the wrap, round his neck from throat to nape */}
      <path d="M140 80 C153 86 171 83 183 72 L187 82 C175 94 155 97 139 91 Z" fill={RASP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 85 L149.5 94.5 M162 84.5 L163 94 M174 80 L176.5 89" stroke={CREAM} strokeWidth="2.4" />
    </g>
  );
}

/** Holly: two sage leaves and three raspberry berries tucked in the hat band. */
function Sprig() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__sprig" transform="translate(181 27)">
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
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__flower" transform="translate(183 25)">
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

/** Pumpkins on the rail beside him. In October his figure already has one
    (FoxPlay's Pumpkin); then only the little gold one is added. */
function Pumpkins({ hasOne }) {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__pumpkins">
      {!hasOne && <g transform="translate(185 92) scale(0.55)">{PUMPKIN('#e9973f')}</g>}
      <g transform="translate(165 104) scale(0.42)">{PUMPKIN(GOLD)}</g>
    </g>
  );
}

/** A little sun in the empty corner above his cup. */
function Sun() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__sun" transform="translate(100 -2)">
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
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__iced" transform="translate(196 113)">
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

/** A small sage umbrella over the corner by his cup, gold panel seams. */
function Umbrella() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__umbrella" transform="translate(110 5) rotate(14)">
      <path d="M0 -2 L0 18 C0 23 -6 23 -6 19" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-22 0 C-21 -13 -10 -20 0 -20 C10 -20 21 -13 22 0 C19 -3.5 14 -3.5 11 0 C8 -3.5 3 -3.5 0 0 C-3 -3.5 -8 -3.5 -11 0 C-14 -3.5 -19 -3.5 -22 0 Z"
        fill={SAGE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M0 -20 C-6 -14 -9 -7 -11 0 M0 -20 C6 -14 9 -7 11 0" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <path d="M0 -20 L0 -24" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

const FLAKES = [
  { x: 92, y: -10, s: 1.2, d: 0 },
  { x: 116, y: 10, s: 1, d: 1.6 },
  { x: 76, y: 8, s: 0.9, d: 3.1 },
  { x: 199, y: 20, s: 1, d: 0.8 },
  { x: 128, y: -14, s: 0.85, d: 2.4 },
  { x: 62, y: 112, s: 0.95, d: 4 },
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

/** A single autumn leaf drifting into the corner above his cup. */
function Leaf() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__leaf" transform="translate(104 2) rotate(-24)">
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
    <svg className={`fox-outfit fox-outfit--${outfit.id}`} viewBox={FOX_VIEW} aria-hidden="true" focusable="false" data-outfit={outfit.id}>
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
