import { useId } from 'react';
import { FOX_H, FOX_PATH, FOX_W } from '../lib/foxArt.js';
import '../styles/fox-tricks.css';

/* The drawings for the fox's hidden tricks (rules: src/lib/foxTricks.js,
   wiring: src/lib/useFoxTricks.js). All in the logo's line style, in his
   own drawing's coordinates, so they turn and hop with him. Motion is CSS
   (fox-tricks.css); prefers-reduced-motion leaves each one still. */

/* His top hat in the drawing, as a clip region — the crown, band and brim,
   with a notch round his right ear (the ear sits in front of the hat and
   stays put). Traced against fox-sipping.png. */
const HAT = '116,21 135.5,21.5 141,-3 155,-3 193,8 187,31 192,40 189,48 178,47 176,40 166,19 162.5,15 158.2,16.5 155.6,24 153.6,32 152.5,41.5 132,38.3 124,33 116,29';
const HAT_D = `M${HAT.split(' ').join(' L')} Z`;

/** The fox with his hat as its own piece, so it can be lifted and tipped.
    Drawn only while the trick plays; at rest it's pixel-identical to FoxArt. */
export function FoxTipArt() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="fox-guide__art fox-tip" viewBox={`0 0 ${FOX_W} ${FOX_H}`} width={FOX_W} height={FOX_H} aria-hidden="true" focusable="false" data-testid="fox-tip">
      <defs>
        <clipPath id={`${id}-hat`}><path d={HAT_D} /></clipPath>
        <clipPath id={`${id}-fox`}><path clipRule="evenodd" d={`M-20 -40H${FOX_W + 20}V${FOX_H + 20}H-20Z ${HAT_D}`} /></clipPath>
      </defs>
      <path d={FOX_PATH} fill="#191512" fillRule="evenodd" clipPath={`url(#${id}-fox)`} />
      <g className="fox-tip__hat">
        <path d={FOX_PATH} fill="#191512" fillRule="evenodd" clipPath={`url(#${id}-hat)`} />
      </g>
    </svg>
  );
}

/** A little party hat perched on the crown of his top hat (Oct 13). */
function PartyHat() {
  return (
    <g className="fox-trick__party" transform="translate(167 3.5) rotate(15)">
      <path d="M-9 0 L0 -24 L9 0 Z" fill="#b0436e" stroke="#2c2722" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-5.6 -9 L4.9 -12.5 M-7.7 -3.5 L7.4 -4.6 M-3 -16.5 L2.7 -17.6" stroke="#f7f1e4" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M-10 0.6 Q0 3.4 10 0.6" fill="none" stroke="#2c2722" strokeWidth="1.8" strokeLinecap="round" />
      <circle cy="-25.5" r="3.6" fill="#d4ad57" stroke="#2c2722" strokeWidth="1.6" />
      <g className="fox-trick__party-spark" stroke="#a87c1c" strokeWidth="1.5" strokeLinecap="round">
        <path d="M-16 -18 V-13 M-18.5 -15.5 H-13.5" />
        <path d="M14 -26 V-22 M12 -24 H16" />
      </g>
    </g>
  );
}

/** What the tricks add to his figure: the birthday party hat. Rendered
    inside .fox-guide__figure, over the drawing. */
export function FoxTrickFigure({ tricks }) {
  if (!tricks?.party) return null;
  return (
    <svg className="fox-trick fox-trick--figure" viewBox={`0 0 ${FOX_W} ${FOX_H}`} aria-hidden="true" focusable="false" data-testid="fox-party-hat">
      <PartyHat />
    </svg>
  );
}

const STARS = [[84, 16, 1], [93, 34, 0.7], [76, 40, 0.55]];

/** The late-night sky in his card: a crescent moon and three twinkling stars. */
export function FoxNightSky({ tricks }) {
  if (!tricks?.moon) return null;
  return (
    <span className="fox-trick__sky" aria-hidden="true" data-testid="fox-night">
      <svg className="fox-trick__moon" viewBox="0 0 24 24">
        <path d="M15.5 3.2 A9.4 9.4 0 1 0 20.8 17.6 A7.6 7.6 0 1 1 15.5 3.2 Z" fill="#e8cf86" stroke="#2c2722" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {STARS.map(([x, y, s], i) => (
        <svg key={x} className="fox-trick__star" viewBox="-6 -6 12 12" style={{ left: `${x}%`, top: `${y}%`, '--s': s, '--d': `${i * 0.9}s` }}>
          <path d="M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3 Z" fill="#d4ad57" stroke="#2c2722" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/** His tiny speech bubble after a hat tip. Polite, so a screen reader hears it. */
export function FoxTipBubble({ tricks }) {
  return (
    <span className="fox-trick__say" role="status" aria-live="polite">
      {tricks?.line ? <span className="fox-trick__bubble" key={tricks.line}>{tricks.line}</span> : null}
    </span>
  );
}
