import { Link } from 'react-router-dom';
import { FaMugHot, FaLocationDot, FaPhone } from 'react-icons/fa6';
import { SITE } from '../lib/seed.js';
import SocialLinks from './SocialLinks.jsx';
import BrandImg from './BrandImg.jsx';
import { Flourish } from './Motifs.jsx';
import { BRAND } from '../lib/config.js';

/* Footer modeled on the client's reference: a fox-emerging-from-coffee banner
   image up top, a clean cream body (nav / say-hi / connect) in HTML+CSS, real
   social icons, and a big TROUBLE BREWING wordmark. */
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
      {/* Top band — the fox-in-coffee banner (appears once footer-banner.png is added) */}
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

          <div className="footer__hi">
            <h3>Say Hi!</h3>
            <p>Come have a coffee with us.</p>
            <Link className="btn btn--primary footer__chat" to="/contact">
              <FaMugHot aria-hidden="true" /> Let's Chat!
            </Link>
            <p className="footer__addr">
              <FaLocationDot aria-hidden="true" /> {SITE.address}
              <br />
              <a href={SITE.phoneHref}><FaPhone aria-hidden="true" /> {SITE.phone}</a>
            </p>
          </div>

          <div className="footer__connect">
            <h4 className="footer__head">Stay in touch</h4>
            <SocialLinks />
            <p className="footer__copy">© {year} Trouble Brewing Coffee House</p>
            <p className="footer__legal">
              <Link to="/privacy">Privacy</Link> · <Link to="/accessibility">Accessibility</Link> ·{' '}
              <Link to="/admin">Owner Login</Link>
            </p>
          </div>
        </div>

        <div className="footer__wordmark">
          <BrandImg
            src={BRAND.logoPrimary}
            alt="Trouble Brewing Coffee House"
            className="footer__wordmark-img"
            fallback={
              <span className="footer__wordmark-text">
                Trouble Brewing
                <Flourish width={260} color="var(--color-ink)" />
                <small>Haddon Heights · NJ</small>
              </span>
            }
          />
        </div>
      </div>
    </footer>
  );
}
