import { Link } from 'react-router-dom';
import { Flourish, CoffeeCup, Beans } from '../Motifs.jsx';

/* The page banner used at the top of most non-home pages.

   `cta_url` used to render as a react-router <Link> whatever it was, so an
   owner who pasted a full https:// address got a broken in-app route instead
   of a link off the site. External URLs and tel: now render as real anchors. */
export default function Hero({ data = {} }) {
  const { eyebrow, heading, subheading, background_image_url, cta_label, cta_url } = data;
  const hasImage = Boolean(background_image_url);
  const internal = cta_url && cta_url.startsWith('/');
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
        {eyebrow && <p className="hero__eyebrow">{eyebrow}</p>}
        {heading && <h1>{heading}</h1>}
        <Flourish className="hero__flourish" width={210} color={hasImage ? 'rgba(255,253,247,0.9)' : 'var(--color-yellow)'} />
        {subheading && <p className="hero__sub">{subheading}</p>}
        {cta_label && cta_url && (
          <p className="hero__cta">
            {internal ? (
              <Link className="btn btn--accent btn--lg" to={cta_url}>{cta_label}</Link>
            ) : (
              <a
                className="btn btn--accent btn--lg"
                href={cta_url}
                target={cta_url.startsWith('tel:') ? undefined : '_blank'}
                rel="noopener noreferrer"
              >
                {cta_label}
              </a>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
