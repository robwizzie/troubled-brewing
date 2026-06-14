import { Link } from 'react-router-dom';

export default function Hero({ data = {} }) {
  const { heading, subheading, background_image_url, cta_label, cta_url } = data;
  const hasImage = Boolean(background_image_url);
  return (
    <section
      className={`hero ${hasImage ? 'hero--image' : ''}`}
      style={hasImage ? { backgroundImage: `url(${background_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div className="container">
        {heading && <h1>{heading}</h1>}
        {subheading && <p className="hero__sub">{subheading}</p>}
        {cta_label && cta_url && (
          <p style={{ marginTop: 'var(--space-5)' }}>
            <Link className="btn btn--accent btn--lg" to={cta_url}>{cta_label}</Link>
          </p>
        )}
      </div>
    </section>
  );
}
