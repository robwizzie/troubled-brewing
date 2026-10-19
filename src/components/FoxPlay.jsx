import { useEffect, useId, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowUpRightFromSquare, FaDice, FaMedal, FaRotateRight } from 'react-icons/fa6';
import { CoffeeCup } from './Motifs.jsx';
import { orderUrlFor, orderLabelFor } from '../lib/order.js';
import { productImageSources, isCutout } from '../lib/productImage.js';
import { track } from '../lib/analytics.js';
import { FOX_PATH } from '../lib/foxArt.js';
import {
  ANY, QUIZ, REEL_MS, classifyDrink, closedOrderNote, fmtPrice, matchDrink, pickSurprise,
  quizPlan, reelPosition, reelStrip, refineOptions,
} from '../lib/foxFun.js';

/* The fox's games — the panes that show in his help card's answer area
   (FoxGuide.jsx) — plus the fox himself in his medallion, and his tail.
   Rules live in src/lib/foxFun.js; these only draw them. Motion is CSS
   (fox-guide.css) plus one requestAnimationFrame loop for the Surprise reel,
   transform + opacity only; prefers-reduced-motion stills all of it. */

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
      onClick={() => track('order_now_click', { location: where, item: item.name })}>
      Order <FaArrowUpRightFromSquare aria-hidden="true" />
    </a>
  );
}

/* ---- Surprise me -------------------------------------------------------
   A slot-machine reel of real drinks: it spins down with easing, overshoots
   by a hair and settles on the pick (reelPosition), while a motion-blurred
   copy of the strip cross-fades in at speed. Then the photo pops in with a
   little sparkle (and steam, for a hot drink), and phones get one gentle
   tick. The card's size is fixed from the first frame, so nothing jumps.
   Reduced motion: no reel, the pick simply fades in. */

function ReelStrip({ strip, refEl, blur }) {
  return (
    <div className={`fox-reel__strip${blur ? ' is-blur' : ''}`} ref={refEl} style={blur ? { filter: `url(#${blur})` } : undefined}>
      {strip.map((d, i) => (
        <div className="fox-reel__row" key={i}>
          <span className="fox-reel__name">{d.name}</span>
          <span className="fox-reel__price">{fmtPrice(d.price)}</span>
        </div>
      ))}
    </div>
  );
}

export function SurprisePane({ menu, hours, overrides }) {
  const uid = useId().replace(/:/g, '');
  // the first roll happens on open, before the first paint
  const [first] = useState(() => {
    const final = pickSurprise(menu);
    const animate = Boolean(final) && !reduced() && typeof requestAnimationFrame === 'function';
    return { final, spin: animate ? { key: 1, strip: reelStrip(menu, final) } : null };
  });
  const [item, setItem] = useState(first.final);
  const [spin, setSpin] = useState(first.spin); // { key, strip } while the reel turns
  const [landed, setLanded] = useState(first.spin ? 0 : 1); // bumps on every landing (replays the pop)
  const [instant, setInstant] = useState(!first.spin);
  const sharp = useRef(null);
  const soft = useRef(null);
  const raf = useRef(0);

  const roll = (not) => {
    const final = pickSurprise(menu, { not });
    cancelAnimationFrame(raf.current);
    setItem(final);
    if (!final) { setSpin(null); return; }
    if (reduced() || typeof requestAnimationFrame !== 'function') {
      setInstant(true);
      setSpin(null);
      setLanded((n) => n + 1);
      return;
    }
    setInstant(false);
    setSpin({ key: Date.now(), strip: reelStrip(menu, final) });
  };

  // the reel: one rAF loop writing transform + opacity straight to the strips
  useEffect(() => {
    if (!spin) return undefined;
    const rows = spin.strip.length;
    let start = 0;
    let last = { t: 0, pos: 0 };
    const paint = (pos, blurAmt) => {
      const y = `translate3d(0, ${(-pos * 100) / rows}%, 0)`;
      if (sharp.current) { sharp.current.style.transform = y; sharp.current.style.opacity = String(1 - blurAmt * 0.8); }
      if (soft.current) { soft.current.style.transform = y; soft.current.style.opacity = String(blurAmt); }
    };
    const frame = (now) => {
      if (!start) { start = now; last = { t: now, pos: 0 }; }
      const t = (now - start) / REEL_MS;
      const pos = reelPosition(t, rows);
      const perFrame = (Math.abs(pos - last.pos) / Math.max(1, now - last.t)) * 16.7; // rows per 60fps frame
      last = { t: now, pos };
      paint(pos, Math.min(1, perFrame / 0.45));
      if (t < 1) { raf.current = requestAnimationFrame(frame); return; }
      paint(rows - 1, 0);
      setSpin(null);
      setLanded((n) => n + 1);
      try { navigator.vibrate?.(10); } catch { /* not allowed here: fine */ }
    };
    paint(0, 0);
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [spin]);

  if (!item) return <p className="fox-help__a">Hmm, I can’t see any drinks on the menu right now.</p>;
  const note = closedOrderNote(hours, overrides);
  const hot = classifyDrink(item).temp === 'hot';
  return (
    <div className={`fox-play fox-surprise${spin ? ' is-spinning' : ''}${instant ? ' is-instant' : ''}`} data-testid="fox-surprise">
      <p className="fox-help__q">The fox picks…</p>
      <div className="fox-drink fox-surprise__card" key={instant ? `i${landed}` : 'reel'}>
        <span className="fox-surprise__pic">
          {spin ? (
            <span className="fox-drink__photo is-motif fox-surprise__dice" aria-hidden="true"><FaDice /></span>
          ) : (
            <span className="fox-surprise__pop" key={landed}>
              <DrinkPhoto item={item} />
              {!instant && (
                <span className="fox-surprise__fx" aria-hidden="true">
                  {hot && <span className="fox-surprise__steam"><i /><i /><i /></span>}
                  <span className="fox-surprise__spark"><i /><i /><i /><i /><i /></span>
                </span>
              )}
            </span>
          )}
        </span>
        <div className="fox-drink__info">
          <div className="fox-reel">
            {spin ? (
              <div className="fox-reel__win" aria-hidden="true" key={spin.key}>
                <svg className="fox-reel__defs" width="0" height="0" focusable="false">
                  <filter id={`${uid}-vblur`} x="0" y="-10%" width="100%" height="120%"><feGaussianBlur stdDeviation="0 2.4" /></filter>
                </svg>
                <ReelStrip strip={spin.strip} refEl={sharp} />
                <ReelStrip strip={spin.strip} refEl={soft} blur={`${uid}-vblur`} />
              </div>
            ) : (
              <div className="fox-reel__row is-landed" key={landed}>
                <p className="fox-drink__name" title={item.name}>{item.name}</p>
                <p className="fox-drink__price">{fmtPrice(item.price)}</p>
              </div>
            )}
          </div>
        </div>
        {note && <p className="fox-drink__note" style={spin ? { visibility: 'hidden' } : undefined}>{note}</p>}
      </div>
      <p className="fox-help__links fox-surprise__links">
        <OrderLink item={item} />
        <button type="button" className="fox-help__link fox-help__link--ghost" onClick={() => { roll(item.name); track('fox_surprise_again'); }} disabled={Boolean(spin)}>
          <FaDice aria-hidden="true" /> Pick again
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

/* ---- The fox in his medallion -------------------------------------------
   The logo drawing as a vector (src/lib/foxArt.js), framed so the fox —
   hat to rail — is optically centred in the round. The viewBox is in the
   drawing's own pixels: centre (131, 64), radius 90, which clears his hat,
   his cup and the pumpkin with even room all round and lets the rail run
   out under the brass ring like a ledge. Accessories are drawn in the same
   coordinates, so they sit ON him (the nightcap over the top hat, the
   pumpkin on the rail beside him, steam over the cup) and turn with him. */

export const FOX_VIEW = '41 -26 180 180';

/** Striped nightcap pulled down over his top hat, pompom flopping forward. */
function Nightcap() {
  return (
    <g className="fox-acc fox-acc--nightcap" transform="translate(119 -9) scale(1.08) rotate(-4 35 30)">
      <path d="M6 40 C10 22 26 8 44 8 C54 8 60 14 63 24 C58 20 52 20 48 24 C52 30 50 36 44 40 Z" fill="#f7f1e4" stroke="#221f1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 22 L30 40 M30 12 L40 34 M44 9 L49 24" stroke="#7e8c54" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M3 40 Q25 46 47 39" fill="none" stroke="#221f1a" strokeWidth="5" strokeLinecap="round" />
      <path d="M3 40 Q25 46 47 39" fill="none" stroke="#e7ebd6" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="64" cy="28" r="5" fill="#f7f1e4" stroke="#221f1a" strokeWidth="2" />
    </g>
  );
}

/** A small pumpkin in the same line style, sitting on the rail beside him. */
function Pumpkin() {
  return (
    <g className="fox-acc fox-acc--pumpkin" transform="translate(185 92) scale(0.55)">
      <path d="M20 9 C19 5 21 3 24 2" fill="none" stroke="#545f33" strokeWidth="4.4" strokeLinecap="round" />
      <ellipse cx="20" cy="22" rx="17" ry="12" fill="#e9973f" stroke="#191512" strokeWidth="4" />
      <path d="M20 10 C13 14 13 30 20 34 M20 10 C27 14 27 30 20 34 M11 12 C6 17 7 29 12 32 M29 12 C34 17 33 29 28 32" fill="none" stroke="#191512" strokeWidth="2.6" opacity="0.7" />
    </g>
  );
}

export function FoxFigure({ sleepy = false, october = false }) {
  return (
    <svg className="fox-guide__figure" viewBox={FOX_VIEW} aria-hidden="true" focusable="false">
      <path className="fox-guide__ink" d={FOX_PATH} fill="#191512" fillRule="evenodd" />
      {/* steam curling up from his cup (rim at ~x 64–91, y 46) */}
      <g className="fox-guide__steam" fill="none" stroke="#191512" strokeWidth="2.2" strokeLinecap="round">
        <path d="M71 41 C67 36 75 31 71 25" />
        <path d="M78 40 C74 34 83 28 78 20" />
        <path d="M85 41 C81 36 89 31 85 26" />
      </g>
      {october && <Pumpkin />}
      {sleepy && <Nightcap />}
    </svg>
  );
}

/** His bushy tail — tucked behind his medallion, it pops out to wag when petted. */
export function Tail() {
  return (
    <svg className="fox-acc fox-acc--tail" viewBox="0 0 60 40" aria-hidden="true">
      <path d="M2 27 C10 19 24 22 34 14 C41 8 48 3 57 2 C59 10 56 21 46 28 C36 36 18 39 2 34 Z" fill="#f2c08a" stroke="#221f1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M57 2 C58 9 56 16 51 22 C47 16 49 7 57 2 Z" fill="#fffdf7" stroke="#221f1a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 31 C24 30 32 26 39 19 M20 25 C27 24 32 20 36 16" fill="none" stroke="#221f1a" strokeWidth="1.1" opacity="0.45" />
    </svg>
  );
}
