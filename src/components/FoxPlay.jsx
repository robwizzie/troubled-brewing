import { useEffect, useId, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowUpRightFromSquare, FaMedal, FaMugHot, FaRotateRight } from 'react-icons/fa6';
import { CoffeeCup } from './Motifs.jsx';
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

/** A menu item's photo (own image → drop-in file), or a drawn cup. */
export function DrinkPhoto({ item, small = false }) {
  const [i, setI] = useState(0);
  const sources = productImageSources(item);
  const src = sources[i];
  useEffect(() => setI(0), [item?.name]);
  if (!src) {
    return <span className="fox-drink__photo is-motif" aria-hidden="true"><CoffeeCup size={small ? 28 : 40} color="var(--color-yellow-deep)" steam={false} /></span>;
  }
  return (
    <span className={`fox-drink__photo${isCutout(src) ? ' is-cutout' : ''}`}>
      <img src={src} alt="" onError={() => setI((n) => n + 1)} />
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

const MUG = 'M20 34 H60 V58 C60 68 52 74 40 74 C28 74 20 68 20 58 Z';
const GLASS = 'M18 20 H62 L57 74 C56.6 76.2 55 77 53 77 H27 C25 77 23.4 76.2 23 74 Z';

/** The cup being poured, drawn in the logo's line style. */
export function PourCup({ look }) {
  const clip = `fox-pour-${useId().replace(/:/g, '')}`;
  const mug = look.vessel === 'mug';
  const top = mug ? 36 : 27;
  return (
    <svg className={`fox-pour__cup is-${look.vessel}`} viewBox="0 0 88 88" aria-hidden="true" focusable="false"
      style={{ '--fill-from': `${mug ? 40 : 52}px` }}>
      <defs><clipPath id={clip}><path d={mug ? MUG : GLASS} /></clipPath></defs>
      {mug && <ellipse cx="40" cy="78.5" rx="29" ry="4.5" fill="#fffaf0" stroke="#191512" strokeWidth="2" />}
      <path d={mug ? MUG : GLASS} fill={mug ? '#fffaf0' : 'rgba(255, 255, 255, 0.6)'} />
      <rect className="fox-pour__stream" x="38" y="0" width="4" height={mug ? 74 : 77} rx="2" fill={look.fill} />
      <g clipPath={`url(#${clip})`}>
        <g className="fox-pour__liquid">
          <rect x="10" y={top} width="64" height="60" fill={look.fill} />
          <ellipse cx="40" cy={top} rx="26" ry="2.6" fill="#fff" opacity="0.25" />
        </g>
      </g>
      {look.ice && (
        <g fill="rgba(255, 255, 255, 0.72)" stroke="#8ea8b4" strokeWidth="1.4">
          <g className="fox-pour__ice"><rect x="25" y="42" width="13" height="13" rx="3" transform="rotate(-12 31.5 48.5)" /></g>
          <g className="fox-pour__ice"><rect x="41" y="35" width="13" height="13" rx="3" transform="rotate(10 47.5 41.5)" /></g>
          <g className="fox-pour__ice"><rect x="33" y="55" width="12" height="12" rx="3" transform="rotate(4 39 61)" /></g>
        </g>
      )}
      {(look.ice || look.frozen) && (
        <g className="fox-pour__straw"><path d="M53 4 L45 66" stroke="#c4566f" strokeWidth="4.2" strokeLinecap="round" /></g>
      )}
      {look.heart && (
        <g className="fox-pour__heart">
          <path d="M40 39.5 C33.5 35.5 34.5 31 37.6 31.6 C39 31.9 39.7 33 40 33.8 C40.3 33 41 31.9 42.4 31.6 C45.5 31 46.5 35.5 40 39.5 Z"
            fill="#fbf2e4" stroke="#fffaf0" strokeWidth="0.6" transform="translate(40 36.2) scale(1.5 0.78) translate(-40 -35.5)" />
        </g>
      )}
      <path d={mug ? MUG : GLASS} fill="none" stroke="#191512" strokeWidth="2.2" strokeLinejoin="round" />
      {mug && <path d="M60 40 C71 40 72 54 59.5 57" fill="none" stroke="#191512" strokeWidth="2.2" strokeLinecap="round" />}
      {!mug && <path d="M21 25 L25 70" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />}
      {look.frozen && (
        <g className="fox-pour__dome">
          <path d="M19 21 C17 12 27 8 31 12 C33 4 47 4 49 12 C53 8 63 12 61 21 Z" fill="#fffaf0" stroke="#191512" strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}
      {look.steam && (
        <g className="fox-pour__steam" fill="none" stroke="#191512" strokeWidth="1.8" strokeLinecap="round">
          <path d="M33 28 C30 23 36 19 33 13" />
          <path d="M40 27 C37 21 44 17 40 9" />
          <path d="M47 28 C44 23 50 19 47 14" />
        </g>
      )}
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
        <span className="fox-pour__stage">
          <PourCup look={drinkLook(item)} />
          {!instant && <span className="fox-surprise__spark" aria-hidden="true"><i /><i /><i /><i /></span>}
        </span>
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
          <DrinkPhoto item={r.item} />
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
                  <DrinkPhoto item={d} small />
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
