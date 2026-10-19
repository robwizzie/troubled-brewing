import { Link } from 'react-router-dom';
import OrderButton from './OrderButton.jsx';

/* One button from owner-entered label + url, routed the way the CTA band does
   it: blank / SpotOn / "order" → the tracked OrderButton; "/page" → an in-app
   Link (keeps the deploy base path); tel:, mailto: and https:// → a real
   anchor (external ones in a new tab). Nothing renders without a label, and a
   blank url only makes sense for an order button. */
const isOrderLink = (label = '', url = '') =>
  /spoton/i.test(url) || (/\border\b/i.test(label) && !url.startsWith('/') && !/^(tel|mailto):/i.test(url));

export default function ActionLink({ label, url = '', className = 'btn btn--primary', location = 'page' }) {
  if (!label) return null;
  if (!url && !isOrderLink(label, url)) return null;
  if (isOrderLink(label, url)) return <OrderButton label={label} url={url || undefined} className={className} location={location} />;
  if (url.startsWith('/')) return <Link className={className} to={url}>{label}</Link>;
  const external = /^https?:\/\//i.test(url);
  return (
    <a className={className} href={url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
      {label}
    </a>
  );
}
