import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../lib/analytics.js';
import { CATEGORIES, LIMITS, checkWish, foxReply, markWished, sendWish, wishedToday } from '../lib/wishes.js';
import '../styles/fox-wish.css';

/* "Make a wish for the menu" — a pane in the fox's card (FoxGuide.jsx, and
   ?fox=wish). The visitor writes a wish; it folds into a paper note and
   drops into the fox's top hat, the hat gives a satisfied wiggle and a
   sparkle, and the fox answers with one of a few lines. One wish a day per
   browser. Rules and anti-spam live in src/lib/wishes.js; the server side
   in supabase/migrations/2026-10-19-wishes.sql.

   Stages: form → fold → drop → thanks (reduced motion: form → thanks).
   Nothing a customer sees ever says "error" because of the database: if
   it's missing or down, the hat still eats the wish. */

export const FOLD_MS = 950;
export const DROP_MS = 1250;

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---- the little drawings ---------------------------------------------- */
const INK = '#2c2722';

function ChipArt({ id }) {
  const common = { fill: 'none', stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (id === 'drink') {
    return (
      <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
        <path d="M5 9 H19 V15 C19 19 16.5 21 12 21 C7.5 21 5 19 5 15 Z" fill="#f7f1e4" {...common} />
        <path d="M19 11 C23.5 11 23.5 16.5 19 16.5" {...common} />
        <path d="M9 6 C8 4.5 10 3.5 9 2 M13.5 6 C12.5 4.5 14.5 3.5 13.5 2" {...common} stroke="#a87c1c" />
        <path d="M9.5 12.5 C10.5 11.3 12 11.6 12 12.6 C12 11.6 13.5 11.3 14.5 12.5 C14.5 14 12 15.4 12 15.4 C12 15.4 9.5 14 9.5 12.5 Z" fill="#b0436e" stroke="none" />
      </svg>
    );
  }
  if (id === 'pastry') {
    return (
      <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
        <path d="M3 16 C4 9 9 6 14 6 C19 6 24 9 25 16 C21 18.5 7 18.5 3 16 Z" fill="#e7c27a" {...common} />
        <path d="M9.5 7.6 C10.5 11 10.5 14 10 17.4 M14 6 V17.9 M18.5 7.6 C17.5 11 17.5 14 18 17.4" {...common} strokeWidth="1.3" />
      </svg>
    );
  }
  if (id === 'food') {
    return (
      <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
        <path d="M4 10 C4 5.5 24 5.5 24 10 Z" fill="#e7c27a" {...common} />
        <path d="M3.5 12.5 C7 10.5 9 14 12.5 12 C16 10 18 14 24.5 12" {...common} stroke="#545f33" strokeWidth="2.2" />
        <path d="M4 14.5 H24" {...common} stroke="#b0436e" strokeWidth="2.2" />
        <path d="M4 17 H24 C24 20 4 20 4 17 Z" fill="#e7c27a" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
      <path d="M14 2.5 L16.2 9.6 L23.5 12 L16.2 14.4 L14 21.5 L11.8 14.4 L4.5 12 L11.8 9.6 Z" fill="#d4ad57" {...common} />
      <path d="M22.5 3.5 V7.5 M20.5 5.5 H24.5" {...common} stroke="#b0436e" />
    </svg>
  );
}

/** The fox's top hat, turned over to take wishes: back of the brim, then
    the note (children), then the crown and the front of the brim over it. */
function WishHat({ children }) {
  return (
    <svg className="fox-wish__hat" viewBox="0 0 140 120" aria-hidden="true" focusable="false">
      <g className="fox-wish__hat-in">
        {/* inside of the hat, seen over the back of the brim */}
        <ellipse cx="70" cy="44" rx="58" ry="13" fill="#3d3630" stroke={INK} strokeWidth="2.4" />
        <ellipse cx="70" cy="45" rx="35" ry="7.5" fill="#1d1916" />
        {children}
        {/* the crown, hanging below the brim */}
        <path d="M35 45 L40 104 C40 110 100 110 100 104 L105 45 C100 51 40 51 35 45 Z" fill={INK} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M38.5 87 C55 92.5 85 92.5 101.5 87 L100.6 97 C84 102 56 102 39.4 97 Z" fill="#d4ad57" />
        <path d="M48 56 L50.5 96" stroke="#5a5048" strokeWidth="2.4" strokeLinecap="round" />
        {/* the front of the brim, over the note's way in */}
        <path d="M12 44 C12 60 128 60 128 44 C128 52 104 57 70 57 C36 57 12 52 12 44 Z" fill="#3d3630" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      </g>
      <g className="fox-wish__sparks" stroke="#d4ad57" strokeWidth="2.6" strokeLinecap="round">
        <path d="M70 6 V18 M64 12 H76" />
        <path d="M26 18 V26 M22 22 H30" stroke="#b0436e" />
        <path d="M114 16 V25 M109.5 20.5 H118.5" />
        <circle cx="96" cy="8" r="2.2" fill="#545f33" stroke="none" />
        <circle cx="42" cy="9" r="1.8" fill="#a87c1c" stroke="none" />
      </g>
    </svg>
  );
}

/** The folded note, as it drops into the hat. */
function DropNote() {
  return (
    <g className="fox-wish__dropnote">
      <g transform="translate(70 14) rotate(-10)">
        <rect x="-13" y="-10" width="26" height="20" rx="1.5" fill="#fffdf7" stroke={INK} strokeWidth="1.8" />
        <path d="M-13 -10 L0 1 L13 -10" fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M-7 5 H5" stroke="#b0436e" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* ---- the pane ------------------------------------------------------------ */
export default function FoxWish({ onDone }) {
  const uid = useId().replace(/:/g, '');
  const [stage, setStage] = useState(() => (wishedToday() ? 'already' : 'form'));
  const [category, setCategory] = useState('drink');
  const [text, setText] = useState('');
  const [why, setWhy] = useState('');
  const [name, setName] = useState('');
  const [honey, setHoney] = useState('');
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const started = useRef(Date.now());
  const timers = useRef([]);
  const refs = { text: useRef(null), why: useRef(null), name: useRef(null) };
  const thanksRef = useRef(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // straight into the wish: focus the text field once the card has settled
  // (the card focuses itself first when it opens)
  useEffect(() => {
    if (stage !== 'form') return undefined;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => refs.text.current?.focus({ preventScroll: true })));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on arrival only
  }, []);
  useEffect(() => {
    if (stage === 'thanks') thanksRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const submit = (e) => {
    e.preventDefault();
    if (wishedToday()) { setStage('already'); return; }
    const r = checkWish({ category, text, why, name, honeypot: honey, elapsedMs: Date.now() - started.current });
    if (!r.ok && !r.silent) {
      setError({ field: r.field, message: r.message });
      requestAnimationFrame(() => refs[r.field]?.current?.focus());
      return;
    }
    setError(null);
    const wish = r.ok ? r.wish : { category, text: text.trim() };
    if (r.ok) {
      sendWish(r.wish); // never throws; the hat eats it either way
      track('wish_submitted', { category: r.wish.category });
    }
    markWished();
    setNote(wish.text);
    setReply(foxReply(wish));
    if (reduced()) { setStage('thanks'); return; }
    setStage('fold');
    timers.current = [
      setTimeout(() => setStage('drop'), FOLD_MS),
      setTimeout(() => setStage('thanks'), FOLD_MS + DROP_MS),
    ];
  };

  const fieldProps = (field, id) => ({
    id,
    'aria-invalid': error?.field === field ? 'true' : undefined,
    'aria-describedby': error?.field === field ? `${uid}-err` : undefined,
  });
  const errorFor = (field) => (error?.field === field
    ? <p className="fox-wish__error" id={`${uid}-err`} role="alert">{error.message}</p> : null);

  if (stage === 'already') {
    return (
      <div className="fox-play fox-wish fox-wish--done" data-testid="fox-wish" data-stage="already">
        <div className="fox-wish__scene fox-wish__scene--small"><WishHat /></div>
        <p className="fox-help__q">Your wish is in the hat</p>
        <p className="fox-help__a">You’ve made today’s wish. You can wish again tomorrow.</p>
        {onDone && <button type="button" className="fox-wish__back" onClick={onDone}>Back to questions</button>}
      </div>
    );
  }

  if (stage === 'thanks') {
    return (
      <div className="fox-play fox-wish fox-wish--done" data-testid="fox-wish" data-stage="thanks">
        <div className="fox-wish__scene fox-wish__scene--small is-settled"><WishHat /></div>
        <p className="fox-help__q" tabIndex={-1} ref={thanksRef}>Into the hat it goes!</p>
        <p className="fox-help__a fox-wish__reply">{reply}</p>
        <p className="fox-wish__again">You can wish again tomorrow.</p>
        {onDone && <button type="button" className="fox-wish__back" onClick={onDone}>Back to questions</button>}
      </div>
    );
  }

  if (stage === 'fold' || stage === 'drop') {
    return (
      <div className={`fox-play fox-wish fox-wish--anim is-${stage}`} data-testid="fox-wish" data-stage={stage} aria-busy="true">
        <p className="sr-only" role="status">Folding your wish into the fox’s hat…</p>
        <div className="fox-wish__scene">
          {stage === 'fold' && (
            <div className="fox-wish__note" aria-hidden="true">
              <span className="fox-wish__note-flap" />
              <span className="fox-wish__note-text">{note}</span>
            </div>
          )}
          <WishHat>{stage === 'drop' ? <DropNote /> : null}</WishHat>
        </div>
      </div>
    );
  }

  return (
    <form className="fox-play fox-wish" data-testid="fox-wish" data-stage="form" onSubmit={submit} noValidate>
      <div className="fox-wish__head">
        <div>
          <p className="fox-help__q" id={`${uid}-title`}>Make a wish for the menu</p>
          <p className="fox-wish__sub">A drink or a treat you’d love to see? I’ll pass it to Tom and Cat.</p>
        </div>
      </div>

      <fieldset className="fox-wish__cats">
        <legend className="fox-wish__label">What kind of wish?</legend>
        <div className="fox-wish__chips">
          {CATEGORIES.map((c) => (
            <label key={c.id} className={`fox-wish__chip${category === c.id ? ' is-on' : ''}`}>
              <input type="radio" name={`${uid}-cat`} value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} />
              <ChipArt id={c.id} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="fox-wish__field">
        <label className="fox-wish__label" htmlFor={`${uid}-text`}>Your wish</label>
        <input ref={refs.text} type="text" className="fox-wish__input" {...fieldProps('text', `${uid}-text`)}
          value={text} maxLength={LIMITS.text} placeholder={cat.placeholder} autoComplete="off" enterKeyHint="next"
          onChange={(e) => { setText(e.target.value); if (error?.field === 'text') setError(null); }} required />
        <span className="fox-wish__count" aria-hidden="true">{text.length}/{LIMITS.text}</span>
        {errorFor('text')}
      </div>

      <div className="fox-wish__field">
        <label className="fox-wish__label" htmlFor={`${uid}-why`}>Why? <span className="fox-wish__opt">(optional)</span></label>
        <input ref={refs.why} type="text" className="fox-wish__input" {...fieldProps('why', `${uid}-why`)}
          value={why} maxLength={LIMITS.why} placeholder="It tastes like my grandma’s kitchen…" autoComplete="off"
          onChange={(e) => { setWhy(e.target.value); if (error?.field === 'why') setError(null); }} />
        {errorFor('why')}
      </div>

      <div className="fox-wish__field fox-wish__field--name">
        <label className="fox-wish__label" htmlFor={`${uid}-name`}>First name <span className="fox-wish__opt">(optional)</span></label>
        <input ref={refs.name} type="text" className="fox-wish__input" {...fieldProps('name', `${uid}-name`)}
          value={name} maxLength={LIMITS.name} autoComplete="given-name"
          onChange={(e) => { setName(e.target.value); if (error?.field === 'name') setError(null); }} />
        {errorFor('name')}
      </div>

      {/* a field people never see: anything typed here is a bot */}
      <div className="fox-wish__hp" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} />
      </div>

      <div className="fox-wish__actions">
        <button type="submit" className="fox-wish__submit">Drop it in the hat</button>
        <p className="fox-wish__fine">No email needed. One wish a day.</p>
      </div>
    </form>
  );
}

/* ---- ways in ---------------------------------------------------------------- */

/** A small top hat with a wish note peeking out, for the buttons. */
function HatIcon() {
  return (
    <svg viewBox="0 0 38 32" aria-hidden="true" focusable="false">
      <g transform="rotate(-8 19 18)">
        <rect x="13" y="3" width="12" height="9" rx="1" fill="#fffdf7" stroke={INK} strokeWidth="1.5" transform="rotate(14 19 8)" />
        <path d="M10 12 H28 L26.5 26 H11.5 Z" fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M11 21 H27 L26.6 24 H11.4 Z" fill="#d4ad57" />
        <path d="M4 27 C10 29.5 28 29.5 34 27" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <path d="M33 4 V9 M30.5 6.5 H35.5" stroke="#b0436e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** The "Make a wish" button in the fox's card. */
export function WishButton({ pressed, onClick }) {
  return (
    <button type="button" className="fox-wish-btn" aria-pressed={pressed} onClick={onClick}>
      <HatIcon />
      <span>Make a wish for the menu<small>A drink or treat you’d love to see?</small></span>
    </button>
  );
}

/** "Wish for something new?" at the bottom of the Menu page: opens the fox
    straight to the wish (the ?fox=wish deep link, which cleans itself up). */
export function MenuWishLink() {
  return (
    <p className="menu-wish">
      <Link className="menu-wish__link" to="?fox=wish&src=menu">
        <HatIcon />
        Wish for something new?
      </Link>
    </p>
  );
}
