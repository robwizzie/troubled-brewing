import { SITE_URL } from './config.js';
import { SITE, HOURS } from './seed.js';

/* LocalBusiness structured data for SEO (build plan §9). Hours come from the
   seed (kept in step with the live tables); refine geo when the client confirms
   their Google Place ID. */
const DAY_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function to24h(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):?(\d{2})?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? m[2] : '00';
  const mer = m[3] ? m[3].toUpperCase() : null;
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

export function localBusinessJsonLd() {
  const hours = HOURS.filter((h) => h.open_time && h.close_time).map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: DAY_SCHEMA[h.day_of_week],
    opens: to24h(h.open_time),
    closes: to24h(h.close_time),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: SITE.name,
    image: `${SITE_URL.replace(/\/$/, '')}/og-image.jpg`,
    url: SITE_URL,
    telephone: SITE.phone,
    priceRange: '$$',
    servesCuisine: ['Coffee', 'Café'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '514 Station Ave',
      addressLocality: 'Haddon Heights',
      addressRegion: 'NJ',
      postalCode: '08035',
      addressCountry: 'US',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 39.8776, longitude: -75.0635 },
    openingHoursSpecification: hours,
    sameAs: [`https://instagram.com/${SITE.instagram}`],
  };
}
