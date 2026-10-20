import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GA4_ID, CONSENT_KEY } from './config.js';
import { recordStat } from './siteStats.js';

/* Consent-gated Google Analytics 4 (§5.10, §5.12).
   GA4 only loads AFTER the visitor accepts the consent banner, and only if a
   Measurement ID is configured. Until then, every GA call is a safe no-op.

   Separately, every track() and page view also adds 1 to the shop's own
   cookieless daily counts (src/lib/siteStats.js). Those store no personal
   data, no cookies and nothing on the device, so they don't wait for consent;
   the reasoning is in that file. GA4's behaviour is unchanged. */

let loaded = false;

export function hasConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function loadGA() {
  if (loaded || !GA4_ID || !hasConsent() || typeof document === 'undefined') return;
  loaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { anonymize_ip: true });
}

/** Track a key event (Order clicks, form submits, outbound clicks…). No-op without consent.
    Safe to call before useAnalytics has run (e.g. from a child's effect on
    the first load, like a fox deep link): GA is set up on the spot, and its
    gtag() stub queues the event in dataLayer until the script arrives. The
    site stats queue in memory by themselves (siteStats.js). */
export function track(name, params = {}) {
  recordStat(name, params); // aggregate counts only; whitelisted events; never from /admin
  if (!GA4_ID || !hasConsent()) return;
  loadGA(); // idempotent: makes sure gtag exists for an event that comes first
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

/** Hook: load GA on consent and record SPA page views on route change. */
export function useAnalytics() {
  const location = useLocation();
  useEffect(() => {
    recordStat('page_view', { path: location.pathname }); // cookieless daily count (not GA)
    loadGA();
    if (GA4_ID && hasConsent() && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
      });
    }
  }, [location.pathname, location.search]);
}
