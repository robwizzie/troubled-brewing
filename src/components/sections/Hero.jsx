import { Link } from 'react-router-dom';
import { Flourish, CoffeeCup, Beans } from '../Motifs.jsx';

export default function Hero({ data = {} }) {
  const { heading, subheading, background_image_url, cta_label, cta_url } = data;
  const hasImage = Boolean(background_image_url);
  return (
    <section
      className={`hero ${hasImage ? 'hero--image' : ''}`}
      style={hasImage ? { backgroundImage: `url(${background_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {!hasImage && (
        <>
          <CoffeeCup className="hero__deco hero__deco--cup" size={140} color="var(--color-green-deep)" steam={false} />
          <Beans className="hero__deco hero__deco--beans" size={104} color="var(--color-yellow-deep)" />
        </>
      )}
      <div className="container">
        {heading && <h1>{heading}</h1>}
        <Flourish className="hero__flourish" width={210} color={hasImage ? 'rgba(255,253,247,0.9)' : 'var(--color-yellow)'} />
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
