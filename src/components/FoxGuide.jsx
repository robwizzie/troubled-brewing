import { useEffect, useRef, useState } from 'react';
import { asset } from '../lib/config.js';
import { useShopStatus } from '../lib/useShopStatus.js';
import { QUIPS, foxToday, specialDay } from '../lib/foxDays.js';

/* The gold fox — the real gilded fox head from the gallery wall, in his
   spectacles — keeps you company in the corner of every page. He turns to
   look at your cursor (or wherever your finger last touched), and when you
   tap him he says something true: the shop's real hours, or a nudge toward
   something on the wall. On special days (the shop's October 13 birthday,
   any Friday the 13th, Halloween…) he speaks up by himself, once a day.

   The head-turn is CSS custom properties written straight from a
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
      const cy = r.top + r.height * 0.4; // his eyes, not his chain
      const dx = Math.max(-1, Math.min(1, (px - cx) / (window.innerWidth * 0.6)));
      const dy = Math.max(-1, Math.min(1, (py - cy) / (window.innerHeight * 0.6)));
      el.style.setProperty('--ry', `${dx * 28}deg`);
      el.style.setProperty('--rx', `${-dy * 18}deg`);
      el.style.setProperty('--rz', `${dx * 6}deg`);
      el.style.setProperty('--glint', `${50 + dx * 30}%`);
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
    // every other tap is the live hours; the rest are wall gossip
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
        <img src={asset('images/brand/fox-head.webp')} alt="" width="338" height="520" />
        <span className="fox-guide__glint" aria-hidden="true" />
      </button>
    </div>
  );
}
