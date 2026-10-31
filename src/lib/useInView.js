import { useEffect, useState } from 'react';

/* true once `ref`'s element has scrolled into view (then stays true). Without
   IntersectionObserver (old browsers, tests) it is simply true, so content is
   never left hidden. Pair with CSS that only animates when motion is allowed. */
export default function useInView(ref, { threshold = 0.2, rootMargin = '0px 0px -8% 0px' } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    // In view once `threshold` of it shows, or once it fills a third of the
    // screen: an element much taller than the screen can never show
    // `threshold` of itself at once (a long team board on a phone can't reach
    // 10%), and it may only grow that tall after its data loads. The extra
    // steps keep the callback coming while it scrolls through.
    const steps = Array.from({ length: 11 }, (_, i) => (threshold * i) / 10);
    const io = new IntersectionObserver((entries) => {
      const seen = entries.some((e) => {
        if (!e.isIntersecting) return false;
        if (!e.intersectionRect) return true; // an entry without geometry: trust isIntersecting
        const screen = e.rootBounds?.height || window.innerHeight;
        return e.intersectionRatio >= threshold || e.intersectionRect.height >= screen / 3;
      });
      if (seen) {
        setInView(true);
        io.disconnect();
      }
    }, { threshold: steps, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, inView, threshold, rootMargin]);
  return inView;
}
