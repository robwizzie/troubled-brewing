import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { WishNudge } from '../components/FoxWish.jsx';

export default function NotFound() {
  return (
    <>
      <SEO title="Page not found — Trouble Brewing Coffee House" noindex path="/404" />
      <section className="section container" style={{ textAlign: 'center', minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
        <div>
          <p className="eyebrow">Error 404</p>
          <h1>Looks like you found some Trouble.</h1>
          <p style={{ color: 'var(--color-text-soft)', maxWidth: '40ch', margin: '0 auto var(--space-5)' }}>
            This page wandered off for a coffee. Let's get you back to something good.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn--primary btn--lg" to="/">Back home</Link>
            <Link className="btn btn--ghost btn--lg" to="/menu">See the menu</Link>
          </div>
          {/* a small hat moment: the wish hat, and a way to /wish */}
          <WishNudge lead="Looking for a drink we don’t make yet?" />
        </div>
      </section>
    </>
  );
}
