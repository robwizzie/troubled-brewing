import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';

/* Landing concept #3: magazine-style editorial. Serif headline, a short
   "why we exist" intro, soft rhythm. Swap in via Quick Blocks. */
export default function CozyEditorialHero({ data = {} }) {
  const {
    heading = 'Good coffee. Good trouble.',
    subheading = "We left the spreadsheets behind to build the kind of corner café a town actually needs — serious about La Colombe coffee, relaxed about everything else.",
    background_image_url,
  } = data;

  return (
    <section className="editorial-hero">
      <div className="container editorial-hero__grid">
        <div className="editorial-hero__text">
          <p className="eyebrow">An independent coffee house</p>
          <h1>{heading}</h1>
          <p className="hero__sub" style={{ marginLeft: 0 }}>{subheading}</p>
          <p style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <OrderButton label="Order Now" className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/about">Our story</Link>
          </p>
        </div>
        <div className="editorial-hero__media">
          {background_image_url ? (
            <img src={background_image_url} alt="" />
          ) : (
            <div className="editorial-hero__placeholder" aria-hidden="true">☕</div>
          )}
        </div>
      </div>
    </section>
  );
}
