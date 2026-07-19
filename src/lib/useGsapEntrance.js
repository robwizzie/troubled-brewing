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
     const scope = useGsapEntrance((gsap, ScrollTrigger) => {
       const tl = gsap.timeline();
       tl.from('.thing', { autoAlpha: 0, y: 20 });
       ScrollTrigger.batch('.late-thing', { once: true, onEnter: (els) => … });
       return tl;
     });
     return <section ref={scope} className="thing-wrap">…</section>;

   ScrollTrigger ships alongside gsap (same lazy chunk) so entrances can be
   scroll-driven; triggers created inside the build are tracked by the
   gsap.context and die with ctx.revert() on unmount.
   ========================================================================== */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The admin editor's canvas iframe (?canvas=1) must show everything instantly:
   entrance-hidden elements would read as missing content while editing, and
   live re-renders would race half-finished tweens. Same skip path as reduced
   motion — content shows via its resting CSS. */
const isEditorCanvas = () =>
  typeof window !== 'undefined' &&
  window.self !== window.top &&
  new URLSearchParams(window.location.search).has('canvas');

export function useGsapEntrance(build, { fallbackMs = 1400 } = {}) {
  const scope = useRef(null);

  useLayoutEffect(() => {
    const root = scope.current;
    // Reduced motion, editor canvas (or no DOM): don't touch a thing — CSS
    // shows the content.
    if (!root || prefersReducedMotion() || isEditorCanvas()) return;

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

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        window.clearTimeout(fallback);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        // gsap.context scopes selector strings to `root` and makes cleanup a
        // one-liner (ctx.revert() restores every inline style GSAP wrote and
        // kills any ScrollTriggers created inside the build).
        ctx = gsap.context(() => build(gsap, ScrollTrigger), root);
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
