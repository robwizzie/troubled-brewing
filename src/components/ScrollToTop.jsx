import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reset scroll to the very top on every route change (SPAs don't do this by
// default). We force an INSTANT jump, temporarily overriding the global
// `scroll-behavior: smooth`, otherwise the animated scroll can be interrupted
// by the incoming page's render and leave the user partway down.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    // Reset again on the next frame, after the mobile drawer's scroll-lock is
    // lifted (otherwise the body can stay frozen at its old scroll position).
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      html.style.scrollBehavior = prev;
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}
