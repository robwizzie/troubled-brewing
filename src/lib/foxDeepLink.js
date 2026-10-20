import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from './analytics.js';

/* Fox deep links — for the printed QR table cards (and the Menu page's
   "Wish for something new?" link). Any page can open the fox's card
   straight to a view:

     ?fox=open      his card, home view
     ?fox=quiz      "Pick my drink"
     ?fox=surprise  "Surprise me"
     ?fox=wish      "Make a wish for the menu"

   &src=table (or any short source name) is passed to the stats as
   track('fox_deeplink', { to, src }), once. An unknown ?fox= value just
   opens the home view. A page with only ?src= (e.g. /menu?src=table) opens
   nothing and is tracked as track('fox_deeplink', { to: 'page', src }), so
   the stats still count the scan. Afterwards both params are taken out of
   the address bar with history.replaceState, so a reload or a shared link
   doesn't reopen him. Works the same on phones, where the card is a sheet.
   The fox also shows for the visit if it had been hidden (without changing
   that saved choice); see FoxGuide. */

export const FOX_VIEWS = ['open', 'quiz', 'surprise', 'wish'];

/** { view, src } from a query string, or null when there's nothing to do.
    view: one of FOX_VIEWS (an unknown ?fox= value means 'open'), or null for
    a ?src=-only link (tracked, nothing opens). */
export function parseFoxLink(search = '') {
  let q;
  try { q = new URLSearchParams(search || ''); } catch { return null; }
  const raw = String(q.get('src') || '').trim().toLowerCase();
  const src = /^[a-z0-9_-]{1,24}$/.test(raw) ? raw : null;
  if (!q.has('fox')) return src ? { view: null, src } : null;
  const asked = String(q.get('fox') || '').trim().toLowerCase();
  return { view: FOX_VIEWS.includes(asked) ? asked : 'open', src };
}

/** The same URL without its fox / src params (everything else kept). */
export function stripFoxParams(href) {
  const u = new URL(href);
  u.searchParams.delete('fox');
  u.searchParams.delete('src');
  return `${u.pathname}${u.search}${u.hash}`;
}

/** Calls onOpen(view) whenever the address carries ?fox=… (on load, and on
    an in-site link to one), tracks it, then cleans the address bar. */
export function useFoxDeepLink(onOpen) {
  const { search, key } = useLocation();
  const cb = useRef(onOpen);
  cb.current = onOpen;
  const handled = useRef(null); // StrictMode re-runs effects: act (and track) once per navigation
  useEffect(() => {
    const link = parseFoxLink(search);
    const stamp = `${key}${search}`;
    if (!link || handled.current === stamp) return;
    handled.current = stamp;
    if (link.view) cb.current(link.view);
    const to = link.view || 'page';
    // track() sets analytics up itself if this is the first thing on the page
    // (this child's effect runs before App's useAnalytics on a first load)
    track('fox_deeplink', link.src ? { to, src: link.src } : { to });
    try {
      window.history.replaceState(window.history.state, '', stripFoxParams(window.location.href));
    } catch { /* an odd sandbox: the card still opened */ }
  }, [search, key]);
}
