// Env-derived public constants. All VITE_* values are safe to ship.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://troublebrewingcoffeehouse.com';
export const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

// The shop's hosted SpotOn Order page — every "Order Now" deep-links here.
// A section/content_block button_url can override per-instance, and the
// VITE_SPOTON_ORDER_URL env/secret can override the default; the real store
// URL is baked in so the button works even with no env configured.
export const SPOTON_ORDER_URL =
  import.meta.env.VITE_SPOTON_ORDER_URL ||
  'https://order.spoton.com/so-trouble-brewing-coffee-house-26471/haddon-heights-nj/BL-BBE4-95CF-80CD';

export const CONSENT_KEY = 'tbch-consent-v1';

/* Resolve a path under the deploy base (e.g. "/troubled-brewing/"). Use for any
   static asset in public/ so it works on the project-page subpath. */
export const asset = (p) => `${import.meta.env.BASE_URL}${String(p).replace(/^\//, '')}`;

/* Absolute-path URL for a public page slug, honoring the deploy base. Use for
   raw <a href> / iframe src (react-router Links get the basename for free).
   publicUrl() or publicUrl('home') → the home page; publicUrl('menu') → /menu. */
export const publicUrl = (slug = '') => {
  const s = String(slug).replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${s === 'home' ? '' : s}`;
};

/* Brand image slots. Drop the real files in public/images/brand/ with these exact
   names and they appear automatically (graceful fallbacks until then).
   See public/images/brand/README.md. */
export const BRAND = {
  logoPrimary: asset('images/brand/logo-primary.png'),     // TROUBLE BREWING wordmark (point back at .svg here if a vector ever lands)
  logoSecondary: asset('images/brand/logo-secondary.png'), // secondary logo
  logoFox: asset('images/brand/logo-fox.png'),             // primary logo WITH the fox (badge)
  foxMascot: asset('images/brand/fox-mascot.webp'),        // standing dapper top-hat fox (nav drawer)
  foxHead: asset('images/brand/fox-head.webp'),            // gold fox-head sculpture (gallery wall)
  rabbitHead: asset('images/brand/rabbit-head.webp'),      // gold rabbit-head sculpture — tucked into the gallery wall (falls back to a hare motif)
  footerBanner: asset('images/brand/fox-footer-top.webp'), // fox emerging from coffee (footer top band)
};

