import { useEffect, useState } from 'react';
import { cachedWeather, fetchWeather, outfitFromUrl, resolveOutfit, seasonFor, shopDate, weatherPreviewFromUrl } from './foxOutfit.js';

/* The fox's outfit for right now (see foxOutfit.js): the season straight
   away, then the live weather once it arrives (or never, silently). A forced
   ?foxOutfit= look skips the weather call altogether. The call is made once
   per page load at most and cached for 30 minutes per tab. */

let pending = null; // one in-flight weather call, shared by every caller

const isTest = () => import.meta.env?.MODE === 'test';

/**
 * Live weather at the shop ({ code, tempF, isDay }) or null: the 30-minute
 * cache straight away, else ONE shared Open-Meteo call (see fetchWeather).
 * `skip` (e.g. a forced preview) means no call at all. Never fetches under
 * vitest; tests seed the sessionStorage cache instead. Shared by the fox and
 * the rainy-day banner so a page makes at most one weather call.
 */
export function useShopWeather({ skip = false } = {}) {
  const [weather, setWeather] = useState(() => (skip ? null : cachedWeather()));

  useEffect(() => {
    if (skip || weather || isTest()) return undefined;
    let alive = true;
    pending = pending || fetchWeather().finally(() => { setTimeout(() => { pending = null; }, 0); });
    pending.then((w) => { if (alive && w) setWeather(w); }, () => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, [skip]);

  return skip ? null : weather;
}

export default function useFoxOutfit() {
  // ?foxOutfit= wins; otherwise ?weather=rain|snow (the banner's preview)
  // dresses him to match, so both previews agree
  const [fixed] = useState(() => ({
    season: seasonFor(shopDate()),
    override: outfitFromUrl() || weatherPreviewFromUrl(),
  }));
  const weather = useShopWeather({ skip: Boolean(fixed.override) });
  return resolveOutfit({ ...fixed, weather });
}
