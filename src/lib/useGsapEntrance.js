import { useLayoutEffect, useRef } from 'react';

/* =============================================================================
   useGsapEntrance — the site's one clean way to run a GSAP entrance animation.

   GSAP is lazy-loaded (a separate chunk, kept out of the initial bundle so first
   paint stays fast), and the whole thing is progressive enhancement:

     • prefers-reduced-motion  → skipped entirely; content shows via CSS as usual
     • GSAP slow / fails / no JS → a fallback reveals the content anyway
     • unmount / StrictMode      → the gsap.context reverts and inline styles clear

   How the no-flash gate works: this runs in a layout effect (before the browser
   paints), so it can add `is-entering` to the scoped element up front. Author a
   CSS rule that hides the animated bits while `.is-entering` is present; GSAP's
   `.from()` tweens then re-apply those hidden states inline before the gate is
   dropped, so the content never flashes in un-animated.

   Usage:
     const scope = useGsapEntrance((gsap) => {
       const tl = gsap.timeline();
       tl.from('.thing', { autoAlpha: 0, y: 20 });
       return tl;
     });
     return <section ref={scope} className="thing-wrap">…</section>;
   ========================================================================== */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useGsapEntrance(build, { fallbackMs = 1400 } = {}) {
  const scope = useRef(null);

  useLayoutEffect(() => {
    const root = scope.current;
    // Reduced motion (or no DOM): don't touch a thing — CSS shows the content.
    if (!root || prefersReducedMotion()) return;

    // Hide the animated bits before the first paint, so there's no flash of
    // un-animated content while GSAP loads.
    root.classList.add('is-entering');

    let ctx;
    let cancelled = false;
    const reveal = () => root.classList.remove('is-entering');
    // Safety net: if GSAP is slow or never arrives, show everything anyway — and
    // stand down so a late load can't re-hide the content and flash.
    const fallback = window.setTimeout(() => {
      cancelled = true;
      reveal();
    }, fallbackMs);

    import('gsap')
      .then(({ gsap }) => {
        window.clearTimeout(fallback);
        if (cancelled) return;
        // gsap.context scopes selector strings to `root` and makes cleanup a
        // one-liner (ctx.revert() restores every inline style GSAP wrote).
        ctx = gsap.context(() => build(gsap), root);
        // The `.from()` tweens have applied their hidden start states inline via
        // immediateRender, so it's safe to drop the CSS gate with no flash.
        reveal();
      })
      .catch(() => {
        window.clearTimeout(fallback);
        if (!cancelled) reveal();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      if (ctx) ctx.revert();
      reveal();
    };
  }, [build, fallbackMs]);

  return scope;
}
