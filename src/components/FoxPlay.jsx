import { useEffect, useId, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowUpRightFromSquare, FaMedal, FaMugHot, FaRotateRight } from 'react-icons/fa6';
import { orderUrlFor, orderLabelFor } from '../lib/order.js';
import { productImageSources, isCutout } from '../lib/productImage.js';
import { track } from '../lib/analytics.js';
import { FOX_H, FOX_PATH, FOX_W } from '../lib/foxArt.js';
import { saveUsual } from '../lib/yourUsual.js'; // fox-outfits: "your usual"
import {
  ANY, POUR_MS, QUIZ, closedOrderNote, drinkLook, fmtPrice, matchDrink, pickSurprise,
  quizPlan, refineOptions,
} from '../lib/foxFun.js';

/* The fox's games — the panes that show in his help card's answer area
   (FoxGuide.jsx) — plus the fox drawing, his accessories and his tail.
   Rules live in src/lib/foxFun.js; these only draw them. All motion is CSS
   (fox-guide.css), transform + opacity only; prefers-reduced-motion stills
   all of it. */

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---- A drink's picture ---------------------------------------------------
   One component for every drink the fox shows (Surprise me, the quiz match
   and its runner-ups, "your usual"): a small gilt frame — the gallery
   wall's thin gold fillet — holding the item's real photo when it has one
   (its own image_url, then the drop-in file; productImageSources), and its
   drawn cup otherwise. The cup is there from the first paint: it holds the
   frame's size while the photo lazy-loads, stays if the photo fails (each
   source is tried in turn, then it quietly gives up), and is what a drink
   without a photo simply looks like. A cutout (background removed) is shown
   whole on the lit mat; an ordinary photo fills the frame.
   `ready` holds a loaded photo back — Surprise me pours the cup first, then
   lets the photo take over. `art` swaps the stand-in drawing (the pour). */
export function DrinkPhoto(props) {
  // a new drink starts over: first source, nothing loaded
  return <FramedDrink key={props.item?.name || ''} {...props} />;
}

function FramedDrink({ item, size = 'md', ready = true, art = null, className = '' }) {
  const sources = productImageSources(item);
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[i];
  const shown = Boolean(src && loaded && ready);
  const cls = ['fox-photo', `fox-photo--${size}`, shown && 'has-photo', src && isCutout(src) && 'is-cutout', className].filter(Boolean).join(' ');
  return (
    <span className={cls} data-photo={shown ? 'photo' : 'drawn'}>
      <span className="fox-photo__art" aria-hidden="true">{art || <PourCup look={drinkLook(item)} still />}</span>
      {src && (
        <img className="fox-photo__img" src={src} alt={item?.name || ''} aria-hidden={shown ? undefined : 'true'}
          loading="lazy" decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(false); setI((n) => n + 1); }} />
      )}
    </span>
  );
}

function OrderLink({ item, small = false, where = 'fox' }) {
  return (
    <a className={`fox-help__link${small ? ' fox-help__link--small' : ''}`} href={orderUrlFor(item)} target="_blank" rel="noopener noreferrer" aria-label={orderLabelFor(item)}
      onClick={() => { saveUsual(item); /* fox-outfits: your usual */ track('order_now_click', { location: where, item: item.name }); }}>
      Order <FaArrowUpRightFromSquare aria-hidden="true" />
    </a>
  );
}

/* ---- Surprise me -------------------------------------------------------
   A barista moment instead of a slot machine: the pick is poured. Its cup
   (a mug for a hot drink, a glass for a cold one — drinkLook) slides in,
   ice drops in for an iced drink, a stream of the drink's colour pours and
   the cup fills with a little slosh; then steam and a latte heart (hot), a
   straw (iced) or a whipped top (frozen), a tiny sparkle, and the name and
   price rise out with a soft bounce. ~1.5s, all CSS on transform + opacity,
   replayed by "Pick again" (the pour is keyed). Phones get one gentle tick
   as it settles. Reduced motion: the full cup, card and all, just fades in. */

/* The palette and line of the fox art: ink outlines at one weight, cream,
   sage and gold, with soft gradients only where they give the glass depth. */
const INK = '#2c2722';
const CREAM = '#f7f1e4';
const SAGE = '#545f33';
const GOLD_DEEP = '#a87c1c';
const MILK = '#f0e0c2';
const LINE = 2.2;

/** Blend two #rrggbb colours: t = 0 → a, 1 → b. */
function mix(a, b, t) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/* ---- the tumbler (iced, frozen) — viewBox 0 0 100 100 ----
   A slightly tapered glass: an elliptical rim, a thick base, the drink
   inside it to SURF. */
const GLASS_OUT = 'M23 20 L30.2 85 C30.6 89 32.6 91 36.5 91 H63.5 C67.4 91 69.4 89 69.8 85 L77 20';
const GLASS_BODY = `${GLASS_OUT} A27 5.2 0 0 0 23 20 Z`;
const GLASS_IN = 'M25.2 21.5 L31.4 78.6 C31.6 80.4 32.8 81.2 34.8 81.2 H65.2 C67.2 81.2 68.4 80.4 68.6 78.6 L74.8 21.5 Z';
const below = (y) => `M10 ${y} Q50 ${y + 7.4} 90 ${y} V100 H10 Z`; // everything under the drink's surface
// ice: [cx, cy, size, turn] — two bobbing at the top, the rest under
const ICE = [[37.5, 34, 13, -14], [58, 33, 12.5, 12], [47, 46.5, 12, 6], [61.5, 52, 11, -9], [37, 60, 10.5, 18]];
const DROPS = [[29.6, 47, 1.5], [33.6, 66, 1.2], [67.6, 41, 1.3], [64.6, 68, 1.6], [39.5, 75, 1.1], [69.6, 56, 1], [31.5, 33, 1]];

/* ---- the mug and saucer (hot) ---- */
const MUG_OUT = 'M21 40 C21 56 22.5 68 27.5 75.5 C31 80.5 36 82.5 46 82.5 C56 82.5 61 80.5 64.5 75.5 C69.5 68 71 56 71 40';
const MUG_BODY = `${MUG_OUT} A25 6 0 0 0 21 40 Z`;
const HEART = 'M0 6 C-9.5 0.5 -8.5 -6.2 -4.3 -6.2 C-2.2 -6.2 -0.7 -4.9 0 -3.4 C0.7 -4.9 2.2 -6.2 4.3 -6.2 C8.5 -6.2 9.5 0.5 0 6 Z';

function Citrus({ kind }) {
  const peel = kind === 'orange' ? '#ec8a3a' : '#f0c93a';
  const flesh = kind === 'orange' ? '#f7ad62' : '#f8de62';
  return (
    <g className="fox-pour__citrus">
      <g transform="translate(75 17) rotate(-12)">
        <circle r="11" fill={peel} stroke={INK} strokeWidth={LINE} />
        <circle r="8.6" fill="#fdf6dc" />
        <circle r="7.4" fill={flesh} />
        <g stroke="#fdf6dc" strokeWidth="1.3" strokeLinecap="round">
          {[0, 45, 90, 135].map((a) => <path key={a} d="M0 -7.4 V7.4" transform={`rotate(${a})`} />)}
        </g>
        <circle r="1.5" fill="#fdf6dc" />
        <path d="M-6.4 -5.2 A8.2 8.2 0 0 1 2 -8" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      </g>
    </g>
  );
}

/** A glass straw: clear tube, ink edges; under the surface it takes the drink's colour. */
function Straw({ d, tint, clip }) {
  return (
    <g className="fox-pour__straw">
      <path d={d} stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d={d} stroke="#eef2ea" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <g clipPath={`url(#${clip})`}><path d={d} stroke={tint} strokeWidth="2.8" fill="none" opacity="0.7" /></g>
      <path d={d} stroke="#fff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.9" transform="translate(-0.9 0)" />
    </g>
  );
}

function Glass({ look, id, still }) {
  const frozen = look.frozen;
  const surf = frozen ? 24 : 34;
  const top = look.top || mix(look.fill, '#ffffff', 0.18);
  const deep = mix(look.fill, '#5a3410', 0.22); // deeper and warmer at the bottom, never grey
  const layered = look.milk && !frozen;
  const straw = frozen ? 'M64 1 L52 70' : 'M67 3 L53 76';
  return (
    <>
      <defs>
        <clipPath id={`${id}-in`}><path d={GLASS_IN} /></clipPath>
        <clipPath id={`${id}-body`}><path d={GLASS_BODY} /></clipPath>
        <clipPath id={`${id}-under`}><path d={below(surf)} /></clipPath>
        <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#bccdc8" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={`${id}-liq`} x1="0" x2="0" y1={surf} y2="81" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={layered ? mix(top, '#000000', 0.06) : top} />
          <stop offset="1" stopColor={layered ? look.fill : deep} />
        </linearGradient>
        <linearGradient id={`${id}-milk`} x1="0" x2="0" y1="52" y2="81" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={mix(look.fill, MILK, 0.4)} />
          <stop offset="0.3" stopColor={MILK} />
          <stop offset="1" stopColor="#e6d1ab" />
        </linearGradient>
        <linearGradient id={`${id}-ice`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e4eef0" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {/* the glass, its back wall and the back of the rim */}
      <path d={GLASS_BODY} fill={`url(#${id}-glass)`} />
      <path d="M23 20 A27 5.2 0 0 1 77 20" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.55" />
      {!still && <rect className="fox-pour__stream" x="48.2" y="0" width="3.6" height="80" rx="1.8" fill={look.fill} />}
      {!frozen && <Straw d={straw} tint={look.fill} clip={`${id}-under`} />}
      {/* the drink */}
      <g clipPath={`url(#${id}-in)`}>
        <g className="fox-pour__liquid">
          <rect x="20" y={surf} width="60" height="70" fill={`url(#${id}-liq)`} />
          {layered && (
            <>
              <path d="M20 57 C29 52.5 38 61 50 56.5 C61 52 70 60 80 55 V100 H20 Z" fill={`url(#${id}-milk)`} />
              <g fill={look.fill} opacity="0.5">
                <path d="M34 57.5 C31.5 63 38 66 35 73 C40 68 39.5 62 41.5 58 Z" />
                <path d="M57 56 C55.5 61 60.5 63.5 58.5 69 C63 64.5 62 59.5 63.5 56.5 Z" />
                <path d="M46.5 57.5 C46 60.5 48.5 62 47.2 65 C50 62.5 49.6 59.5 50.5 57 Z" />
              </g>
            </>
          )}
          <ellipse cx="50" cy={surf} rx="25" ry="3.6" fill={mix(top, '#ffffff', 0.28)} />
          <path d={`M27 ${surf - 0.4} Q50 ${surf - 4.4} 73 ${surf - 0.4}`} fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.55" />
        </g>
      </g>
      {look.ice && (
        <g>
          {ICE.map(([x, y, s, r], i) => (
            <g key={i} className="fox-pour__ice">
              <g transform={`rotate(${r} ${x} ${y})`}>
                <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx="3.4" fill={`url(#${id}-ice)`} stroke={INK} strokeOpacity="0.5" strokeWidth="1.1" />
                <path d={`M${x - s / 2 + 2.4} ${y + s / 2 - 4} V${y - s / 2 + 3.2} Q${x - s / 2 + 2.4} ${y - s / 2 + 2.4} ${x - s / 2 + 3.4} ${y - s / 2 + 2.4} H${x + s / 2 - 4}`}
                  fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
              </g>
            </g>
          ))}
          {/* under the surface the ice takes the drink's colour */}
          <g className="fox-pour__tint" clipPath={`url(#${id}-under)`} opacity="1">
            {ICE.map(([x, y, s, r], i) => (
              <rect key={i} x={x - s / 2} y={y - s / 2} width={s} height={s} rx="3.4" transform={`rotate(${r} ${x} ${y})`} fill={look.fill} opacity="0.38" />
            ))}
          </g>
        </g>
      )}
      {/* the thick base */}
      <g clipPath={`url(#${id}-body)`}>
        <rect x="20" y="81.2" width="60" height="12" fill="#d7e3df" opacity="0.65" />
        <ellipse cx="50" cy="81.6" rx="17" ry="2.2" fill="none" stroke={INK} strokeWidth="1" opacity="0.4" />
        <path d="M36 86.5 H55" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      </g>
      {/* gleam, shade and condensation on the glass */}
      <path d="M28.4 26 L33.8 80" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity="0.6" />
      <path d="M33.4 27 L35.4 46" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
      <path d="M72.6 25 L67.2 80" stroke={INK} strokeWidth="2.4" strokeLinecap="round" opacity="0.09" />
      <g className="fox-pour__drops">
        {DROPS.map(([x, y, r], i) => (
          <g key={i}>
            <path d={`M${x} ${y - r * 1.6} C${x + r * 1.1} ${y - r * 0.2} ${x + r} ${y + r} ${x} ${y + r} C${x - r} ${y + r} ${x - r * 1.1} ${y - r * 0.2} ${x} ${y - r * 1.6} Z`}
              fill="#fff" fillOpacity="0.55" stroke={INK} strokeOpacity="0.35" strokeWidth="0.6" />
            <circle cx={x - r * 0.3} cy={y} r={r * 0.32} fill="#fff" />
          </g>
        ))}
      </g>
      {/* the outline and the rim */}
      <path d={GLASS_OUT} fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M77 20 A27 5.2 0 0 1 23 20" fill="none" stroke={INK} strokeWidth={LINE} />
      <path d="M26 21.6 Q50 26.6 74 21.6" fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />
      {frozen && (
        <>
          <Straw d={straw} tint={look.fill} clip={`${id}-under`} />
          <g className="fox-pour__dome">
            <path d="M22.5 21.5 C16.5 15 23 8 30.5 10.8 C30.5 4 41 1 47.5 5.6 C53 0.6 65.5 3 66.5 10.6 C74 7.6 83 14 77.5 21.5 C69 25.6 31 25.6 22.5 21.5 Z"
              fill="#fbf5ea" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
            <path d="M25.5 18.6 C35 15.6 43 21 51.5 16.8 C59.5 13 67.5 18 75 17" fill="none" stroke={INK} strokeWidth="1.1" opacity="0.35" strokeLinecap="round" />
            <path d="M35 9.6 C41 6.6 49.5 10.4 57 7.4" fill="none" stroke={INK} strokeWidth="1.1" opacity="0.35" strokeLinecap="round" />
            <path d="M27 14.6 Q31 19 35 13.4 Q40 18.6 45 11.8 Q50 18 55 11.4 Q60 17.6 66 12.4 Q70 17 74 14.6" fill="none" stroke={GOLD_DEEP} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
            <path d="M30 13 C31.5 11 34 10.6 36 11.4" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </>
      )}
      {look.citrus && <Citrus kind={look.citrus} />}
    </>
  );
}

function Mug({ look, id, still }) {
  const surface = look.heart ? look.fill : look.crema ? '#6b3f22' : look.fill;
  return (
    <>
      <defs>
        <clipPath id={`${id}-in`}><ellipse cx="46" cy="40.7" rx="22.4" ry="4.9" /></clipPath>
        <clipPath id={`${id}-body`}><path d={MUG_BODY} /></clipPath>
        <linearGradient id={`${id}-mug`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fffbf3" />
          <stop offset="0.42" stopColor={CREAM} />
          <stop offset="1" stopColor="#dfcfae" />
        </linearGradient>
        <radialGradient id={`${id}-top`} cx="0.42" cy="0.4" r="0.7">
          <stop offset="0" stopColor={mix(surface, '#ffffff', look.crema ? 0.35 : 0.16)} />
          <stop offset="1" stopColor={mix(surface, '#000000', 0.12)} />
        </radialGradient>
      </defs>
      {/* the saucer and its shadows */}
      <ellipse cx="47" cy="90.6" rx="31" ry="4" fill={INK} opacity="0.1" />
      <ellipse cx="47" cy="84.6" rx="35" ry="7.4" fill={CREAM} stroke={INK} strokeWidth={LINE} />
      <ellipse cx="47" cy="84" rx="21" ry="3.8" fill="none" stroke={INK} strokeWidth="1" opacity="0.22" />
      <path d="M17 86.4 Q47 94 77 86.4" fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />
      <ellipse cx="46" cy="82.2" rx="20" ry="3.2" fill={INK} opacity="0.2" />
      {/* the handle, then the mug over its ends */}
      <path d="M69.4 49 C83.5 47 86 64.5 65.5 71" fill="none" stroke={INK} strokeWidth="8.4" strokeLinecap="round" />
      <path d="M69.4 49 C83.5 47 86 64.5 65.5 71" fill="none" stroke={CREAM} strokeWidth="4.2" strokeLinecap="round" />
      <path d={MUG_BODY} fill={`url(#${id}-mug)`} />
      <g clipPath={`url(#${id}-body)`}>
        <path d="M18 56 Q46 64 74 56" fill="none" stroke={SAGE} strokeWidth="3.6" />
        <path d="M18 61.4 Q46 69.4 74 61.4" fill="none" stroke="#d4ad57" strokeWidth="1.2" />
        <path d="M25.5 46 C25.5 58 27 67 31 73" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.75" />
      </g>
      <path d={MUG_OUT} fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      {/* the opening: inside wall, then the drink rising into it */}
      <ellipse cx="46" cy="40" rx="25" ry="6" fill="#e8dcc4" stroke={INK} strokeWidth={LINE} />
      {!still && <rect className="fox-pour__stream" x="44.2" y="0" width="3.6" height="41" rx="1.8" fill={look.fill} />}
      <g clipPath={`url(#${id}-in)`}>
        <g className="fox-pour__liquid">
          <ellipse cx="46" cy="41.4" rx="22.4" ry="4.9" fill={`url(#${id}-top)`} />
          {look.crema && <ellipse cx="44.5" cy="41" rx="15" ry="2.6" fill="#c08850" opacity="0.55" />}
          {look.milk && !look.heart && !look.crema && <ellipse cx="45" cy="41" rx="17" ry="3" fill="#fff" opacity="0.14" />}
        </g>
      </g>
      <path d="M22.6 41.6 Q46 49 69.4 41.6" fill="none" stroke="#fff" strokeWidth="1" opacity="0.85" />
      {look.heart && (
        <g className="fox-pour__heart">
          <g transform="translate(46.5 41.3) scale(1.3 0.5)">
            <path d="M0 11 C-0.6 8 -0.4 7 0 6" fill="none" stroke="#fbf4e6" strokeWidth="1.6" strokeLinecap="round" />
            <path d={HEART} fill="#fbf4e6" />
            <path d="M-3 -3 C-1.8 -0.2 1.8 -0.2 3 -3" fill="none" stroke={look.fill} strokeWidth="0.9" opacity="0.6" />
          </g>
        </g>
      )}
      {look.steam && (
        <g className="fox-pour__steam" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round">
          <path d="M37 31 C33 25.5 40.5 21 36.5 14" />
          <path d="M46 29.5 C42 22.5 50.5 18 46 9" />
          <path d="M55 31 C51 25.5 58.5 21 54.5 15" />
        </g>
      )}
    </>
  );
}

/** The cup being poured — a mug on its saucer for a hot drink, a tumbler
    for a cold one — drawn in the fox art's line and palette. `still` draws
    the finished cup with no pour (a stand-in for a missing photo). */
export function PourCup({ look, still = false }) {
  const id = `fox-pour-${useId().replace(/:/g, '')}`;
  const mug = look.vessel === 'mug';
  return (
    <svg className={`fox-pour__cup is-${look.vessel}${still ? ' is-still' : ''}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false"
      style={{ '--fill-from': `${mug ? 11 : look.frozen ? 58 : 48}px` }}>
      {mug ? <Mug look={look} id={id} still={still} /> : <Glass look={look} id={id} still={still} />}
    </svg>
  );
}

/** The Surprise me tile's icon: a steaming mug with a sparkle. */
export function SurpriseIcon() {
  return (
    <span className="fox-help__tile-ico" aria-hidden="true">
      <FaMugHot />
      <svg className="fox-help__tile-spark" viewBox="0 0 10 10"><path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" /></svg>
    </span>
  );
}

export function SurprisePane({ menu, hours, overrides }) {
  const [pour, setPour] = useState(() => ({ item: pickSurprise(menu), n: 1 }));
  const [pouring, setPouring] = useState(() => Boolean(pour.item) && !reduced());
  const instant = reduced();

  // the pour's own clock: a tick on the phone as it settles, then the
  // buttons wake up
  useEffect(() => {
    if (!pouring) return undefined;
    const tick = setTimeout(() => { try { navigator.vibrate?.(10); } catch { /* not allowed here: fine */ } }, POUR_MS - 350);
    const done = setTimeout(() => setPouring(false), POUR_MS);
    return () => { clearTimeout(tick); clearTimeout(done); };
  }, [pouring, pour.n]);
  useEffect(() => { if (!pouring && pour.item) saveUsual(pour.item); }, [pouring, pour]); // fox-outfits: a poured pick is "your usual"

  const again = () => {
    const next = pickSurprise(menu, { not: pour.item?.name });
    setPour((p) => ({ item: next, n: p.n + 1 }));
    setPouring(Boolean(next) && !reduced());
    track('fox_surprise_again');
  };

  const { item } = pour;
  if (!item) return <p className="fox-help__a">Hmm, I can’t see any drinks on the menu right now.</p>;
  const note = closedOrderNote(hours, overrides);
  return (
    <div className={`fox-play fox-surprise${pouring ? ' is-pouring' : ''}${instant ? ' is-instant' : ''}`} data-testid="fox-surprise">
      <p className="fox-help__q">The fox pours you…</p>
      <div className="fox-drink fox-surprise__card fox-pour" key={pour.n}>
        <DrinkPhoto item={item} size="lg" ready={!pouring} className="fox-pour__frame" art={(
          <span className="fox-pour__stage">
            <PourCup look={drinkLook(item)} />
            {!instant && <span className="fox-surprise__spark"><i /><i /><i /><i /></span>}
          </span>
        )} />
        <div className="fox-drink__info fox-pour__info">
          <p className="fox-pour__wait" aria-hidden="true">Pouring…</p>
          <div className="fox-pour__card">
            <p className="fox-drink__name">{item.name}</p>
            <p className="fox-drink__price">{fmtPrice(item.price)}</p>
          </div>
        </div>
        {note && <p className="fox-drink__note">{note}</p>}
      </div>
      <p className="fox-help__links fox-surprise__links">
        <OrderLink item={item} />
        <button type="button" className="fox-help__link fox-help__link--ghost" onClick={again} disabled={pouring}>
          <FaRotateRight aria-hidden="true" /> Pick again
        </button>
      </p>
    </div>
  );
}

/* ---- Today's fox fact -------------------------------------------------- */
export function FactPane({ fact }) {
  const [shown, setShown] = useState(false);
  const riddle = fact.kind === 'riddle';
  return (
    <div className="fox-play" data-testid="fox-fact">
      <p className="fox-help__q">{riddle ? 'Today’s fox riddle' : 'Today’s fox fact'}</p>
      <p className="fox-help__a">{fact.text}</p>
      {riddle && (shown ? (
        <p className="fox-fact__answer" role="status">{fact.answer}</p>
      ) : (
        <p className="fox-help__links">
          <button type="button" className="fox-help__link" onClick={() => setShown(true)}>Reveal the answer</button>
        </p>
      ))}
      <p className="fox-fact__more">A new one every day.</p>
    </div>
  );
}

/* ---- Pick-a-drink quiz ---------------------------------------------------
   Up to five quick questions (quizPlan only asks the ones that narrow
   today's menu, with only the answers some drink has), each skippable;
   then the best match with two runner-ups, and refinements that only show
   when they'd really change the pick. */

const laterThan = (id) => QUIZ.slice(QUIZ.findIndex((q) => q.id === id) + 1).map((q) => q.id);

export function QuizPane({ menu, hours, overrides }) {
  const [answers, setAnswers] = useState({});
  const [at, setAt] = useState(0);
  const [result, setResult] = useState(() => (quizPlan(menu, {}).length ? null : { r: matchDrink(menu, {}), refine: [], aside: [] }));
  const heading = useRef(null);
  const plan = quizPlan(menu, answers);

  // keyboard users stay with the quiz: focus moves to each new question
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [at, result]);
  useEffect(() => { if (result?.r?.item) saveUsual(result.r.item); }, [result]); // fox-outfits: a match is "your usual"

  const finish = (ans) => {
    setResult({ r: matchDrink(menu, ans), refine: [], aside: [] });
    track('fox_quiz_done', ans);
  };

  const choose = (value) => {
    const q = plan[at];
    const next = { ...answers, [q.id]: value };
    laterThan(q.id).forEach((k) => { delete next[k]; }); // a changed answer re-opens what follows
    setAnswers(next);
    const nextPlan = quizPlan(menu, next);
    const i = nextPlan.findIndex((x) => x.id === q.id) + 1;
    if (i < nextPlan.length) setAt(i);
    else finish(next);
  };

  const back = () => {
    if (result) { setResult(null); setAt(Math.max(0, plan.length - 1)); return; }
    setAt(Math.max(0, at - 1));
  };
  const restart = () => { setAnswers({}); setAt(0); setResult(null); };

  if (result) {
    const { r, refine, aside } = result;
    if (!r) return <p className="fox-help__a">Hmm, I can’t see any drinks on the menu right now.</p>;
    const refines = refineOptions(menu, answers, { refine, not: aside, current: r.item });
    const doRefine = (id) => {
      const nextRefine = id === 'more' ? refine : [...refine, id];
      const nextAside = id === 'more' ? [...aside, r.item.name] : aside;
      setResult({ r: matchDrink(menu, answers, { refine: nextRefine, not: nextAside }), refine: nextRefine, aside: nextAside });
      track('fox_quiz_refine', { refine: id });
    };
    const tuned = refine.length > 0 || aside.length > 0;
    const honest = r.exact ? null
      : tuned ? `To fine-tune it I let one box go: ${r.misses.join(', and ')}.`
        : `Nothing on today’s menu ticks every box, so here’s the closest: ${r.misses.join(', and ')}.`;
    const note = closedOrderNote(hours, overrides);
    return (
      <div className="fox-play fox-quiz fox-quiz--result" data-testid="fox-quiz-result">
        <div className="fox-quiz__top">
          {plan.length > 0 ? (
            <button type="button" className="fox-quiz__back" onClick={back}><FaArrowLeft aria-hidden="true" /> Back</button>
          ) : <span />}
          <span className="fox-quiz__bar is-full" aria-hidden="true"><i /></span>
        </div>
        <h3 className="sr-only" tabIndex={-1} ref={heading}>Your drink</h3>
        <div className="fox-match" key={r.item.name}>
          <DrinkPhoto item={r.item} size="md" />
          <div className="fox-drink__info">
            <p className="fox-help__q">{r.exact ? 'Your match' : tuned ? 'Fine-tuned' : 'Closest match'}</p>
            <p className="fox-drink__name">{r.item.name}</p>
            <p className="fox-drink__price">{fmtPrice(r.item.price)}</p>
          </div>
          <p className="fox-match__why">{r.line}</p>
          {(honest || note) && <p className="fox-drink__note">{[honest, note].filter(Boolean).join(' ')}</p>}
        </div>
        <p className="fox-help__links">
          <OrderLink item={r.item} where="fox_quiz" />
          <button type="button" className="fox-help__link fox-help__link--ghost" onClick={restart}><FaRotateRight aria-hidden="true" /> Start over</button>
        </p>
        {r.runners.length > 0 && (
          <>
            <p className="fox-help__q fox-runners__title">Also a good fit</p>
            <ul className="fox-runners">
              {r.runners.map((d) => (
                <li className="fox-runner" key={d.name}>
                  <DrinkPhoto item={d} size="sm" />
                  <span className="fox-runner__info">
                    <span className="fox-runner__name">{d.name}</span>
                    <span className="fox-runner__price">{fmtPrice(d.price)}</span>
                  </span>
                  <OrderLink item={d} small where="fox_quiz" />
                </li>
              ))}
            </ul>
          </>
        )}
        {refines.length > 0 && (
          <div className="fox-refine" role="group" aria-label="Fine-tune my match">
            {refines.map((x) => (
              <button key={x.id} type="button" className="fox-refine__chip" onClick={() => doRefine(x.id)}>{x.label}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const q = plan[Math.min(at, plan.length - 1)];
  if (!q) return <p className="fox-help__a">Hmm, I can’t see any drinks on the menu right now.</p>;
  const step = plan.indexOf(q);
  return (
    <div className="fox-play fox-quiz" data-testid="fox-quiz">
      <div className="fox-quiz__top">
        {step > 0 ? (
          <button type="button" className="fox-quiz__back" onClick={back}><FaArrowLeft aria-hidden="true" /> Back</button>
        ) : <span className="fox-help__q">Pick my drink</span>}
        <span className="fox-quiz__bar" role="progressbar" aria-label={`Question ${step + 1} of ${plan.length}`}
          aria-valuemin={1} aria-valuemax={plan.length} aria-valuenow={step + 1}>
          <i style={{ transform: `scaleX(${(step + 0.5) / plan.length})` }} />
        </span>
      </div>
      <h3 className="fox-quiz__q" tabIndex={-1} ref={heading} key={q.id}>{q.q}</h3>
      <div className={`fox-quiz__choices${q.options.length > 3 ? ' is-many' : ''}`}>
        {q.options.map((o) => (
          <button key={o.value} type="button" className="fox-quiz__choice" aria-pressed={answers[q.id] === o.value} onClick={() => choose(o.value)}>
            {o.label}
          </button>
        ))}
        <button type="button" className="fox-quiz__choice fox-quiz__skip" aria-pressed={answers[q.id] === ANY} onClick={() => choose(ANY)}>
          No preference
        </button>
      </div>
    </div>
  );
}

/* ---- The Trouble-maker award ------------------------------------------- */
export function AwardPane() {
  return (
    <div className="fox-play fox-award" data-testid="fox-award">
      <span className="fox-award__medal" aria-hidden="true"><FaMedal /></span>
      <div>
        <p className="fox-help__q">Badge unlocked</p>
        <p className="fox-award__title">Trouble-maker!</p>
        <p className="fox-help__a">Ten pets for the fox. That makes you an official Trouble-maker. Your badge is pinned to this card.</p>
      </div>
    </div>
  );
}

/* ---- The fox himself, and his accessories --------------------------------
   The drawing is the logo fox as a vector (src/lib/foxArt.js), traced 1:1
   from public/images/brand/fox-sipping.png and drawn at the PNG's own size
   and proportions, so his card looks exactly as it did with the PNG — just
   crisp on every screen. The accessories are overlays on it, not a redraw. */

/** The sipping fox: the full drawing (rail and all), or — with `bust` — just
    his head, top hat and collar, framed square and centred (the paw tab). */
export function FoxArt({ bust = false }) {
  const box = bust ? [99, -3, 94, 94] : [0, 0, FOX_W, FOX_H];
  return (
    <svg className={bust ? 'fox-guide__bust' : 'fox-guide__art'} viewBox={box.join(' ')} width={box[2]} height={box[3]} aria-hidden="true" focusable="false">
      <path d={FOX_PATH} fill="#191512" fillRule="evenodd" />
    </svg>
  );
}

/** Striped nightcap pulled down over his top hat, pompom flopping forward. */
export function Nightcap() {
  return (
    <svg className="fox-acc fox-acc--nightcap" viewBox="0 0 70 50" aria-hidden="true">
      <path d="M6 40 C10 22 26 8 44 8 C54 8 60 14 63 24 C58 20 52 20 48 24 C52 30 50 36 44 40 Z" fill="#f7f1e4" stroke="#221f1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 22 L30 40 M30 12 L40 34 M44 9 L49 24" stroke="#7e8c54" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M3 40 Q25 46 47 39" fill="none" stroke="#221f1a" strokeWidth="5" strokeLinecap="round" />
      <path d="M3 40 Q25 46 47 39" fill="none" stroke="#e7ebd6" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="64" cy="28" r="5" fill="#f7f1e4" stroke="#221f1a" strokeWidth="2" />
    </svg>
  );
}

/** A small pumpkin in the same line style, for October. */
export function Pumpkin() {
  return (
    <svg className="fox-acc fox-acc--pumpkin" viewBox="0 0 40 36" aria-hidden="true">
      <path d="M20 9 C19 5 21 3 24 2" fill="none" stroke="#545f33" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="20" cy="22" rx="17" ry="12" fill="#e9973f" stroke="#221f1a" strokeWidth="2" />
      <path d="M20 10 C13 14 13 30 20 34 M20 10 C27 14 27 30 20 34 M11 12 C6 17 7 29 12 32 M29 12 C34 17 33 29 28 32" fill="none" stroke="#221f1a" strokeWidth="1.4" opacity="0.7" />
    </svg>
  );
}

/** His bushy tail — tucked behind his card, it pops out to wag when petted. */
export function Tail() {
  return (
    <svg className="fox-acc fox-acc--tail" viewBox="0 0 60 40" aria-hidden="true">
      <path d="M2 27 C10 19 24 22 34 14 C41 8 48 3 57 2 C59 10 56 21 46 28 C36 36 18 39 2 34 Z" fill="#f2c08a" stroke="#221f1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M57 2 C58 9 56 16 51 22 C47 16 49 7 57 2 Z" fill="#fffdf7" stroke="#221f1a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 31 C24 30 32 26 39 19 M20 25 C27 24 32 20 36 16" fill="none" stroke="#221f1a" strokeWidth="1.1" opacity="0.45" />
    </svg>
  );
}
