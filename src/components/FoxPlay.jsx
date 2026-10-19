import { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowUpRightFromSquare, FaDice, FaMedal, FaRotateRight } from 'react-icons/fa6';
import { CoffeeCup } from './Motifs.jsx';
import { orderUrlFor, orderLabelFor } from '../lib/order.js';
import { productImageSources, isCutout } from '../lib/productImage.js';
import { track } from '../lib/analytics.js';
import { QUIZ, closedOrderNote, fmtPrice, matchDrink, pickSurprise } from '../lib/foxFun.js';

/* The fox's games — the panes that show in his help card's answer area
   (FoxGuide.jsx), plus the little accessories he wears. Rules live in
   src/lib/foxFun.js; these only draw them. All motion is CSS (fox-guide.css)
   and stops under prefers-reduced-motion; the JS shuffle checks it too. */

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A menu item's photo (own image → drop-in file), or a drawn cup. */
export function DrinkPhoto({ item }) {
  const [i, setI] = useState(0);
  const sources = productImageSources(item);
  const src = sources[i];
  useEffect(() => setI(0), [item?.name]);
  if (!src) {
    return <span className="fox-drink__photo is-motif" aria-hidden="true"><CoffeeCup size={40} color="var(--color-yellow-deep)" steam={false} /></span>;
  }
  return (
    <span className={`fox-drink__photo${isCutout(src) ? ' is-cutout' : ''}`}>
      <img src={src} alt="" onError={() => setI((n) => n + 1)} />
    </span>
  );
}

function OrderLink({ item }) {
  return (
    <a className="fox-help__link" href={orderUrlFor(item)} target="_blank" rel="noopener noreferrer" aria-label={orderLabelFor(item)}
      onClick={() => track('order_now_click', { location: 'fox', item: item.name })}>
      Order <FaArrowUpRightFromSquare aria-hidden="true" />
    </a>
  );
}

/** Photo + name + real price + (after hours) when they can order it. */
function DrinkCard({ item, note, shuffling = false, label }) {
  return (
    <div className="fox-drink">
      <DrinkPhoto item={item} />
      <div className="fox-drink__info">
        {label && <p className="fox-help__q">{label}</p>}
        <p className={`fox-drink__name${shuffling ? ' is-shuffling' : ''}`}>{item.name}</p>
        <p className="fox-drink__price">{fmtPrice(item.price)}</p>
      </div>
      {note && <p className="fox-drink__note">{note}</p>}
    </div>
  );
}

/* ---- Surprise me ------------------------------------------------------- */
export function SurprisePane({ menu, hours, overrides }) {
  const [item, setItem] = useState(null);
  const [shuffling, setShuffling] = useState(false);
  const timer = useRef(0);

  const roll = (not) => {
    const final = pickSurprise(menu, { not });
    if (!final) { setItem(null); return; }
    clearInterval(timer.current);
    if (reduced()) { setItem(final); return; }
    // a quick slot-machine shuffle through real drinks, then he lands on one
    let n = 0;
    setShuffling(true);
    timer.current = setInterval(() => {
      n += 1;
      if (n >= 7) {
        clearInterval(timer.current);
        setShuffling(false);
        setItem(final);
      } else {
        setItem(pickSurprise(menu) || final);
      }
    }, 70);
  };

  useEffect(() => {
    roll(null);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one roll on open
  }, []);

  if (!item) return <p className="fox-help__a">Hmm, I can’t see any drinks on the menu right now.</p>;
  return (
    <div className="fox-play" data-testid="fox-surprise">
      <DrinkCard item={item} shuffling={shuffling} label="The fox picks…" note={shuffling ? null : closedOrderNote(hours, overrides)} />
      <p className="fox-help__links">
        <OrderLink item={item} />
        <button type="button" className="fox-help__link fox-help__link--ghost" onClick={() => { roll(item.name); track('fox_surprise_again'); }} disabled={shuffling}>
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

/* ---- Pick-a-drink quiz --------------------------------------------------- */
export function QuizPane({ menu, hours, overrides }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const heading = useRef(null);

  // keyboard users stay with the quiz: focus moves to each new question
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, result]);

  const choose = (value) => {
    const q = QUIZ[step];
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < QUIZ.length - 1) { setStep(step + 1); return; }
    setResult(matchDrink(menu, next));
    track('fox_quiz_done', next);
  };
  const restart = () => { setAnswers({}); setStep(0); setResult(null); };

  if (result !== null) {
    if (!result) return <p className="fox-help__a">Hmm, I can’t see any drinks on the menu right now.</p>;
    const honest = result.exact ? null : `Nothing on today’s menu ticks all three, so here’s the closest: ${result.misses.join(', and ')}.`;
    return (
      <div className="fox-play" data-testid="fox-quiz-result">
        <h3 className="sr-only" tabIndex={-1} ref={heading}>Your drink</h3>
        <DrinkCard item={result.item} label={result.exact ? 'Your drink' : 'Closest match'} note={[honest, closedOrderNote(hours, overrides)].filter(Boolean).join(' ')} />
        <p className="fox-help__links">
          <OrderLink item={result.item} />
          <button type="button" className="fox-help__link fox-help__link--ghost" onClick={restart}><FaRotateRight aria-hidden="true" /> Try again</button>
        </p>
      </div>
    );
  }

  const q = QUIZ[step];
  return (
    <div className="fox-play fox-quiz" data-testid="fox-quiz">
      <div className="fox-quiz__top">
        {step > 0 ? (
          <button type="button" className="fox-quiz__back" onClick={() => setStep(step - 1)}><FaArrowLeft aria-hidden="true" /> Back</button>
        ) : <span className="fox-help__q">Pick my drink</span>}
        <span className="fox-quiz__dots" role="img" aria-label={`Question ${step + 1} of ${QUIZ.length}`}>
          {QUIZ.map((x, i) => <i key={x.id} className={i < step ? 'is-done' : i === step ? 'is-now' : ''} />)}
        </span>
      </div>
      <h3 className="fox-quiz__q" tabIndex={-1} ref={heading} key={q.id}>{q.q}</h3>
      <div className="fox-quiz__choices">
        {q.options.map((o) => (
          <button key={o.value} type="button" className="fox-quiz__choice" aria-pressed={answers[q.id] === o.value} onClick={() => choose(o.value)}>
            {o.label}
          </button>
        ))}
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

/* ---- Accessories (overlays on the existing drawing, not a redraw) ------- */

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

/** His bushy tail — tucked behind his sticker, it pops out to wag when petted. */
export function Tail() {
  return (
    <svg className="fox-acc fox-acc--tail" viewBox="0 0 60 40" aria-hidden="true">
      <path d="M2 27 C10 19 24 22 34 14 C41 8 48 3 57 2 C59 10 56 21 46 28 C36 36 18 39 2 34 Z" fill="#f2c08a" stroke="#221f1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M57 2 C58 9 56 16 51 22 C47 16 49 7 57 2 Z" fill="#fffdf7" stroke="#221f1a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 31 C24 30 32 26 39 19 M20 25 C27 24 32 20 36 16" fill="none" stroke="#221f1a" strokeWidth="1.1" opacity="0.45" />
    </svg>
  );
}
