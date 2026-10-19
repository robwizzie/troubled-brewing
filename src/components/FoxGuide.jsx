import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaArrowUpRightFromSquare, FaCakeCandles, FaCat, FaCircleQuestion, FaEyeSlash, FaGhost, FaHeart, FaLightbulb, FaMedal, FaSnowflake, FaStar, FaWandMagicSparkles, FaXmark } from 'react-icons/fa6';
import { track } from '../lib/analytics.js';
import { orderUrlFor } from '../lib/order.js';
import { SITE } from '../lib/seed.js';
import { getEvents, getGoogleProfile, getHours, getHoursOverrides, getSections } from '../lib/dataService.js';
import { getMenu } from '../lib/menuService.js';
import { googleWeekly, shopNow } from '../lib/hours.js';
import { findSection, foxAnswers, hoursAnswer, plainText } from '../lib/foxHelp.js';
import { QUIPS, foxToday, specialDay } from '../lib/foxDays.js';
import { QUICK_MS, backLine, dailyFact, foxMood, registerTap } from '../lib/foxFun.js';
import { AwardPane, FactPane, FoxArt, Nightcap, Pumpkin, QuizPane, SurpriseIcon, SurprisePane, Tail } from './FoxPlay.jsx';
import FoxOutfit, { FoxOutfitLine } from './FoxOutfit.jsx'; // fox-outfits
import FoxUsual from './FoxUsual.jsx'; // fox-outfits
import useFoxOutfit from '../lib/useFoxOutfit.js'; // fox-outfits

/* The Trouble Brewing fox — the dapper top-hatted fox from the logo, cup in
   hand (public/images/brand/fox-sipping.png). He's the logo fox, so no
   spectacles — those belong to the gold fox-head on the wall.

   Tap him and a small help card opens beside him (a bottom sheet on phones)
   with the questions visitors actually ask. Every answer comes from the
   site's own data — live hours, the address, the SpotOn link, the menu's
   flags, the Location page's parking copy… — see src/lib/foxHelp.js for the
   source of each. Anything he can't answer goes to /contact.

   He can be hidden (from the card, or the little × on him) and brought back
   from the paw tab he leaves at the edge; that choice is remembered.

   Life: he peeks up and waves the first time you visit, sips from his cup
   now and then (steam curls up), turns to face your pointer, hops when
   tapped, and on special days wears a little badge and says so. Once a visit
   he offers one of the sourced QUIPS. One motion at a time — a wave or hop
   replaces the sip while it plays — and prefers-reduced-motion stills all of
   it (CSS), leaving only the words.

   Games and moods (rules in src/lib/foxFun.js, panes in FoxPlay.jsx):
   "Surprise me" pours a real available drink into its cup;
   "Pick my drink" is a short quiz (only the questions that narrow today's
   menu, each skippable) ending in a match + two runner-ups that can be
   fine-tuned; "Fox fact" changes daily (a dot on him until you've seen
   it). By the shop's clock he's sleepy in a nightcap when it's closed (with
   the real next opening), has a fresh steaming cup in the morning, and sits
   by a pumpkin all October. Pet him (quick taps) and his tail wags; every
   10th tap is a little celebration, and the first earns the Trouble-maker
   badge in his card's header. */

const SEEN_KEY = 'tb-fox-day'; // special-day line already said today
const HIDDEN_KEY = 'tb-fox-hidden'; // '1' = the visitor sent him away
const MET_KEY = 'tb-fox-met'; // '1' = the first-visit hello has happened
const QUIP_I_KEY = 'tb-fox-quip'; // which quip is next (localStorage)
const QUIPPED_KEY = 'tb-fox-quipped'; // already offered a quip this visit (sessionStorage)
const FACT_SEEN_KEY = 'tb-fox-fact-seen'; // shop date of the last daily fact opened
const PETS_KEY = 'tb-fox-pets'; // { total, badge }: taps ever, and the Trouble-maker badge

const store = {
  get(s, k) { try { return window[s].getItem(k); } catch { return null; } },
  set(s, k, v) { try { window[s].setItem(k, v); } catch { /* private mode: fine */ } },
  del(s, k) { try { window[s].removeItem(k); } catch { /* fine */ } },
};

const readPets = () => {
  try {
    const v = JSON.parse(store.get('localStorage', PETS_KEY) || '{}');
    return { recent: [], total: Number(v.total) || 0, badge: Boolean(v.badge) };
  } catch {
    return { recent: [], total: 0, badge: false };
  }
};

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const inEditor = () => window.self !== window.top && new URLSearchParams(window.location.search).has('canvas');

const BADGES = { birthday: FaCakeCandles, fri13: FaCat, halloween: FaGhost, xmas: FaSnowflake, newyear: FaStar, valentine: FaHeart };

const telHref = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `tel:+1${d}`;
  if (d.length === 11 && d[0] === '1') return `tel:+${d}`;
  return SITE.phoneHref;
};

/** The shop's hours (Google weekly when cached, else the table) + overrides
    + the Google profile, loaded at once, because his mood follows them. */
function useFoxHours() {
  const [base, setBase] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([getHours(), getHoursOverrides(), getGoogleProfile()]).then(([hours, overrides, profile]) => {
      if (!alive) return;
      const google = googleWeekly(profile);
      setBase({ hours: google.length ? google : hours, overrides: overrides || [], profile });
    });
    return () => { alive = false; };
  }, []);
  return base;
}

/** Everything the answers are built from, loaded the first time it's wanted. */
function useFoxData(wanted, base) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!wanted || !base || data) return undefined;
    let alive = true;
    Promise.all([
      getMenu(), getSections('location'), getSections('events'), getSections('home'), getEvents(),
    ]).then(([menu, location, eventsPage, home, events]) => {
      if (!alive) return;
      const { profile } = base;
      const parking = findSection(location, 'rich_text', /parking/i);
      const host = (eventsPage || []).find((s) => s?.type === 'cta' && /contact/.test(s?.data?.button_url || ''))?.data;
      const skip = (home || []).find((s) => s?.type === 'cta' && /order/i.test(`${s?.data?.button_label} ${s?.data?.body}`))?.data;
      const phone = profile?.formatted_phone || SITE.phone;
      setData({
        hours: base.hours,
        overrides: base.overrides,
        address: profile?.formatted_address || SITE.address,
        mapsUrl: profile?.maps_url || '',
        orderUrl: orderUrlFor(null),
        orderCopy: skip?.body ? plainText(skip.body) : '',
        menu: menu || [],
        parking: parking ? plainText(parking.body_markdown) : '',
        events: events || [],
        hostCopy: host?.body ? plainText(host.body) : '',
        phone,
        phoneHref: telHref(phone),
      });
    });
    return () => { alive = false; };
  }, [wanted, base, data]);
  return data;
}

function AnswerLink({ link, onNavigate }) {
  const internal = link.href.startsWith('/');
  const tel = link.href.startsWith('tel:');
  if (internal) {
    return <Link className="fox-help__link" to={link.href} onClick={onNavigate}>{link.label} <FaArrowRight aria-hidden="true" /></Link>;
  }
  return (
    <a className="fox-help__link" href={link.href} {...(tel ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      onClick={() => track('fox_link', { href: link.href })}>
      {link.label}
      {!tel && <><FaArrowUpRightFromSquare aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></>}
    </a>
  );
}

export default function FoxGuide() {
  const uid = useId();
  const panelId = `fox-help-${uid.replace(/:/g, '')}`;
  const foxBtn = useRef(null);
  const tabBtn = useRef(null);
  const panel = useRef(null);
  const [hidden, setHidden] = useState(() => store.get('localStorage', HIDDEN_KEY) === '1');
  const [open, setOpen] = useState(false);
  const [back, setBack] = useState(false); // came back from the edge this visit
  const [wanted, setWanted] = useState(false);
  const [picked, setPicked] = useState(null);
  const [line, setLine] = useState(null);
  const [move, setMove] = useState(null); // 'wave' | 'hop' — the one motion playing
  const [quipN, setQuipN] = useState(() => Number(store.get('localStorage', QUIP_I_KEY)) || 0);
  const [, tick] = useState(0);
  const [pets, setPets] = useState(readPets);
  const [burst, setBurst] = useState(0); // confetti key (0 = none)
  const [factSeen, setFactSeen] = useState(() => store.get('localStorage', FACT_SEEN_KEY));
  const moveTimer = useRef(0);
  const openTimer = useRef(0);
  const pointerType = useRef('mouse');
  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(moveTimer.current); }, []);
  const base = useFoxHours();
  const outfit = useFoxOutfit(); // fox-outfits: seasonal / weather accessories
  const data = useFoxData(wanted || open, base);
  const day = specialDay(foxToday());
  const Badge = day ? BADGES[day.id] : null;

  // the ONE motion playing (wave / hop / wag); a new one replaces the last
  const play = useCallback((m, ms) => {
    if (reduced()) return undefined;
    clearTimeout(moveTimer.current);
    setMove(m);
    moveTimer.current = setTimeout(() => setMove(null), ms);
    return () => clearTimeout(moveTimer.current);
  }, []);

  // his mood follows the shop's clock: re-check every minute, open or not
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // confetti clears itself
  useEffect(() => {
    if (!burst) return undefined;
    const t = setTimeout(() => setBurst(0), 1300);
    return () => clearTimeout(t);
  }, [burst]);

  // a special day speaks up by itself (once a day); otherwise a first-time
  // visitor gets a peek + wave and a hello
  useEffect(() => {
    if (hidden) return undefined;
    const today = foxToday();
    const stamp = `${today.toDateString()}:${day?.id}`;
    let say = null;
    if (day && store.get('localStorage', SEEN_KEY) !== stamp) {
      say = () => { setLine(day.text); store.set('localStorage', SEEN_KEY, stamp); };
    } else if (store.get('localStorage', MET_KEY) !== '1') {
      say = () => { setLine('Hi! I’m the Trouble fox. Tap me for hours, directions and more.'); store.set('localStorage', MET_KEY, '1'); };
    }
    if (!say) return undefined;
    let stop;
    const t = setTimeout(() => { say(); stop = play('wave', 1400); }, 1900);
    return () => { clearTimeout(t); stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount / un-hide
  }, [hidden]);

  // a bubble only stays a little while
  useEffect(() => {
    if (!line) return undefined;
    const t = setTimeout(() => setLine(null), 9000);
    return () => clearTimeout(t);
  }, [line]);

  // once a visit, after a while, he offers one true thing (QUIPS)
  useEffect(() => {
    if (hidden || store.get('sessionStorage', QUIPPED_KEY) === '1') return undefined;
    const t = setTimeout(() => {
      if (open || document.hidden) return;
      store.set('sessionStorage', QUIPPED_KEY, '1');
      setLine((cur) => cur || QUIPS[quipN % QUIPS.length]);
      setQuipN((n) => { store.set('localStorage', QUIP_I_KEY, String(n + 1)); return n + 1; });
    }, 45_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, open]);

  // he follows the pointer (mouse, pen or finger) with his whole head
  useEffect(() => {
    const el = foxBtn.current;
    if (!el || hidden || reduced()) return undefined;
    let raf = 0;
    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    const paint = () => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.4;
      const dx = Math.max(-1, Math.min(1, (px - cx) / (window.innerWidth * 0.6)));
      const dy = Math.max(-1, Math.min(1, (py - cy) / (window.innerHeight * 0.6)));
      // the drawing faces left (snout toward his cup); turn him round to
      // face the pointer whenever it is on his right
      el.style.setProperty('--face', px > cx ? -1 : 1);
      el.style.setProperty('--lean', `${Math.abs(dx) * 5 - dy * 3}deg`);
    };
    const onMove = (e) => {
      px = e.clientX; py = e.clientY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, [hidden]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) requestAnimationFrame(() => foxBtn.current?.focus());
  }, []);

  // open: focus the card, Esc / outside tap closes it, the hours stay current
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } };
    const onDown = (e) => {
      if (panel.current?.contains(e.target) || foxBtn.current?.contains(e.target)) return;
      close(false);
    };
    // the card gets exactly the room between the bottom of the header (or
    // the top of the screen, once a banner has scrolled away) and the fox,
    // so it never tucks under the nav on a short laptop
    let raf = 0;
    const fit = () => {
      const el = panel.current;
      if (!el) return;
      const nav = document.querySelector('.nav');
      const top = Math.max(0, nav ? nav.getBoundingClientRect().bottom : 0);
      const sheet = window.matchMedia?.('(max-width: 600px)').matches;
      const foxTop = foxBtn.current?.getBoundingClientRect().top ?? window.innerHeight;
      const room = sheet ? window.innerHeight - top - 12 : foxTop - 14 - top - 12;
      el.style.setProperty('--fox-room', `${Math.max(240, Math.floor(room))}px`);
    };
    const onLayout = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    fit();
    window.addEventListener('resize', onLayout, { passive: true });
    window.addEventListener('scroll', onLayout, { passive: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  if (inEditor()) return null;

  const todayIso = shopNow().isoDate;

  const hide = () => {
    setOpen(false);
    setLine(null);
    setHidden(true);
    store.set('localStorage', HIDDEN_KEY, '1');
    track('fox_hide');
    requestAnimationFrame(() => tabBtn.current?.focus());
  };

  const bringBack = () => {
    setHidden(false);
    store.del('localStorage', HIDDEN_KEY);
    store.set('localStorage', MET_KEY, '1'); // no first-visit hello on a return
    setLine('I’m back! Tap me any time.');
    setBack(true); // he slides in from the edge and lands with one small hop (CSS)
    track('fox_show');
    requestAnimationFrame(() => foxBtn.current?.focus());
  };

  const openCard = () => {
    setLine(null);
    setOpen(true);
    track('fox_open');
  };

  const toggle = () => {
    if (open) { setLine(null); close(true); return; }
    play('hop', 420);
    openCard();
  };

  /* Every tap counts; quick ones are petting and never toggle the card.
     With a mouse or keyboard the first tap opens the card at once. On a
     touch screen the card is a bottom sheet that would cover him, so he hops
     straight away and the sheet opens once the taps stop (QUICK_MS later,
     or after the wag) — a single tap still opens it, petting just comes
     first. */
  const onFoxTap = (e) => {
    const touch = pointerType.current === 'touch' && e.detail !== 0;
    const r = registerTap(pets, Date.now());
    setPets(r.state);
    store.set('localStorage', PETS_KEY, JSON.stringify({ total: r.state.total, badge: r.state.badge }));
    clearTimeout(openTimer.current);
    if (r.award) {
      setLine(null);
      setOpen(true);
      setPicked('award');
      if (!reduced()) setBurst(Date.now());
      track('fox_badge');
      return;
    }
    if (r.confetti && !reduced()) setBurst(Date.now());
    else if (r.wag) play('wag', 950);
    if (touch && !open) {
      if (!r.quick && !r.wag) play('hop', 420);
      openTimer.current = setTimeout(openCard, r.wag && !reduced() ? 950 : QUICK_MS);
      return;
    }
    if (r.quick) return;
    toggle();
  };

  const ask = (id) => {
    if (id === 'fact') {
      setFactSeen(todayIso);
      store.set('localStorage', FACT_SEEN_KEY, todayIso);
    }
    setPicked((cur) => (cur === id ? null : id));
    track('fox_question', { question: id });
  };

  const answers = data ? foxAnswers({ ...data, now: new Date() }) : [];
  const chosen = answers.find((a) => a.id === picked);
  const hrs = data || base;
  const status = hrs ? hoursAnswer(hrs.hours, hrs.overrides) : null;
  const mood = foxMood({ hours: hrs?.hours, overrides: hrs?.overrides, now: new Date(), today: foxToday() });
  const fact = dailyFact(new Date(), data?.menu || null);
  const factNew = factSeen !== todayIso;
  const greeting = day ? day.text
    : mood.sleepy ? `${backLine(mood.next)} Ask me anything meanwhile.`
      : mood.morning ? 'Good morning! What can I help you with?'
        : 'Hi there! What can I help you with?';
  const PLAY = [
    { id: 'surprise', label: 'Surprise me', Icon: SurpriseIcon },
    { id: 'quiz', label: 'Pick my drink', Icon: FaWandMagicSparkles },
    { id: 'fact', label: 'Fox fact', Icon: FaLightbulb, dot: factNew },
  ];
  const isPlay = ['surprise', 'quiz', 'fact', 'award'].includes(picked);
  // a game result can be tall: while one is up, the chips fold away so the
  // answer area gets the room (and scrolls on its own if it still needs to)
  const isGame = Boolean(data) && ['surprise', 'quiz'].includes(picked);
  const moodCls = `${mood.sleepy ? ' is-sleepy' : ''}${mood.morning ? ' is-morning' : ''}${mood.october ? ' is-october' : ''}`;

  if (hidden) {
    return (
      <div className="fox-guide is-hidden">
        <button type="button" ref={tabBtn} className="fox-guide__tab" onClick={bringBack} aria-label="Bring back the fox" title="Bring back the fox">
          {/* his own head and top hat, whole and centred in a little framed
              card (the same frame as his resting card) */}
          <span className="fox-guide__peek" aria-hidden="true"><FoxArt bust /></span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fox-guide${open ? ' is-open' : ''}${back ? ' is-back' : ''}${move ? ` is-${move}` : ''}${moodCls}`}>
      {open && <div className="fox-guide__scrim" aria-hidden="true" />}
      {open && (
        <section
          id={panelId}
          ref={panel}
          className={`fox-help${isGame ? ' is-game' : ''}`}
          role="dialog"
          aria-labelledby={`${panelId}-title`}
          tabIndex={-1}
        >
          <header className="fox-help__head">
            <div>
              <h2 className="fox-help__title" id={`${panelId}-title`}>
                Ask the fox
                {pets.badge && <span className="fox-help__badge" title="You earned the Trouble-maker badge"><FaMedal aria-hidden="true" /> Trouble-maker</span>}
              </h2>
              {status && (
                <p className={`fox-help__status${status.open ? ' is-open' : ''}`}>
                  <span className="fox-help__dot" aria-hidden="true" />{status.short}
                </p>
              )}
            </div>
            <button type="button" className="fox-help__close" onClick={() => close(true)} aria-label="Close">
              <FaXmark aria-hidden="true" />
            </button>
          </header>

          {/* the answer sits right under the header and never scrolls away —
              only the chips below it scroll when the card is short. While a
              game (quiz / Surprise) is up, the answer area scrolls instead. */}
          <div className="fox-help__say" aria-live="polite">
            <div className={`fox-help__say-in${isPlay ? ' is-play' : ''}`} key={picked && (chosen || isPlay) ? picked : 'hello'}>
              {picked === 'surprise' && data ? <SurprisePane menu={data.menu} hours={data.hours} overrides={data.overrides} />
                : picked === 'quiz' && data ? <QuizPane menu={data.menu} hours={data.hours} overrides={data.overrides} />
                  : picked === 'fact' && data ? <FactPane fact={fact} />
                    : picked === 'award' ? <AwardPane />
                      : chosen ? (
                <>
                  <p className="fox-help__q">{chosen.q}</p>
                  <p className="fox-help__a">{chosen.a}</p>
                  {chosen.links.length > 0 && (
                    <p className="fox-help__links">
                      {chosen.links.map((l) => <AnswerLink key={l.href} link={l} onNavigate={() => close(false)} />)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* fox-outfits: your usual, then his line about the outfit */}
                  {data && <FoxUsual menu={data.menu} onSomethingDifferent={() => ask('quiz')} />}
                  <p className="fox-help__a">{greeting}</p>
                  <FoxOutfitLine outfit={outfit} />
                </>
              )}
            </div>
          </div>

          <div className="fox-help__body">
            {data && (
              <ul className="fox-help__play" aria-label="Fox games">
                {PLAY.map(({ id, label, Icon, dot }) => (
                  <li key={id}>
                    <button type="button" className="fox-help__tile" aria-pressed={picked === id} onClick={() => ask(id)}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                      {dot && <i className="fox-help__new"><span className="sr-only"> (new today)</span></i>}
                    </button>
                  </li>
                ))}
                {/* while a game is up the question chips fold into this one tile */}
                {isGame && (
                  <li>
                    <button type="button" className="fox-help__tile fox-help__tile--more" onClick={() => setPicked(null)}>
                      <FaCircleQuestion aria-hidden="true" />
                      <span>Questions</span>
                    </button>
                  </li>
                )}
              </ul>
            )}
            {isGame ? null : data ? (
              <ul className="fox-help__chips" aria-label="Common questions">
                {answers.map((a) => (
                  <li key={a.id}>
                    <button type="button" className="fox-help__chip" aria-pressed={picked === a.id} onClick={() => ask(a.id)}>
                      {a.q}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fox-help__loading">One sec, checking the shop…</p>
            )}
          </div>

          <footer className="fox-help__foot">
            <Link to="/contact" className="fox-help__else" onClick={() => close(false)}>
              Ask something else <FaArrowRight aria-hidden="true" /> <span>Contact us</span>
            </Link>
            <button type="button" className="fox-help__hide" onClick={hide}>
              <FaEyeSlash aria-hidden="true" /> Hide the fox
            </button>
          </footer>
        </section>
      )}

      <div className="fox-guide__body">
        <button
          type="button"
          ref={foxBtn}
          className="fox-guide__fox"
          onClick={onFoxTap}
          onPointerDown={(e) => { pointerType.current = e.pointerType; }}
          onPointerEnter={() => setWanted(true)}
          onFocus={() => setWanted(true)}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-haspopup="dialog"
          aria-label={open ? 'Close the fox’s help' : `Ask the fox: hours, directions, menu and more${factNew ? ' (new fox fact today)' : ''}`}
        >
          <span className="fox-guide__card">
            <span className="fox-guide__figure">
              <FoxArt />
              <span className="fox-guide__steam" aria-hidden="true"><i /><i /><i /></span>
              <FoxOutfit outfit={outfit} hasPumpkin={mood.october} />{/* fox-outfits */}
              {mood.sleepy && <Nightcap />}
            </span>
            {mood.sleepy && <span className="fox-guide__zzz" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>}
            {mood.october && <Pumpkin />}
            {Badge && !open && <span className="fox-guide__badge" aria-hidden="true"><Badge /></span>}
            {/* while the card is open he IS the close button: say so */}
            {open && <span className="fox-guide__closex" aria-hidden="true"><FaXmark /></span>}
            {factNew && !open && <span className="fox-guide__dot" aria-hidden="true" />}
          </span>
          <Tail />
        </button>
        {burst > 0 && (
          <span className="fox-guide__confetti" key={burst} aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ '--a': `${(i * 360) / 16}deg`, '--d': `${46 + (i % 4) * 14}px`, '--c': ['#e3b53f', '#e98fb0', '#7e8c54', '#b0436e'][i % 4] }} />
            ))}
          </span>
        )}
        {!open && (
          <button type="button" className="fox-guide__x" onClick={hide} aria-label="Hide the fox">
            <FaXmark aria-hidden="true" />
          </button>
        )}
      </div>

      {line && !open && (
        <button type="button" className="fox-guide__bubble" onClick={toggle}>
          <span role="status">{line}</span>
        </button>
      )}
    </div>
  );
}
