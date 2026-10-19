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
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        io.disconnect();
      }
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, inView, threshold, rootMargin]);
  return inView;
}
