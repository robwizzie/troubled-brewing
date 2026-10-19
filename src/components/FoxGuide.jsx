import { useEffect, useRef, useState } from 'react';
import { asset } from '../lib/config.js';
import { useShopStatus } from '../lib/useShopStatus.js';
import { QUIPS, foxToday, specialDay } from '../lib/foxDays.js';

/* The Trouble Brewing fox — the dapper top-hatted fox from the logo, cup in
   hand (public/images/brand/fox-sipping.png, cut from logo-fox.png without
   the wordmark) — keeps you company in the corner of every page, leaning on
   his scroll. He turns to face your cursor (or wherever your finger last
   touched) and leans toward it; every so often he takes a sip and a curl of
   steam rises from the cup. Tap him and he says something true and useful:
   the shop's real hours, or one of the facts in QUIPS (src/lib/foxDays.js —
   ordering ahead, the address, parking, the Pup Cup…). He's the logo fox, so
   no spectacles — those belong to the gold fox-head on the wall. On special
   days (the October 13 birthday, any Friday the 13th, Halloween…) he speaks
   up by himself, once a day.

   Facing + leaning are CSS custom properties written straight from a
   requestAnimationFrame — no React re-render per mouse move. Reduced motion:
   he holds still and only talks when tapped. The × sends him away for the
   rest of the visit. */

const SEEN_KEY = 'tb-fox-day';
const AWAY_KEY = 'tb-fox-away';

const store = {
  get(s, k) { try { return window[s].getItem(k); } catch { return null; } },
  set(s, k, v) { try { window[s].setItem(k, v); } catch { /* private mode: fine */ } },
};

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const inEditor = () => window.self !== window.top && new URLSearchParams(window.location.search).has('canvas');

export default function FoxGuide() {
  const fox = useRef(null);
  const [away, setAway] = useState(() => store.get('sessionStorage', AWAY_KEY) === '1');
  const [line, setLine] = useState(null);
  const [n, setN] = useState(0);
  const status = useShopStatus();

  // a special day speaks up by itself, once per day per visitor
  useEffect(() => {
    if (away) return undefined;
    const today = foxToday();
    const day = specialDay(today);
    const stamp = `${today.toDateString()}:${day?.id}`;
    if (!day || store.get('localStorage', SEEN_KEY) === stamp) return undefined;
    const t = setTimeout(() => { setLine(day.text); store.set('localStorage', SEEN_KEY, stamp); }, 1600);
    return () => clearTimeout(t);
  }, [away]);

  // he follows the pointer (mouse, pen or finger) with his whole head
  useEffect(() => {
    const el = fox.current;
    if (!el || away || reduced()) return undefined;
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
  }, [away]);

  if (away || inEditor()) return null;

  const talk = () => {
    if (line) { setLine(null); return; }
    // the live hours come first, then the facts in turn
    const hours = status
      ? (status.open ? `We’re open. ${status.label}. Come say hi!` : `${status.label.replace('Closed — opens', 'We’re closed. Back at')}.`)
      : null;
    const pool = hours ? [hours, ...QUIPS] : QUIPS;
    setLine(pool[n % pool.length]);
    setN((x) => x + 1);
  };

  return (
    <div className={`fox-guide ${line ? 'is-talking' : ''}`}>
      {line && (
        <p className="fox-guide__bubble" role="status">
          {line}
          <button type="button" className="fox-guide__away" aria-label="Send the fox away" onClick={() => { setAway(true); store.set('sessionStorage', AWAY_KEY, '1'); }}>×</button>
        </p>
      )}
      <button type="button" ref={fox} className="fox-guide__fox" onClick={talk} aria-label={line ? 'Close what the fox said' : 'Ask the fox something'}>
        <span className="fox-guide__card">
          <span className="fox-guide__figure">
            <img src={asset('images/brand/fox-sipping.png')} alt="" width="266" height="148" />
            <span className="fox-guide__steam" aria-hidden="true"><i /><i /><i /></span>
          </span>
        </span>
      </button>
    </div>
  );
}
