import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowLeft, LuCheck, LuCoffee, LuCroissant, LuMessageSquarePlus, LuPenLine, LuSandwich, LuSparkles, LuWandSparkles } from 'react-icons/lu';
import { track } from '../lib/analytics.js';
import { CATEGORIES, LIMITS, checkWish, foxReply, markWished, sendWish, wishedToday } from '../lib/wishes.js';
import '../styles/fox-wish.css';

/* "Make a wish for the menu" — ONE flow, shown in a few places:

     variant 'card'   the fox's card (FoxGuide.jsx, ?fox=wish). The card's
                      header carries the title and the way back; this is just
                      the form, then the hat scene in its place.
     variant 'split'  a page or a page block: the /wish page (WishPage.jsx),
                      the end of the Menu page, and the "Wish list" CMS
                      section (sections/WishListSection.jsx). The words and a
                      big top hat sit on one side, the form on the other (one
                      column on phones), and the note flies into THAT hat.

   Every variant runs the same rules and the same submit: checkWish(), the
   honeypot and ~3s minimum, sendWish() (the submit_wish RPC),
   track('wish_submitted', { category }), and one wish a day per browser
   (wishedToday / markWished). Rules and anti-spam live in src/lib/wishes.js;
   the server side in supabase/migrations/2026-10-19-wishes.sql.

   The visitor writes the wish on a little paper note. On submit it folds in
   two, arcs into the top hat, the hat swallows it (squash, stretch, a
   wiggle) and a small burst of gold and blush sparkles pops out, then the
   fox answers. One timeline, all CSS, transform + opacity only
   (fox-wish.css): fold 0–0.7s, flight 0.7–1.25s, swallow + sparkles to
   ~1.9s, then the thank-you rises in. `data-stage` follows it:
   form → fold → drop → thanks. Reduced motion: form → thanks, a quick fade
   with the hat and sparkles still.

   The "why" and first-name fields stay folded behind two small buttons
   ("Say why", "Sign it") so the form is short. Icons are Lucide
   (react-icons/lu), the same family as the admin. Nothing a customer sees
   ever says "error" because of the database: if it's missing or down, the
   hat still eats the wish. */

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

/** The hat, the note and the sparkles. `stage`: 'anim' | 'still'.
    `fixed`: the scene keeps its full height at rest (the split layouts,
    where the same hat waits for the note). */
function WishScene({ stage, note, name, fixed = false }) {
  const anim = stage === 'anim';
  return (
    <div className={`fox-wish__scene${anim ? ' is-anim' : ' is-still'}${fixed ? ' is-fixed' : ''}`} aria-hidden="true">
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

/** The wish hat at rest, as a small illustration (the 404 page). */
export function WishHat({ className = '' }) {
  return (
    <span className={`fox-wish wish-hat ${className}`.trim()}>
      <WishScene stage="still" />
    </span>
  );
}

/* ---- the state machine (shared by every variant) ------------------------- */
function useWish({ focusOnArrival }) {
  const [stage, setStage] = useState(() => (wishedToday() ? 'already' : 'form'));
  const [category, setCategory] = useState('drink');
  const [text, setText] = useState('');
  const [why, setWhy] = useState('');
  const [name, setName] = useState('');
  const [honey, setHoney] = useState('');
  const [open, setOpen] = useState({ why: false, name: false });
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState({ text: '', name: '' });
  const [pressed, setPressed] = useState(false);
  const started = useRef(Date.now());
  const timers = useRef([]);
  const refs = { text: useRef(null), why: useRef(null), name: useRef(null) };
  const thanksRef = useRef(null);
  const sceneRef = useRef(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // the card goes straight into the wish: focus the text field once the card
  // has settled (the card focuses itself first when it opens)
  useEffect(() => {
    if (!focusOnArrival || stage !== 'form') return undefined;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => refs.text.current?.focus({ preventScroll: true })));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on arrival only
  }, []);
  useEffect(() => {
    if (stage !== 'thanks') return;
    thanksRef.current?.focus({ preventScroll: true });
    try { if (!reduced()) window.navigator?.vibrate?.(10); } catch { /* no vibration: fine */ }
  }, [stage]);

  const reveal = (field) => {
    setOpen((o) => ({ ...o, [field]: true }));
    requestAnimationFrame(() => refs[field].current?.focus());
  };

  const submit = (e) => {
    e.preventDefault();
    if (wishedToday()) { setStage('already'); return; }
    const r = checkWish({ category, text, why, name, honeypot: honey, elapsedMs: Date.now() - started.current });
    if (!r.ok && !r.silent) {
      setError({ field: r.field, message: r.message });
      if (r.field !== 'text') setOpen((o) => ({ ...o, [r.field]: true }));
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
    // the hat must be on screen to catch the note (a phone may have scrolled
    // down to the button)
    const hat = sceneRef.current;
    if (hat?.getBoundingClientRect) {
      const r2 = hat.getBoundingClientRect();
      if (r2.top < 0 || r2.bottom > window.innerHeight) hat.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
    // the button presses down first, then the note takes over
    setPressed(true);
    timers.current = [
      setTimeout(() => setStage('fold'), 130),
      setTimeout(() => setStage('drop'), 130 + FOLD_MS),
      setTimeout(() => setStage('thanks'), 130 + FOLD_MS + DROP_MS),
    ];
  };

  return {
    stage, category, setCategory, text, setText, why, setWhy, name, setName, honey, setHoney,
    open, reveal, error, setError, reply, note, pressed, refs, thanksRef, sceneRef, submit,
  };
}

/* ---- the form ------------------------------------------------------------ */
function WishForm({ w, uid, disabled = false }) {
  const cat = CATEGORIES.find((c) => c.id === w.category) || CATEGORIES[0];
  const near = w.text.length >= LIMITS.text - 10;
  const fieldProps = (field, id) => ({
    id,
    'aria-invalid': w.error?.field === field ? 'true' : undefined,
    'aria-describedby': w.error?.field === field ? `${uid}-err` : undefined,
  });
  const errorFor = (field) => (w.error?.field === field
    ? <p className="fox-wish__error" id={`${uid}-err`} role="alert">{w.error.message}</p> : null);
  const change = (field, set) => (e) => { set(e.target.value); if (w.error?.field === field) w.setError(null); };

  return (
    <form className="fox-wish__form" onSubmit={w.submit} noValidate aria-label="Make a wish for the menu" inert={disabled ? '' : undefined}>
      <fieldset className="fox-wish__cats">
        <legend className="fox-wish__label">What kind of wish?</legend>
        <div className="fox-wish__chips">
          {CATEGORIES.map((c) => {
            const Icon = CHIP_ICONS[c.id];
            const on = w.category === c.id;
            return (
              <label key={c.id} className={`fox-wish__chip${on ? ' is-on' : ''}`}>
                <input type="radio" name={`${uid}-cat`} value={c.id} checked={on} onChange={() => w.setCategory(c.id)} />
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
          <span className={`fox-wish__count${near ? ' is-near' : ''}`} aria-hidden="true">{w.text.length}/{LIMITS.text}</span>
        </div>
        {/* the note itself: a strip of ruled paper you write on */}
        <div className="fox-wish__notefield">
          <input ref={w.refs.text} type="text" className="fox-wish__input fox-wish__input--note" {...fieldProps('text', `${uid}-text`)}
            value={w.text} maxLength={LIMITS.text} placeholder={cat.placeholder} autoComplete="off" enterKeyHint="send"
            onChange={change('text', w.setText)} required />
        </div>
        {errorFor('text')}
      </div>

      {w.open.why && (
        <div className="fox-wish__field">
          <label className="fox-wish__label" htmlFor={`${uid}-why`}>Why you’d love it <span className="fox-wish__opt">(optional)</span></label>
          <input ref={w.refs.why} type="text" className="fox-wish__input" {...fieldProps('why', `${uid}-why`)}
            value={w.why} maxLength={LIMITS.why} placeholder="It tastes like my grandma’s kitchen…" autoComplete="off"
            onChange={change('why', w.setWhy)} />
          {errorFor('why')}
        </div>
      )}
      {w.open.name && (
        <div className="fox-wish__field fox-wish__field--name">
          <label className="fox-wish__label" htmlFor={`${uid}-name`}>First name <span className="fox-wish__opt">(optional)</span></label>
          <input ref={w.refs.name} type="text" className="fox-wish__input" {...fieldProps('name', `${uid}-name`)}
            value={w.name} maxLength={LIMITS.name} autoComplete="given-name"
            onChange={change('name', w.setName)} />
          {errorFor('name')}
        </div>
      )}
      {!(w.open.why && w.open.name) && (
        <div className="fox-wish__extras">
          {!w.open.why && (
            <button type="button" className="fox-wish__extra" aria-expanded="false" onClick={() => w.reveal('why')}>
              <LuMessageSquarePlus aria-hidden="true" /> Say why
            </button>
          )}
          {!w.open.name && (
            <button type="button" className="fox-wish__extra" aria-expanded="false" onClick={() => w.reveal('name')}>
              <LuPenLine aria-hidden="true" /> Sign it
            </button>
          )}
        </div>
      )}

      {/* a field people never see: anything typed here is a bot */}
      <div className="fox-wish__hp" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={w.honey} onChange={(e) => w.setHoney(e.target.value)} />
      </div>

      <div className="fox-wish__actions">
        <button type="submit" className={`fox-wish__submit${w.pressed ? ' is-pressed' : ''}`} disabled={w.pressed}>
          <LuWandSparkles aria-hidden="true" /> Drop it in the hat
        </button>
        <p className="fox-wish__fine">No email needed.<br />One wish a day.</p>
      </div>
    </form>
  );
}

/* ---- the words after (thank-you, or "already wished today") --------------- */
function WishWords({ w, onDone, doneLabel, after }) {
  const thanks = w.stage === 'thanks';
  return (
    <div className="fox-wish__words">
      <p className="fox-wish__kicker" tabIndex={thanks ? -1 : undefined} ref={thanks ? w.thanksRef : undefined}>
        <LuSparkles aria-hidden="true" />{thanks ? 'Into the hat it goes!' : 'Your wish is in the hat'}
      </p>
      <p className="fox-wish__reply">{thanks ? w.reply : 'You’ve made today’s wish.'}</p>
      <p className="fox-wish__again">You can wish again tomorrow.</p>
      {onDone && (
        <button type="button" className="fox-wish__back" onClick={onDone}>
          <LuArrowLeft aria-hidden="true" /> {doneLabel}
        </button>
      )}
      {after}
    </div>
  );
}

/**
 * The wish flow. Props:
 *   variant  'card' (the fox's card) | 'split' (a page or page block)
 *   intro    split only: the heading and a line, shown beside the hat
 *   onDone   card only: "Back to questions" after the thank-you
 *   after    split only: something to offer after the thank-you (a link)
 *   className  added to the outer element
 */
export function WishFlow({ variant = 'card', intro = null, onDone, doneLabel = 'Back to questions', after = null, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const w = useWish({ focusOnArrival: variant === 'card' });
  // in the card, the hat scene and the thank-you keep the form's height, so
  // the card doesn't jump when the form goes
  const boxRef = useRef(null);
  const lockH = useRef(0);
  const submit = (e) => {
    if (variant === 'card' && boxRef.current) lockH.current = boxRef.current.offsetHeight;
    w.submit(e);
  };
  const wf = { ...w, submit };
  const lock = lockH.current ? { minHeight: `${lockH.current}px` } : undefined;
  const done = w.stage === 'already' || w.stage === 'thanks';
  const flying = w.stage === 'fold' || w.stage === 'drop';
  const fresh = w.stage === 'thanks' && Boolean(w.note.text);
  const status = flying ? <p className="sr-only" role="status">Folding your wish into the hat…</p> : null;

  if (variant === 'split') {
    return (
      <div
        className={`fox-wish fox-wish--split${done ? ' fox-wish--done' : ''}${fresh ? ' is-fresh' : ''} ${className}`.trim()}
        data-testid="fox-wish" data-stage={w.stage} aria-busy={flying ? 'true' : undefined}>
        {intro && <div className="fox-wish__intro">{intro}</div>}
        <div className="fox-wish__stage" ref={w.sceneRef}>
          <WishScene stage={flying ? 'anim' : 'still'} note={w.note.text} name={w.note.name} fixed />
        </div>
        <div className="fox-wish__main">
          {status}
          {done ? <WishWords w={w} after={after} /> : <WishForm w={wf} uid={uid} disabled={flying} />}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`fox-play fox-wish fox-wish--card fox-wish--done${fresh ? ' is-fresh' : ''} ${className}`.trim()} data-testid="fox-wish" data-stage={w.stage} style={lock}>
        <WishScene stage="still" />
        <WishWords w={w} onDone={onDone} doneLabel={doneLabel} />
      </div>
    );
  }

  if (flying) {
    return (
      <div className={`fox-play fox-wish fox-wish--card fox-wish--anim ${className}`.trim()} data-testid="fox-wish" data-stage={w.stage} aria-busy="true" style={lock}>
        {status}
        <WishScene stage="anim" note={w.note.text} name={w.note.name} />
      </div>
    );
  }

  return (
    <div ref={boxRef} className={`fox-play fox-wish fox-wish--card fox-wish--form ${className}`.trim()} data-testid="fox-wish" data-stage="form">
      <WishForm w={wf} uid={uid} />
    </div>
  );
}

/** The wish pane in the fox's card. */
export default function FoxWish({ onDone }) {
  return <WishFlow variant="card" onDone={onDone} />;
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

/** The wish as a page block: a section with a heading and a line beside the
    hat. Used at the end of the Menu page and by the "Wish list" CMS section. */
export function WishSection({ heading, intro, headingId, className = '', after = null }) {
  const uid = useId().replace(/:/g, '');
  const hid = headingId || `${uid}-wish-h`;
  return (
    <section className={`section wish-section ${className}`.trim()} aria-labelledby={hid}>
      <div className="container">
        <WishFlow
          variant="split"
          after={after}
          intro={(
            <>
              <h2 className="wish-section__title" id={hid}>{heading}</h2>
              {intro && <p className="wish-section__lede">{intro}</p>}
            </>
          )}
        />
      </div>
    </section>
  );
}

/** The end of the Menu page: "Don't see your favorite?" and the wish, right
    there (the old "Wish for something new?" link opened the fox instead). */
export function MenuWish() {
  return (
    <WishSection
      className="wish-section--menu"
      heading="Don’t see your favorite?"
      intro="Make a wish for the menu. Tom and Cat read every one."
    />
  );
}

/** A small hat moment (the 404 page): the hat at rest and a link to /wish. */
export function WishNudge({ children = 'Make a wish for the menu', lead = null }) {
  return (
    <div className="wish-nudge">
      <WishHat className="wish-nudge__hat" />
      <span className="wish-nudge__words">
        {lead && <span className="wish-nudge__lead">{lead}</span>}
        <Link className="wish-nudge__link" to="/wish">
          <LuWandSparkles aria-hidden="true" />{children}
        </Link>
      </span>
    </div>
  );
}
