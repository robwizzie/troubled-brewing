import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reset scroll on route change (SPA doesn't do this by default).
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
