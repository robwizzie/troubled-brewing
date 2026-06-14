// Env-derived public constants. All VITE_* values are safe to ship.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://troublebrewingcoffeehouse.com';
export const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

// The shop's hosted SpotOn Order page. v1 ordering is a deep link to this.
// A section/content_block button_url can override per-instance; this is the default.
export const SPOTON_ORDER_URL =
  import.meta.env.VITE_SPOTON_ORDER_URL || 'https://www.spoton.com/order/';

export const CONSENT_KEY = 'tbch-consent-v1';
