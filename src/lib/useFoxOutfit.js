import { useEffect, useState } from 'react';
import { cachedWeather, fetchWeather, outfitFromUrl, resolveOutfit, seasonFor, shopDate } from './foxOutfit.js';

/* The fox's outfit for right now (see foxOutfit.js): the season straight
   away, then the live weather once it arrives (or never, silently). A forced
   ?foxOutfit= look skips the weather call altogether. The call is made once
   per page load at most and cached for 30 minutes per tab. */

let pending = null; // one in-flight weather call, shared

const isTest = () => import.meta.env?.MODE === 'test';

export default function useFoxOutfit() {
  const [state, setState] = useState(() => ({
    season: seasonFor(shopDate()),
    override: outfitFromUrl(),
    weather: outfitFromUrl() ? null : cachedWeather(),
  }));

  useEffect(() => {
    if (state.override || state.weather || isTest()) return undefined;
    let alive = true;
    pending = pending || fetchWeather().finally(() => { setTimeout(() => { pending = null; }, 0); });
    pending.then((w) => { if (alive && w) setState((s) => ({ ...s, weather: w })); }, () => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  return resolveOutfit(state);
}
