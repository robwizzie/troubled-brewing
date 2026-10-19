import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import Reveal from '../Reveal.jsx';
import FramedPhoto from '../PagePhoto.jsx';
import ActionLink from '../ActionLink.jsx';

/* A call-to-action band. If the button points at ordering (empty url or a spoton
   link, or label mentions "order"), it routes through OrderButton so the click is
   tracked as the primary conversion and deep-links to SpotOn. Otherwise it's a
   normal internal/external link.

   Give it a photo (`image_url`) and it becomes the photo panel used on the
   inside pages: a deep-sage panel, the ask on one side, the photo hung in a
   gallery frame on the other, an optional second button. Same section type on
   purpose — other parts of the site (the fox's "can I host something?"
   answer) read these rows by type, so the look changes but the row doesn't.
   Without a photo, a second label + link shows as a small text link under
   the button. */
function PhotoPanel({ data }) {
  const {
    eyebrow = '',
    heading = '',
    body = '',
    button_label: label = 'Order Now',
    button_url: url = '',
    secondary_label: label2 = '',
    secondary_url: url2 = '',
    image_url: imageUrl = '',
    image_alt: imageAlt = '',
    frame_style: frame = 'black-mat',
  } = data;
  return (
    <section className="section pg-cta">
      <div className="container">
        <div className="pg-cta__panel">
          <div className="pg-cta__copy">
            {eyebrow && <p className="pg-cta__eyebrow">{eyebrow}</p>}
            {heading && <h2 className="pg-cta__title">{heading}</h2>}
            {body && <p className="pg-cta__body">{body}</p>}
            <p className="pg-cta__actions">
              <ActionLink label={label} url={url} className="btn btn--accent btn--lg" location="cta" />
              <ActionLink label={label2} url={url2} className="btn pg-cta__ghost" location="cta" />
            </p>
          </div>
          <FramedPhoto url={imageUrl} alt={imageAlt} frame={frame} ratio={1} sizes="(min-width: 900px) 320px, 62vw" className="pg-cta__frame" />
        </div>
      </div>
    </section>
  );
}

export default function CTA({ data = {} }) {
  if (data.image_url) return <PhotoPanel data={data} />;
  const { heading, body, button_label = 'Order Now', button_url, secondary_label: label2 = '', secondary_url: url2 = '' } = data;
  const looksLikeOrder =
    !button_url || /spoton|order/i.test(button_url) || /order/i.test(button_label);
  const internal = button_url && button_url.startsWith('/');
  const tel = button_url && button_url.startsWith('tel:');

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <div className="cta-band">
          <div>
            {heading && <h2 style={{ marginBottom: 'var(--space-2)' }}>{heading}</h2>}
            {body && <p style={{ margin: 0, color: 'var(--color-text-soft)' }}>{body}</p>}
          </div>
          <div className="cta-band__action">
            {looksLikeOrder && !internal && !tel ? (
              <OrderButton label={button_label} url={button_url} className="btn btn--accent btn--lg" location="cta" />
            ) : internal ? (
              <Link className="btn btn--primary btn--lg" to={button_url}>{button_label}</Link>
            ) : (
              <a className="btn btn--primary btn--lg" href={button_url}>{button_label}</a>
            )}
            {/* the plain band's second action is a quiet text link under the
                button (e.g. the menu's "Send a gift card"), not a rival button */}
            {label2 && url2 && (
              <p className="cta-band__aside">
                <ActionLink label={label2} url={url2} className="cta-band__link" location="cta-aside" />
              </p>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
