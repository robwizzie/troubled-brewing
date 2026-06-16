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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const location = useLocation();

  // Close menus on navigation.
  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Close the "More" dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="nav">
      <div className="container nav__inner">
        {/* fox + wordmark lockup */}
        <div className="nav__lockup">
          <BrandImg src={BRAND.foxMascot} alt="" aria-hidden="true" className="nav__fox" fallback={null} />
          <NavLink to="/" className="nav__brand" aria-label="Trouble Brewing Coffee House — home">
            <BrandImg
              src={BRAND.logoPrimary}
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
        </div>

        <button
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'} <span className="sr-only">Menu</span>
        </button>

        <nav id="primary-nav" className="nav__links" aria-label="Primary" data-open={open ? 'true' : 'false'}>
          {/* On mobile the list is a drawer toggled via data-open (see components.css) */}
          {PRIMARY.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav__link ${isActive ? 'active' : ''}`}>
              {l.label}
            </NavLink>
          ))}

          <div className="nav__more" ref={moreRef}>
            <button
              className="nav__link"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              More ▾
            </button>
            {moreOpen && (
              <div className="nav__menu" role="menu">
                {MORE.map((l) => (
                  <NavLink key={l.to} to={l.to} role="menuitem">
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <OrderButton className="btn btn--accent btn--wiggle nav__cta" location="nav" />

          {/* fox creeping into the mobile drawer (only visible when the drawer is open) */}
          {open && (
            <BrandImg src={BRAND.foxMascot} alt="" aria-hidden="true" className="nav__drawer-fox" fallback={null} />
          )}
        </nav>
      </div>
    </header>
  );
}
