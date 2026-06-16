import { FaMugHot } from 'react-icons/fa6';
import { SPOTON_ORDER_URL } from '../lib/config.js';
import { track } from '../lib/analytics.js';

/* The primary conversion across the whole site: deep-links to the shop's hosted
   SpotOn Order page (v1 ordering strategy — see docs/DECISIONS.md). Tracks the
   click as the primary GA4 conversion event. A little coffee mug keeps the CTA
   on-brand everywhere it appears. */
export default function OrderButton({ label = 'Order Now', className = 'btn btn--accent', url, location = 'unknown' }) {
  const href = url || SPOTON_ORDER_URL;
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('order_now_click', { location })}
    >
      <FaMugHot aria-hidden="true" /> {label}
    </a>
  );
}
