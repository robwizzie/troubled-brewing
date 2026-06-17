import { Link } from 'react-router-dom';
import { SITE } from '../lib/seed.js';
import { track } from '../lib/analytics.js';
import SocialLinks from './SocialLinks.jsx';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <h4>Trouble Brewing Coffee House</h4>
            <p style={{ maxWidth: '34ch' }}>
              A warm, independent coffee shop in Haddon Heights, NJ. We proudly pour La Colombe.
            </p>
            <p>
              {SITE.address}
              <br />
              <a href={SITE.phoneHref}>{SITE.phone}</a>
            </p>
            <a
              href={`https://instagram.com/${SITE.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('outbound_click', { dest: 'instagram' })}
            >
              @{SITE.instagram}
            </a>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <SocialLinks />
            </div>
          </div>

          <div>
            <h4>Visit</h4>
            <ul className="footer__links">
              <li><Link to="/menu">Menu</Link></li>
              <li><Link to="/location">Hours & Location</Link></li>
              <li><Link to="/events">Events</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
              <li><Link to="/contact">Contact & Catering</Link></li>
            </ul>
          </div>

          <div>
            <h4>More</h4>
            <ul className="footer__links">
              <li><Link to="/about">Our Story</Link></li>
              <li><Link to="/gallery-wall">Gallery Wall</Link></li>
              <li><Link to="/troublemakers">Troublemakers</Link></li>
              <li><Link to="/neighborhood">Local Love</Link></li>
              <li><Link to="/community">Community</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {year} Trouble Brewing Coffee House. All rights reserved.</span>
          <span>
            <Link to="/privacy">Privacy</Link> · <Link to="/accessibility">Accessibility</Link> ·{' '}
            <Link to="/admin">Owner Login</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
