import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowLeft, LuCheck, LuCoffee, LuCroissant, LuSandwich, LuSparkles, LuWandSparkles } from 'react-icons/lu';
import { track } from '../lib/analytics.js';
import { CATEGORIES, LIMITS, checkWish, foxReply, markWished, sendWish, wishedToday } from '../lib/wishes.js';
import '../styles/fox-wish.css';

/* "Make a wish for the menu" — a pane in the fox's card (FoxGuide.jsx, and
   ?fox=wish). The visitor writes a wish on a little paper note; it folds in
   two, arcs into the fox's top hat, the hat swallows it (squash, stretch, a
   wiggle) and a small burst of gold and blush sparkles pops out, then the
   fox answers. One wish a day per browser. Rules and anti-spam live in
   src/lib/wishes.js; the server side in supabase/migrations/2026-10-19-wishes.sql.

   One timeline, started on submit (all CSS, transform + opacity only,
   fox-wish.css): fold 0–0.7s, flight 0.7–1.25s, swallow + sparkles to
   ~1.9s, then the thank-you rises in (2.0s). `data-stage` follows it:
   form → fold → drop → thanks. Reduced motion: form → thanks, a quick fade
   with the hat and sparkles still.

   Icons are Lucide (react-icons/lu), the same family as the admin. Nothing
   a customer sees ever says "error" because of the database: if it's
   missing or down, the hat still eats the wish. */

export const FOLD_MS = 700;
export const DROP_MS = 1300;

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const CHIP_ICONS = { drink: LuCoffee, pastry: LuCroissant, food: LuSandwich, other: LuSparkles };

/* ---- the hat ------------------------------------------------------------------
   The shop's top hat (ink, raspberry band with a gold edge), turned over to
   take wishes. Two layers so the note can drop BETWEEN them: the back (brim
   and the dark opening) under the note, the front (the crown and the near
   lip of the brim) over it. Both carry the same squash/wiggle animation, so
   they move as one. viewBox 0 0 160 120; the opening is centred at (80, 40). */
const INK = '#2c2722';
const INK_TOP = '#3d3630';

function HatBack() {
  return (
    <svg className="fox-wish__hat fox-wish__hat--back" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <ellipse className="fox-wish__hat-shadow" cx="80" cy="113" rx="44" ry="5.5" />
      <ellipse cx="80" cy="40" rx="62" ry="13" fill={INK_TOP} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="80" cy="40" rx="38" ry="8" fill="#14110e" />
      <path d="M44 38.5 A36 6.5 0 0 1 116 38.5" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="3" />
    </svg>
  );
}

function HatFront() {
  return (
    <svg className="fox-wish__hat fox-wish__hat--front" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      {/* the near half of the brim, with the opening cut out of it */}
      <path fillRule="evenodd" fill={INK_TOP} stroke={INK} strokeWidth="2.2" strokeLinejoin="round"
        d="M18 40 A62 13 0 0 0 142 40 L118 40 A38 8 0 0 1 42 40 Z" />
      {/* the crown, hanging below the brim; its top edge is the opening's near rim */}
      <path fill={INK} stroke={INK} strokeWidth="2.2" strokeLinejoin="round"
        d="M42 40 A38 8 0 0 0 118 40 L115.5 103 A35.5 7 0 0 1 44.5 103 Z" />
      {/* the band, just under the brim */}
      <path fill="#b0436e" d="M42.6 52 A37.4 8 0 0 0 117.4 52 L116.9 64 A36.9 8 0 0 1 43.1 64 Z" />
      <path fill="none" stroke="#d4ad57" strokeWidth="1.6" d="M43.1 64 A36.9 8 0 0 0 116.9 64" />
      {/* a soft sheen */}
      <path fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="5" strokeLinecap="round" d="M56 70 L57.5 98" />
      <path fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.6" strokeLinecap="round" d="M30 47 C48 53 66 54.5 80 54.5" />
    </svg>
  );
}

const SPARKS = [
  [-58, -46, 'gold'], [-30, -70, 'blush'], [0, -82, 'gold'], [30, -70, 'gold'],
  [58, -46, 'blush'], [-76, -12, 'gold'], [76, -12, 'gold'], [-44, -88, 'dot'], [44, -88, 'dot'],
];

/** The hat, the note and the sparkles. `stage`: 'anim' | 'still'. */
function WishScene({ stage, note, name }) {
  const anim = stage === 'anim';
  return (
    <div className={`fox-wish__scene${anim ? ' is-anim' : ' is-still'}`} aria-hidden="true">
      <HatBack />
      {anim && (
        <div className="fox-wish__fly">
          <div className="fox-wish__fly-y">
            <div className="fox-wish__note">
              <div className="fox-wish__note-top">
                <span className="fox-wish__note-text">{note}</span>
              </div>
              <div className="fox-wish__note-bottom">
                <div className="fox-wish__note-face">{name ? `— ${name}` : ''}</div>
                <div className="fox-wish__note-back" />
              </div>
              <span className="fox-wish__note-crease" />
            </div>
          </div>
        </div>
      )}
      <HatFront />
      <span className="fox-wish__sparks">
        {SPARKS.map(([x, y, kind], i) => (
          <i key={`${x},${y}`} className={`fox-wish__spark fox-wish__spark--${kind}`} style={{ '--x': `${x}px`, '--y': `${y}px`, '--i': i }} />
        ))}
      </span>
    </div>
  );
}

/* ---- the pane --------------------------------------------------------------------- */
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
  const [note, setNote] = useState({ text: '', name: '' });
  const [pressed, setPressed] = useState(false);
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
    if (stage !== 'thanks') return;
    thanksRef.current?.focus({ preventScroll: true });
    try { if (!reduced()) window.navigator?.vibrate?.(10); } catch { /* no vibration: fine */ }
  }, [stage]);

  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const near = text.length >= LIMITS.text - 10;

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
    const wish = r.ok ? r.wish : { category, text: text.trim(), name: '' };
    if (r.ok) {
      sendWish(r.wish); // never throws; the hat eats it either way
      track('wish_submitted', { category: r.wish.category });
    }
    markWished();
    setNote({ text: wish.text, name: wish.name || '' });
    setReply(foxReply(wish));
    if (reduced()) { setStage('thanks'); return; }
    // the button presses down first, then the note takes over
    setPressed(true);
    timers.current = [
      setTimeout(() => setStage('fold'), 130),
      setTimeout(() => setStage('drop'), 130 + FOLD_MS),
      setTimeout(() => setStage('thanks'), 130 + FOLD_MS + DROP_MS),
    ];
  };

  const fieldProps = (field, id) => ({
    id,
    'aria-invalid': error?.field === field ? 'true' : undefined,
    'aria-describedby': error?.field === field ? `${uid}-err` : undefined,
  });
  const errorFor = (field) => (error?.field === field
    ? <p className="fox-wish__error" id={`${uid}-err`} role="alert">{error.message}</p> : null);

  if (stage === 'already' || stage === 'thanks') {
    const thanks = stage === 'thanks';
    return (
      <div className={`fox-play fox-wish fox-wish--done${thanks && note.text ? ' is-fresh' : ''}`} data-testid="fox-wish" data-stage={stage}>
        <WishScene stage="still" />
        <div className="fox-wish__words">
          <p className="fox-help__q fox-wish__kicker" tabIndex={thanks ? -1 : undefined} ref={thanks ? thanksRef : undefined}>
            <LuSparkles aria-hidden="true" />{thanks ? 'Into the hat it goes!' : 'Your wish is in the hat'}
          </p>
          <p className="fox-help__a fox-wish__reply">{thanks ? reply : 'You’ve made today’s wish.'}</p>
          <p className="fox-wish__again">You can wish again tomorrow.</p>
          {onDone && (
            <button type="button" className="fox-wish__back" onClick={onDone}>
              <LuArrowLeft aria-hidden="true" /> Back to questions
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'fold' || stage === 'drop') {
    return (
      <div className="fox-play fox-wish fox-wish--anim" data-testid="fox-wish" data-stage={stage} aria-busy="true">
        <p className="sr-only" role="status">Folding your wish into the fox’s hat…</p>
        <WishScene stage="anim" note={note.text} name={note.name} />
      </div>
    );
  }

  return (
    <form className="fox-play fox-wish fox-wish--form" data-testid="fox-wish" data-stage="form" onSubmit={submit} noValidate>
      <div className="fox-wish__paper">
        <div className="fox-wish__head">
          <p className="fox-help__q" id={`${uid}-title`}>Make a wish for the menu</p>
          <p className="fox-wish__sub">A drink or a treat you’d love to see? I’ll pass it to Tom and Cat.</p>
        </div>

        <fieldset className="fox-wish__cats">
          <legend className="fox-wish__label">What kind of wish?</legend>
          <div className="fox-wish__chips">
            {CATEGORIES.map((c) => {
              const Icon = CHIP_ICONS[c.id];
              const on = category === c.id;
              return (
                <label key={c.id} className={`fox-wish__chip${on ? ' is-on' : ''}`}>
                  <input type="radio" name={`${uid}-cat`} value={c.id} checked={on} onChange={() => setCategory(c.id)} />
                  <Icon className="fox-wish__chip-ico" aria-hidden="true" />
                  <span>{c.label}</span>
                  {on && <span className="fox-wish__chip-check" aria-hidden="true"><LuCheck /></span>}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="fox-wish__field">
          <div className="fox-wish__labelrow">
            <label className="fox-wish__label" htmlFor={`${uid}-text`}>Your wish</label>
            <span className={`fox-wish__count${near ? ' is-near' : ''}`} aria-hidden="true">{text.length}/{LIMITS.text}</span>
          </div>
          <input ref={refs.text} type="text" className="fox-wish__input" {...fieldProps('text', `${uid}-text`)}
            value={text} maxLength={LIMITS.text} placeholder={cat.placeholder} autoComplete="off" enterKeyHint="next"
            onChange={(e) => { setText(e.target.value); if (error?.field === 'text') setError(null); }} required />
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
          <button type="submit" className={`fox-wish__submit${pressed ? ' is-pressed' : ''}`} disabled={pressed}>
            <LuWandSparkles aria-hidden="true" /> Drop it in the hat
          </button>
          <p className="fox-wish__fine">No email needed. One wish a day.</p>
        </div>
      </div>
    </form>
  );
}

/* ---- ways in ---------------------------------------------------------------- */

/** The "Make a wish" button in the fox's card. */
export function WishButton({ pressed, onClick }) {
  return (
    <button type="button" className="fox-wish-btn" aria-pressed={pressed} onClick={onClick}>
      <span className="fox-wish-btn__ico" aria-hidden="true"><LuWandSparkles /></span>
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
        <LuWandSparkles aria-hidden="true" />
        Wish for something new?
      </Link>
    </p>
  );
}
