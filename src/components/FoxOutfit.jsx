import { useId } from 'react';
import '../styles/fox-outfit.css';
import { FOX_H, FOX_W } from '../lib/foxArt.js';

/* The fox's outfit (which pieces: src/lib/foxOutfit.js), drawn as inline SVG
   on the launcher fox in the drawing's own coordinates (0 0 FOX_W FOX_H).
   Every piece is designed against the traced art itself (src/lib/foxArt.js):
   the scarf follows his neck between jaw and shoulder line, the hat pieces
   are tucked into the real hat band, things on the rail stand on its top
   surface, and the umbrella pole is clamped to the rail.

   Two layers, both INSIDE his figure (.fox-guide__figure), so they turn,
   lean, sip and hop with him and never drift off mid-animation:
     layer="back"  — under the line art (z-index -1): the part of the scarf
                     that passes behind his neck, the umbrella and the rain;
     layer="front" — over it: everything he wears or that sits by him.

   Line style matches the drawing: ink outlines about as heavy as its own
   strokes (~2 units), flat fills from the palette, a few shading strokes.
   Nothing covers his face, and he never gets glasses of any kind.

   Palette: sage #545f33, gold #d4ad57 / #a87c1c, cream #f7f1e4,
   ink #2c2722, raspberry #b0436e. */

const INK = '#2c2722';
const SAGE = '#545f33';
const GOLD = '#d4ad57';
const GOLD_DEEP = '#a87c1c';
const CREAM = '#f7f1e4';
const RASP = '#b0436e';
const RASP_SHADE = '#8a3155'; // raspberry in shadow: the scarf's far side and folds
const WHITE = '#fffdf7';
const PUMPKIN_ORANGE = '#e9973f'; // FoxPlay's October pumpkin

const LINE = 2; // his own stroke weight, in drawing units
const FINE = 1.3; // detail strokes

const ink = (w = LINE) => ({ stroke: INK, strokeWidth: w, strokeLinejoin: 'round', strokeLinecap: 'round' });

/* ---- the scarf ---------------------------------------------------------- */
/* Measured on the art: his jaw runs down to the throat at ~(132,72), the
   heavy shoulder line rises from the throat (138,85) to the back of his neck
   (181,71), and the back of the neck is the near-vertical line x≈178–183.
   The scarf wraps that short neck: the near side sags a little across the
   front, rolls round past the neck line at the back, and its far side shows
   only where it peeks out behind the neck (back layer, clipped to outside
   the neck, so his own neck line is drawn over it). Knot under the chin,
   two fringed tails hanging straight down over his chest and arm. */
const SCARF_BAND = 'M130.2 76.8 C143 75.8 162 71.8 180.4 64.2 C184 63 187.6 64.6 188.2 68.6 C188.6 72.2 187.2 75 184 76.6 C166 85 148 90 133.4 92.2 C129.2 89.6 128.4 80.6 130.2 76.8 Z';
const SCARF_TAIL_A = 'M126.2 91.4 C125.4 97.6 123.6 103.4 122.2 110.8 C125 112.6 130 113.4 133.4 113.2 C133 106 133.8 98.8 135.6 92.4 Z';
const SCARF_TAIL_B = 'M133.4 92.4 C136 97.4 137.6 101.6 138.4 107 C141.2 107.4 144.6 106.8 147 105.6 C145.2 100 142.6 95 140.2 91 Z';
const SCARF_KNOT = 'M125.8 86 C125.4 81.8 128.4 79.8 132.6 80.2 C137.4 80.6 139.4 84.2 138.4 88.8 C137.6 92.4 134.2 94.2 130.6 94 C127.2 93.8 126 90 125.8 86 Z';
// everything right of the back of his neck (the far side only shows there)
const BEHIND_NECK = 'M175.5 40 L178.5 58 L180.5 66 L182.5 74 L184 92 L215 92 L215 40 Z';

const sid = (id, name) => `${id.replace(/[^a-zA-Z0-9_-]/g, '')}-${name}`;

function ScarfBack() {
  const id = sid(useId(), 'neck');
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__scarf fox-outfit__scarf-back">
      <defs><clipPath id={id}><path d={BEHIND_NECK} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <path d="M172 66 C176 61.6 182 58.2 187.4 59 C191.2 59.8 192 64.4 189.6 67.8 L181 74 Z" fill={RASP_SHADE} {...ink()} />
        <path d="M181 62.4 L184.6 70" stroke={CREAM} strokeWidth="3" />
      </g>
    </g>
  );
}

function Scarf() {
  const id = sid(useId(), 'scarf');
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__scarf">
      <defs>
        <clipPath id={`${id}-band`}><path d={SCARF_BAND} /></clipPath>
        <clipPath id={`${id}-a`}><path d={SCARF_TAIL_A} /></clipPath>
        <clipPath id={`${id}-b`}><path d={SCARF_TAIL_B} /></clipPath>
      </defs>
      {/* the two tails, hanging from the knot (they sway a little) */}
      <g className="fox-outfit__tails">
        <path d={SCARF_TAIL_B} fill={RASP} />
        <g clipPath={`url(#${id}-b)`}><path d="M130 99.2 L152 94.8 M131.4 103.8 L153 99.4" stroke={CREAM} strokeWidth="2.8" /></g>
        <path d={SCARF_TAIL_B} fill="none" {...ink()} />
        <path d="M139.2 108.2 L139.4 111.4 M142.4 108 L143 111.2 M145.4 107 L146.4 110" fill="none" {...ink(1.5)} />
        <path d={SCARF_TAIL_A} fill={RASP} />
        <g clipPath={`url(#${id}-a)`}><path d="M119 99.2 L139 100.2 M119 105.6 L139 106.8" stroke={CREAM} strokeWidth="2.8" /></g>
        <path d={SCARF_TAIL_A} fill="none" {...ink()} />
        <path d="M130.6 94 C129.8 100 128.8 106 128.2 112" fill="none" stroke={RASP_SHADE} strokeWidth="1" />
        <path d="M123.4 112.4 L122.8 116 M127.4 113.2 L127.2 116.8 M131.6 113.4 L131.8 117" fill="none" {...ink(1.5)} />
      </g>
      {/* the near side, round his neck */}
      <path d={SCARF_BAND} fill={RASP} />
      <g clipPath={`url(#${id}-band)`}>
        <path d="M143 60 L151 95 M155 58 L163 93 M167 55 L175 90" stroke={CREAM} strokeWidth="3.4" />
        <path d="M134 90 C150 87.6 168 81.4 186 73.6" fill="none" stroke={RASP_SHADE} strokeWidth="1.4" />
      </g>
      <path d={SCARF_BAND} fill="none" {...ink()} />
      {/* the knot under his chin */}
      <path d={SCARF_KNOT} fill={RASP} {...ink()} />
      <path d="M129.4 82.8 C131.6 85 132 88.6 131 92 M135 82.4 C135.8 84.6 135.6 87.4 134.8 89.4" fill="none" {...ink(1.1)} />
    </g>
  );
}

/* ---- the hat band ------------------------------------------------------- */
/* The band is the strip under the crown, left of his ear: top line
   (140,22)→(157,26), bottom line (142,32.5)→(154,32), crown edge on the left
   and his ear on the right (a little more of it shows right of the ear).
   A worn hat piece re-inks the band over its stem, so the stem goes INTO
   the band and the bloom or berries sit over its top edge. */
const BAND = 'M140.4 21.8 L146.2 23.3 L151.2 24.8 L156.9 26.3 L154.4 32.2 L148 32.3 L142.2 32.6 L137.6 29.8 Z';
const BAND_RIGHT = 'M172.3 32.9 L177.3 33.9 L176.5 37.5 L174.7 38.1 L173.3 35.9 Z';

function Band({ fill }) {
  return (
    <>
      <path d={BAND_RIGHT} fill={fill} />
      <path d={BAND} fill={fill} {...ink(1.8)} />
    </>
  );
}

const HOLLY_LEAF = 'M0 0 L2.5 -2.6 L3.7 -1.3 L6 -3.7 L7 -2 L9.6 -3.5 L10.1 -1.4 L13 0 L10.1 1.4 L9.6 3.5 L7 2 L6 3.7 L3.7 1.3 L2.5 2.6 Z';

/** Holly: two spiky sage leaves and three raspberry berries tucked in the band. */
function Sprig() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__sprig">
      {/* stem and leaves first: the band is drawn over their ends */}
      {[-132, -54].map((a) => (
        <g key={a} transform={`translate(146 26) rotate(${a}) scale(1.25)`}>
          <path d={HOLLY_LEAF} fill={SAGE} {...ink(1.3 / 1.25)} />
          <path d="M1.5 0 L11 0" fill="none" stroke={INK} strokeWidth={0.9 / 1.25} strokeLinecap="round" />
        </g>
      ))}
      <Band fill={GOLD_DEEP} />
      {[[142.8, 24.2], [148.6, 25.4], [145.6, 20.4]].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r="3" fill={RASP} {...ink(1.3)} />
          <circle cx={cx - 0.8} cy={cy - 0.9} r="0.7" fill={WHITE} />
        </g>
      ))}
    </g>
  );
}

const PETAL_LEAF = 'M0 0 C3 -2.8 8 -2.8 11.5 0 C8 2.8 3 2.8 0 0 Z';

/** A small flower in the hat band, with two leaves poking out past the crown. */
function Flower() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__flower">
      {[202, 160].map((a) => (
        <g key={a} transform={`translate(144 25) rotate(${a}) scale(1.25)`}>
          <path d={PETAL_LEAF} fill={SAGE} {...ink(1.3 / 1.25)} />
          <path d="M1.5 0 L9 0" fill="none" stroke={INK} strokeWidth={0.8 / 1.25} strokeLinecap="round" />
        </g>
      ))}
      <path d="M145.6 23 L147.2 31" fill="none" stroke={SAGE} strokeWidth="1.6" />
      <Band fill={SAGE} />
      <g transform="translate(146 21.6) rotate(-14) scale(1 0.9)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-3.7" rx="2.9" ry="3.9" transform={`rotate(${a})`} fill={RASP} {...ink(1.2)} />
        ))}
        <circle r="2.3" fill={GOLD} {...ink(1.2)} />
      </g>
    </g>
  );
}

/* ---- snow resting on the hat (top of the crown and the brim) ------------ */
/* The crown's top edge runs (145,0.9)→(185,12.3); the left brim ledge sits at
   y≈28 between x 125 and 136. The snow's underside lies along those edges and
   only its lumpy top is inked, so his own hat line is its bottom. */
function HatSnow() {
  return (
    <g className="fox-outfit__part fox-outfit__worn fox-outfit__hat fox-outfit__hatsnow">
      <path d="M145.4 1.2 C145.6 -1.6 148.6 -2.8 151 -1.8 C152.8 -3.6 156.4 -3 157.4 -0.8 C159.6 -1.8 162.6 -0.6 163 1.6 C165.6 1 168.4 2.4 168.4 4.4 C171 4.2 173.6 5.6 173.6 7.4 C176.6 7.2 179.4 9 179.6 11 C182 11 184.6 12 185.2 12.8 L180 9.8 L175 7.4 L170 5.6 L165 4.3 L160 3.1 L155 2.2 L150 1.4 Z" fill={WHITE} />
      <path d="M145.4 1.2 C145.6 -1.6 148.6 -2.8 151 -1.8 C152.8 -3.6 156.4 -3 157.4 -0.8 C159.6 -1.8 162.6 -0.6 163 1.6 C165.6 1 168.4 2.4 168.4 4.4 C171 4.2 173.6 5.6 173.6 7.4 C176.6 7.2 179.4 9 179.6 11 C182 11 184.6 12 185.2 12.8" fill="none" {...ink(1.5)} />
      <path d="M125.4 28.6 C125.4 26.4 127.8 25.2 129.8 26.2 C131 24.6 134 24.8 134.8 26.6 C136 26.4 137 27.4 136.8 28.4 L130 28.2 Z" fill={WHITE} />
      <path d="M125.4 28.6 C125.4 26.4 127.8 25.2 129.8 26.2 C131 24.6 134 24.8 134.8 26.6 C136 26.4 137 27.4 136.8 28.4" fill="none" {...ink(1.5)} />
    </g>
  );
}

/* ---- on the rail -------------------------------------------------------- */
/* The rail is a flat bar in perspective: on the left its far edge runs
   (41,137.5)→(93,129) and its near edge (15,145)→(100,135); behind him on
   the right, far (186,113.5)→(229,109) and near (190,120.5)→(250,114).
   Things stand on the strip between, with a soft contact shadow. */

function OnePumpkin({ x, base, rx, ry, fill }) {
  const cy = base - ry;
  return (
    <g>
      <ellipse cx={x} cy={base} rx={rx + 1.5} ry="1.6" fill={INK} opacity="0.22" />
      <path d={`M${x} ${cy - ry + 1} C${x - 0.6} ${cy - ry - 2.4} ${x + 0.8} ${cy - ry - 4.4} ${x + 3} ${cy - ry - 5}`} fill="none" stroke={SAGE} strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M${x} ${cy - ry + 1} C${x - 0.6} ${cy - ry - 2.4} ${x + 0.8} ${cy - ry - 4.4} ${x + 3} ${cy - ry - 5}`} fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <ellipse cx={x} cy={cy} rx={rx} ry={ry} fill={fill} {...ink()} />
      <path
        d={`M${x} ${cy - ry} C${x - rx * 0.42} ${cy - ry * 0.5} ${x - rx * 0.42} ${cy + ry * 0.5} ${x} ${cy + ry} M${x} ${cy - ry} C${x + rx * 0.42} ${cy - ry * 0.5} ${x + rx * 0.42} ${cy + ry * 0.5} ${x} ${cy + ry} M${x - rx * 0.55} ${cy - ry * 0.82} C${x - rx * 0.95} ${cy - ry * 0.4} ${x - rx * 0.95} ${cy + ry * 0.4} ${x - rx * 0.55} ${cy + ry * 0.82} M${x + rx * 0.55} ${cy - ry * 0.82} C${x + rx * 0.95} ${cy - ry * 0.4} ${x + rx * 0.95} ${cy + ry * 0.4} ${x + rx * 0.55} ${cy + ry * 0.82}`}
        fill="none" stroke={INK} strokeWidth={FINE} opacity="0.75"
      />
    </g>
  );
}

/** Pumpkins on the rail below his cup. In October his card already has one
    at its corner (FoxPlay's Pumpkin); then only the little gold one is added. */
function Pumpkins({ hasOne }) {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__pumpkins">
      {hasOne
        ? <OnePumpkin x={56} base={138.2} rx={10} ry={7} fill={GOLD} />
        : (
          <>
            <OnePumpkin x={50} base={139} rx={12.5} ry={8.6} fill={PUMPKIN_ORANGE} />
            <OnePumpkin x={71} base={135.9} rx={8.4} ry={6} fill={GOLD} />
          </>
        )}
    </g>
  );
}

/** An iced drink waiting on the rail behind him: dome lid, raspberry straw,
    ice, about the size of his own cup. */
const ICED_K = 1.18; // about the size of his own cup

function Iced() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__iced">
      <ellipse cx="208" cy="115.6" rx="10.4" ry="1.7" fill={INK} opacity="0.22" />
      <g transform={`translate(208 115.4) scale(${ICED_K}) translate(-208 -115.4)`}>
        <path d="M210 88 L214.6 77.6" stroke={INK} strokeWidth={4.4 / ICED_K} strokeLinecap="round" />
        <path d="M210 88 L214.6 77.6" stroke={RASP} strokeWidth={2.2 / ICED_K} strokeLinecap="round" />
        <path d="M200.6 92.4 L215.4 92.4 L213.4 115 L202.6 115 Z" fill={WHITE} />
        <path d="M201.2 98.6 L214.8 98.6 L213.4 115 L202.6 115 Z" fill={GOLD} />
        <path d="M201.8 105 L214.2 105 L213.7 110.4 L202.3 110.4 Z" fill={SAGE} />
        <rect x="203.4" y="99.6" width="4" height="4" rx="0.8" fill={CREAM} {...ink(0.9 / ICED_K)} transform="rotate(-12 205.4 101.6)" />
        <rect x="208.4" y="100.8" width="4" height="4" rx="0.8" fill={CREAM} {...ink(0.9 / ICED_K)} transform="rotate(14 210.4 102.8)" />
        <path d="M200.6 92.4 L215.4 92.4 L213.4 115 L202.6 115 Z" fill="none" {...ink(LINE / ICED_K)} />
        <path d="M199.4 92.6 C199.8 86.6 216.2 86.6 216.6 92.6 Z" fill={WHITE} {...ink(LINE / ICED_K)} />
      </g>
    </g>
  );
}

/** A little sun in the empty sky corner behind his hat, with a soft glow. */
function Sun() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__sun">
      <circle cx="238" cy="24" r="17" fill={GOLD} opacity="0.14" />
      <circle cx="238" cy="24" r="12.5" fill={GOLD} opacity="0.2" />
      <g stroke={GOLD_DEEP} strokeWidth="2.2" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M238 13 L238 9.4" transform={`rotate(${a} 238 24)`} />
        ))}
      </g>
      <circle cx="238" cy="24" r="7.2" fill={GOLD} {...ink(1.8)} />
    </g>
  );
}

/* ---- the umbrella (rain) ------------------------------------------------ */
/* A café umbrella clamped to the rail just behind him: the pole stands at
   x=194, clear of his back and hat (his hat's right corner is at x≈187), the
   canopy shelters his hat from above, and the crook handle hangs below the
   rail. Pole, canopy and rain are in the back layer (so a nightcap or his
   ears sit in front of them); the brass clamp is in front of the rail. */
const POLE_X = 194;
const R = 60; // canopy half-width
// the scalloped hem, right to left: four panels, each sagging a little
const SCALLOPS = [30, 0, -30, -60].map((dx, i) => {
  const from = POLE_X + R - i * 30;
  const to = POLE_X + dx;
  return `C${from - 7} -6.2 ${to + 7} -6.2 ${to} -3`;
}).join(' ') + ' Z';

function UmbrellaBack() {
  const x = POLE_X;
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__umbrella">
      <path d={`M${x} -16 L${x} 131.5 C${x} 137 ${x - 7} 137 ${x - 7} 132`} fill="none" {...ink(2.2)} />
      <g className="fox-outfit__canopy">
        <path
          d={`M${x - R} -3 C${x - R + 2} -12.6 ${x - 32} -17.6 ${x} -17.6 C${x + 32} -17.6 ${x + R - 2} -12.6 ${x + R} -3 ${SCALLOPS}`}
          fill={SAGE} {...ink()}
        />
        <path d={`M${x} -17.6 C${x - 14} -15 ${x - 26} -9 ${x - 30} -3 M${x} -17.6 C${x + 14} -15 ${x + 26} -9 ${x + 30} -3 M${x} -17.6 L${x} -3`} fill="none" stroke={GOLD} strokeWidth={FINE} />
        <path d={`M${x} -17.6 L${x} -20.6`} fill="none" {...ink(2.2)} />
      </g>
      <Rain drops={RAIN_UMBRELLA} />
    </g>
  );
}

function UmbrellaClamp() {
  const x = POLE_X;
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__umbrella-clamp">
      <path d={`M${x - 2.6} 111.4 L${x + 2.6} 110.9 L${x + 2.6} 121.2 L${x - 2.6} 121.8 Z`} fill={GOLD} {...ink(1.4)} />
      <path d={`M${x - 2.6} 116.5 L${x + 2.6} 116`} fill="none" stroke={GOLD_DEEP} strokeWidth="1" />
    </g>
  );
}

/* rain streaks around (never on) the canopy, plus a drip off each tip */
const RAIN_UMBRELLA = [
  { x: 14, y: 4, d: 0 }, { x: 32, y: 26, d: 0.5 }, { x: 10, y: 52, d: 1 }, { x: 46, y: -8, d: 0.3 },
  { x: 102, y: -2, d: 0.8 }, { x: 118, y: 14, d: 0.15 }, { x: 40, y: 82, d: 0.65 },
  { x: 256, y: 10, d: 0.4 }, { x: 250, y: 50, d: 0.9 },
];

function Rain({ drops }) {
  return (
    <g className="fox-outfit__rain">
      {drops.map((r) => (
        <path key={`${r.x},${r.y}`} className="fox-outfit__drop" style={{ animationDelay: `${r.d}s` }}
          d={`M${r.x} ${r.y} L${r.x - 1.6} ${r.y + 7}`} fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
      ))}
      {[POLE_X - R, POLE_X + R].map((x, i) => (
        <path key={x} className="fox-outfit__drip" style={{ animationDelay: `${i * 0.9}s` }}
          d={`M${x} -1 C${x - 1.4} 1.4 ${x - 1.4} 3 ${x} 3 C${x + 1.4} 3 ${x + 1.4} 1.4 ${x} -1 Z`} fill={WHITE} {...ink(1)} />
      ))}
    </g>
  );
}

/* ---- snowflakes --------------------------------------------------------- */
const FLAKES = [
  { x: 18, y: 6, s: 1, d: 0 },
  { x: 42, y: 30, s: 0.8, d: 2.2 },
  { x: 14, y: 64, s: 0.9, d: 4.4 },
  { x: 104, y: -6, s: 0.85, d: 1.2 },
  { x: 214, y: 2, s: 1, d: 3.3 },
  { x: 246, y: 26, s: 0.85, d: 0.6 },
  { x: 230, y: 60, s: 0.95, d: 5.2 },
  { x: 256, y: 76, s: 0.75, d: 2.8 },
];
const FLAKE = 'M0 -5 L0 5 M-4.3 -2.5 L4.3 2.5 M-4.3 2.5 L4.3 -2.5';

/** Snowflakes falling slowly around him, in the empty sky. */
function Snow() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__snow">
      {FLAKES.map((f) => (
        <g key={`${f.x},${f.y}`} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
          <g className="fox-outfit__flake" style={{ animationDelay: `${f.d}s` }}>
            <path d={FLAKE} stroke={INK} strokeWidth={3.4 / f.s} strokeLinecap="round" />
            <path d={FLAKE} stroke={WHITE} strokeWidth={1.4 / f.s} strokeLinecap="round" />
          </g>
        </g>
      ))}
    </g>
  );
}

/* ---- the September leaf ------------------------------------------------- */
const LEAF = 'M0 0 C3 -4.2 9.2 -5.3 15 -1.4 C12.6 1.2 9.2 5.8 3.2 5 C1.4 3.9 0.5 2 0 0 Z';

/** A leaf that drifted down and got caught on his hat brim (asleep, with the
    nightcap on, it has landed on the rail instead). */
function Leaf() {
  return (
    <g className="fox-outfit__part fox-outfit__beside fox-outfit__leaf">
      <g className="fox-outfit__leaf-brim fox-outfit__hat" transform="translate(133.6 27.2) rotate(158)">
        <path d="M0 0 L-2.6 -1" fill="none" {...ink(1.4)} />
        <path d={LEAF} fill={GOLD_DEEP} {...ink(1.6)} />
        <path d="M0.6 0.4 C4.6 0.2 9.2 -0.4 13.2 -1.2 M5.6 0 L8.6 -2.8 M8.2 -0.4 L10.4 2" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      </g>
      <g className="fox-outfit__leaf-rail" transform="translate(52 136.4) rotate(-9)">
        <ellipse cx="8" cy="0.8" rx="9.6" ry="1.4" fill={INK} opacity="0.2" />
        <path d={LEAF} fill={GOLD_DEEP} {...ink(1.6)} transform="scale(1.05 0.72) translate(0 -2.4)" />
      </g>
    </g>
  );
}

const FRONT = { scarf: Scarf, sprig: Sprig, flower: Flower, sun: Sun, iced: Iced, umbrella: UmbrellaClamp, snow: Snow, leaf: Leaf };
const BACK = { scarf: ScarfBack, umbrella: UmbrellaBack };

/**
 * One layer of the outfit. `outfit` comes from useFoxOutfit(); `hasPumpkin`
 * says his figure is already drawing its own October pumpkin. Render the
 * "back" layer before his drawing and the "front" layer after it, both inside
 * .fox-guide__figure.
 */
export default function FoxOutfit({ outfit, hasPumpkin = false, layer = 'front' }) {
  const parts = outfit?.parts || [];
  const back = layer === 'back';
  const shown = parts.filter((p) => (back ? BACK[p] : FRONT[p] || p === 'pumpkins'));
  if (!shown.length) return null;
  return (
    <svg
      className={`fox-outfit fox-outfit--${back ? 'back' : 'front'} fox-outfit--${outfit.id}`}
      viewBox={`0 0 ${FOX_W} ${FOX_H}`} aria-hidden="true" focusable="false" data-outfit={outfit.id}
    >
      {shown.map((p) => {
        if (p === 'pumpkins') return <Pumpkins key={p} hasOne={hasPumpkin} />;
        const Part = back ? BACK[p] : FRONT[p];
        return (
          <g key={p}>
            <Part />
            {!back && p === 'snow' && <HatSnow />}
          </g>
        );
      })}
    </svg>
  );
}

/** His one line about the outfit, under the card's greeting. */
export function FoxOutfitLine({ outfit }) {
  if (!outfit?.line || !outfit.parts?.length) return null;
  return <p className="fox-outfit__line">{outfit.line}</p>;
}
