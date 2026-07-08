import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import OrderButton from './OrderButton.jsx';
import BrandImg from './BrandImg.jsx';
import { BRAND } from '../lib/config.js';

const PRIMARY = [
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
  { to: '/events', label: 'Events' },
  { to: '/location', label: 'Location' },
  { to: '/reviews', label: 'Reviews' },
];
const MORE = [
  { to: '/gallery-wall', label: 'Gallery Wall' },
  { to: '/troublemakers', label: 'Troublemakers' },
  { to: '/timeline', label: 'Our Story So Far' },
  { to: '/neighborhood', label: 'Local Love' },
  { to: '/community', label: 'Community' },
  { to: '/contact', label: 'Contact' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false); // desktop "More" dropdown only
  const moreRef = useRef(null);
  const headerRef = useRef(null);
  const location = useLocation();

  // Close menus on navigation.
  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Close the desktop "More" dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // While the mobile drawer is open: lock body scroll, anchor the drawer to the
  // real bottom of the header (so it opens BENEATH the bar even with the
  // announcement banner showing), and let Esc close it.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const positionDrawer = () => {
      const bottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      document.documentElement.style.setProperty('--drawer-top', `${Math.max(0, Math.round(bottom))}px`);
    };
    positionDrawer();
    window.addEventListener('resize', positionDrawer);
    window.addEventListener('orientationchange', positionDrawer);

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('resize', positionDrawer);
      window.removeEventListener('orientationchange', positionDrawer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="nav" ref={headerRef}>
      <div className="container nav__inner">
        <NavLink to="/" className="nav__brand" aria-label="Trouble Brewing Coffee House — home">
          <BrandImg
            src={BRAND.logoFox}
            alt="Trouble Brewing Coffee House"
            className="nav__logo"
            fallback={
              <span className="nav__brandtext">
                Trouble Brewing
                <small>Coffee House · Haddon Heights</small>
              </span>
            }
          />
        </NavLink>

        <button
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          data-open={open ? 'true' : 'false'}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav__burger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>

        <nav id="primary-nav" className="nav__links" aria-label="Primary" data-open={open ? 'true' : 'false'}>
          {/* Mobile: this becomes a full-height drawer (see components.css) showing
              every link in one clean list. Desktop: an inline bar where the
              secondary links collapse under the "More" dropdown. */}
          {PRIMARY.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav__link ${isActive ? 'active' : ''}`}>
              {l.label}
            </NavLink>
          ))}

          {/* On mobile (display:contents) these flow inline with the list above.
              On desktop they live inside the "More" dropdown. */}
          <div className="nav__more" ref={moreRef} data-open={moreOpen ? 'true' : 'false'}>
            <button
              className="nav__link nav__more-btn"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              More ▾
            </button>
            <div className="nav__menu" role="menu">
              {MORE.map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav__link ${isActive ? 'active' : ''}`} role="menuitem">
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* CTA + fox share one row in the mobile drawer (the fox stands beside
             the button, presenting it — in flow, so it can never overlap the
             links); display:contents dissolves the wrapper on desktop */}
          <div className="nav__cta-row">
            <OrderButton className="btn btn--accent nav__cta" location="nav" />
            {open && (
              <BrandImg src={BRAND.foxMascot} alt="" aria-hidden="true" className="nav__drawer-fox" fallback={null} />
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
