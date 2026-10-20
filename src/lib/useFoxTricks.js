import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from './analytics.js';
import { foxToday } from './foxDays.js';
import { foxMood } from './foxFun.js';
import { TIP_LINES, TIP_MS, firstThisVisit, nightLook, registerTipTap, trickDay } from './foxTricks.js';

/* Wires the fox's hidden tricks (rules in foxTricks.js) into FoxGuide:

     const tricks = useFoxTricks({ base });
     tricks.tap(Date.now())  → true when that tap tipped his hat (the caller
                               then leaves the card alone)
     tricks.tipping          → the hat is off (draw <FoxTipArt />)
     tricks.line             → his tiny "Why, thank you." bubble, or null
     tricks.moon / .party    → the late-night moon and the birthday party hat
     tricks.greeting         → replaces the card's greeting, or null
     tricks.cls              → classes for .fox-guide

   Each trick is tracked once a visit: track('fox_trick', { name }). */

const say = (name) => { if (firstThisVisit(name)) track('fox_trick', { name }); };

export default function useFoxTricks({ base } = {}) {
  const [tipping, setTipping] = useState(false);
  const [line, setLine] = useState(null);
  const taps = useRef(null);
  const timers = useRef([]);
  const lineN = useRef(Math.floor(Math.random() * TIP_LINES.length));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const tap = useCallback((t = Date.now()) => {
    const r = registerTipTap(taps.current, t);
    taps.current = r.state;
    if (!r.tip) return false;
    lineN.current = (lineN.current + 1) % TIP_LINES.length;
    setTipping(true);
    setLine(TIP_LINES[lineN.current]);
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setTipping(false), TIP_MS),
      setTimeout(() => setLine(null), TIP_MS + 1100),
    ];
    say('hat_tip');
    return true;
  }, []);

  const now = new Date();
  const mood = foxMood({ hours: base?.hours, overrides: base?.overrides, now, today: foxToday() });
  const night = nightLook({ hours: base?.hours, overrides: base?.overrides, now, sleepy: mood.sleepy });
  const day = trickDay(foxToday());
  const party = Boolean(day.anniversary);

  useEffect(() => { if (night.moon) say('late_night'); }, [night.moon]);
  useEffect(() => { if (party) say('anniversary'); }, [party]);

  const cls = `${tipping ? ' is-tip' : ''}${night.moon ? ' is-night' : ''}${party ? ' is-party' : ''}`;
  return { tap, tipping, line, moon: night.moon, party, greeting: day.greeting || night.greeting, cls };
}
