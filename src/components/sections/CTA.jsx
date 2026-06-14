import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import Reveal from '../Reveal.jsx';

/* A call-to-action band. If the button points at ordering (empty url or a spoton
   link, or label mentions "order"), it routes through OrderButton so the click is
   tracked as the primary conversion and deep-links to SpotOn. Otherwise it's a
   normal internal/external link. */
export default function CTA({ data = {} }) {
  const { heading, body, button_label = 'Order Now', button_url } = data;
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
          </div>
        </div>
      </div>
    </Reveal>
  );
}
