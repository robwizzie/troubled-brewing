import FramedPhoto, { Photo } from '../PagePhoto.jsx';
import ActionLink from '../ActionLink.jsx';

/* A page opener built around one of the shop's real photographs.

   layout "framed" (default): the sage wall of the shop as the band, the copy
   on the left, and the photo hung in a gallery frame on the right (stacked
   on a phone, photo first so the page opens on the room).
   layout "full": the photo full-bleed behind the copy — for the storefront,
   where the picture IS the information ("look for the black door").

   With no photo it degrades to the same band with the copy alone, so an
   owner clearing the image never leaves a hole. */
export default function PhotoHero({ data = {} }) {
  const {
    eyebrow = '',
    heading = '',
    subheading = '',
    image_url: imageUrl = '',
    image_alt: imageAlt = '',
    caption = '',
    frame_style: frame = 'gilt-grand',
    layout = 'framed',
    focus = '',
    cta_label: ctaLabel = '',
    cta_url: ctaUrl = '',
    secondary_label: secondaryLabel = '',
    secondary_url: secondaryUrl = '',
  } = data;

  const buttons = (ctaLabel || secondaryLabel) && (
    <p className="pg-hero__actions">
      <ActionLink label={ctaLabel} url={ctaUrl} className="btn btn--accent btn--lg" location="page_hero" />
      <ActionLink label={secondaryLabel} url={secondaryUrl} className="btn btn--ghost pg-hero__ghost btn--lg" location="page_hero" />
    </p>
  );
  const copy = (
    <div className="pg-hero__copy">
      {eyebrow && <p className="pg-hero__eyebrow">{eyebrow}</p>}
      {heading && <h1 className="pg-hero__title">{heading}</h1>}
      {subheading && <p className="pg-hero__sub">{subheading}</p>}
      {buttons}
    </div>
  );

  if (layout === 'full' && imageUrl) {
    return (
      <section className="pg-hero pg-hero--full">
        <div className="pg-hero__bleed">
          <Photo url={imageUrl} alt={imageAlt} sizes="100vw" eager className="pg-hero__bleed-img" style={focus ? { objectPosition: focus } : undefined} />
        </div>
        <div className="container pg-hero__inner">{copy}</div>
        {caption && <p className="pg-hero__credit">{caption}</p>}
      </section>
    );
  }

  return (
    <section className={`pg-hero pg-hero--framed ${imageUrl ? '' : 'pg-hero--no-photo'}`}>
      <div className="container pg-hero__inner">
        {copy}
        {imageUrl && (
          <FramedPhoto
            url={imageUrl}
            alt={imageAlt}
            caption={caption}
            frame={frame}
            ratio={4 / 5}
            eager
            position={focus || undefined}
            sizes="(min-width: 900px) 460px, 86vw"
            className="pg-hero__frame"
          />
        )}
      </div>
    </section>
  );
}
