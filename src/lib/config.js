// Env-derived public constants. All VITE_* values are safe to ship.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://troublebrewingcoffeehouse.com';
export const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

// The shop's hosted SpotOn Order page. v1 ordering is a deep link to this.
// A section/content_block button_url can override per-instance; this is the default.
export const SPOTON_ORDER_URL =
  import.meta.env.VITE_SPOTON_ORDER_URL || 'https://www.spoton.com/order/';

export const CONSENT_KEY = 'tbch-consent-v1';

/* Resolve a path under the deploy base (e.g. "/troubled-brewing/"). Use for any
   static asset in public/ so it works on the project-page subpath. */
export const asset = (p) => `${import.meta.env.BASE_URL}${String(p).replace(/^\//, '')}`;

/* Brand image slots. Drop the real files in public/images/brand/ with these exact
   names and they appear automatically (graceful fallbacks until then).
   See public/images/brand/README.md. */
export const BRAND = {
  logoPrimary: asset('images/brand/logo-primary.png'),     // TROUBLE BREWING wordmark
  logoSecondary: asset('images/brand/logo-secondary.png'), // secondary logo
  logoFox: asset('images/brand/logo-fox.png'),             // primary logo WITH the fox (badge)
  foxMascot: asset('images/brand/fox-mascot.png'),         // standing dapper top-hat fox (easter egg)
  foxHead: asset('images/brand/fox-head.png'),             // gold fox-head sculpture (gallery wall)
  footerBanner: asset('images/brand/fox-footer-top.svg'),  // fox emerging from coffee (footer top band) — SVG, crisp at any size
};

