import { Link } from 'react-router-dom';
import { FaLocationDot, FaPhone } from 'react-icons/fa6';
import { SITE } from '../lib/seed.js';
import SocialLinks from './SocialLinks.jsx';
import BrandImg from './BrandImg.jsx';
import { BRAND } from '../lib/config.js';

/* Footer: a fox-in-coffee banner up top, a clean cream body (Navigation /
   Visit / Connect), real social icons, and a big HTML-text wordmark. The cream
   (#f5e5d3) matches the banner art so they blend. */
const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'Our Story' },
  { to: '/events', label: 'Events' },
  { to: '/location', label: 'Hours & Location' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact & Catering' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      {/* Top band — the fox-in-coffee banner (appears once the image is added) */}
      <BrandImg
        src={BRAND.footerBanner}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="footer__banner"
        fallback={<div className="footer__banner-fallback" aria-hidden="true" />}
      />

      <div className="footer__body">
        <div className="container footer__cols">
          <nav className="footer__nav" aria-label="Footer navigation">
            <h4 className="footer__head">Navigation</h4>
            <ul>
              {NAV.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <div className="footer__visit">
            <h4 className="footer__head">Visit Us</h4>
            <p className="footer__addr">
              <span><FaLocationDot aria-hidden="true" />{SITE.address}</span>
              <a href={SITE.phoneHref}><FaPhone aria-hidden="true" />{SITE.phone}</a>
            </p>
          </div>

          <div className="footer__connect">
            <h4 className="footer__head">Stay in Touch</h4>
            <SocialLinks />
            <p className="footer__copy">© {year} Trouble Brewing Coffee House</p>
            <p className="footer__legal">
              <Link to="/privacy">Privacy</Link> · <Link to="/accessibility">Accessibility</Link> ·{' '}
              <Link to="/admin">Owner Login</Link>
            </p>
          </div>
        </div>

        <div className="footer__wordmark">
          <span className="footer__wm-title">Trouble Brewing</span>
          <span className="footer__wm-sub">
            <i className="footer__wm-star" aria-hidden="true">✦</i>
            Haddon Heights · NJ
            <i className="footer__wm-star" aria-hidden="true">✦</i>
          </span>
        </div>
      </div>
    </footer>
  );
}
