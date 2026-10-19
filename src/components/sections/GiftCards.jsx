import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { GIFT_CARD_URL, BRAND, asset } from '../../lib/config.js';
import { SITE } from '../../lib/seed.js';
import { track } from '../../lib/analytics.js';

/* "Give someone Trouble" — the gift-card page.

   A warm hero (the dapper top-hat fox beside a drawn Trouble gift card), one
   clear "Buy an e-gift card" button and a single honest line on how e-gift
   cards work; then a few occasion cards for inspiration. Every card is a link
   to the same purchase page — they're there to spark the idea, not to sell a
   different product.

   The purchase link: the section's own `button_url` (http/https only) wins;
   otherwise GIFT_CARD_URL from config.js (the shop's SecureTree e-gift
   card store, env-overridable). It always opens in a new tab.

   No prices, amounts, bonuses or expiry rules on purpose: the gift card store owns
   those, and the page shouldn't promise anything the checkout doesn't. */

const OCCASION_SLOTS = [1, 2, 3, 4];
const OCCASION_ART = ['cake', 'thanks', 'apple', 'fox', 'cup', 'heart'];

/* Little line drawings in the site's Pictogram style (2px ink strokes on a
   100×100 box), coloured by the card's tone. */
function Art({ kind }) {
  if (kind === 'fox') {
    return <img className="gc-occ__fox" src={asset('images/brand/fox-sipping.png')} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
  }
  const paths = {
    cake: (
      <>
        <path d="M24 56 H76 V82 H24 Z" />
        <path d="M24 64 C30 70 36 58 42 64 C48 70 54 58 60 64 C66 70 72 58 76 64" />
        <path d="M18 82 H82" />
        <path d="M38 56 V42 M50 56 V40 M62 56 V42" />
        <path className="gc-art__fill" d="M38 36 C35 32 38 28 38 26 C41 30 41 33 38 36 Z M50 34 C47 30 50 26 50 24 C53 28 53 31 50 34 Z M62 36 C59 32 62 28 62 26 C65 30 65 33 62 36 Z" />
      </>
    ),
    thanks: (
      <>
        <rect x="16" y="30" width="68" height="46" rx="3" />
        <path d="M16 33 L50 58 L84 33" />
        <path className="gc-art__fill" d="M50 74 C40 66 38 60 42 56 C45 53 50 55 50 59 C50 55 55 53 58 56 C62 60 60 66 50 74 Z" />
      </>
    ),
    apple: (
      <>
        <path d="M50 36 C42 28 24 30 24 50 C24 68 36 82 44 82 C47 82 48 80 50 80 C52 80 53 82 56 82 C64 82 76 68 76 50 C76 30 58 28 50 36 Z" />
        <path d="M50 36 C50 30 52 24 56 20" />
        <path className="gc-art__fill" d="M53 26 C58 18 68 18 72 22 C66 28 58 29 53 26 Z" />
      </>
    ),
    cup: (
      <>
        <path d="M26 44 H70 V60 C70 72 62 80 48 80 C34 80 26 72 26 60 Z" />
        <path d="M70 48 C80 48 82 62 70 64" />
        <path d="M20 84 H76" />
        <path d="M40 36 C36 30 44 26 40 20 M52 36 C48 30 56 26 52 20" />
      </>
    ),
    heart: <path className="gc-art__fill" d="M50 80 C24 61 20 39 34 31 C43 26 50 33 50 41 C50 33 57 26 66 31 C80 39 76 61 50 80 Z" />,
  };
  return (
    <svg className="gc-occ__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{paths[kind] || paths.heart}</g>
    </svg>
  );
}

/* The drawn gift card in the hero: sage card, gold rule and corners, the
   sipping fox and the wordmark. Pure decoration. */
function DrawnCard() {
  return (
    <div className="gc-card" aria-hidden="true">
      <span className="gc-card__corner gc-card__corner--tl" />
      <span className="gc-card__corner gc-card__corner--br" />
      <img className="gc-card__fox" src={asset('images/brand/fox-sipping.png')} alt="" loading="eager" decoding="async" />
      <span className="gc-card__brand">Trouble Brewing</span>
      <span className="gc-card__kind">e-gift card</span>
      <span className="gc-card__addr">514 Station Ave · Haddon Heights</span>
    </div>
  );
}

function giftCardUrl(override) {
  const u = String(override || '').trim();
  return /^https?:\/\//i.test(u) ? u : GIFT_CARD_URL;
}

export default function GiftCards({ data = {} }) {
  const {
    eyebrow = 'Gift cards',
    heading = 'Give someone Trouble',
    intro = '',
    button_label: label = 'Buy an e-gift card',
    button_url: buttonUrl = '',
    how_it_works: how = "Pick an amount, add a note, and we'll email it.",
    occasions_heading: occHeading = 'A little Trouble for…',
    occasions_hint: occHint = 'Tap a card to send one.',
    show_phone: showPhone = true,
  } = data;
  const href = giftCardUrl(buttonUrl);
  const occasions = OCCASION_SLOTS.map((n) => ({
    n,
    label: data[`occasion_${n}_label`] || '',
    note: data[`occasion_${n}_note`] || '',
    art: data[`occasion_${n}_art`] || OCCASION_ART[n - 1],
  })).filter((o) => o.label);
  const go = (where) => () => track('gift_card_click', { location: where });

  return (
    <section className="section gc">
      <div className="container">
        <div className="gc-hero">
          <div className="gc-hero__copy">
            {eyebrow && <p className="gc-hero__eyebrow">{eyebrow}</p>}
            <h1 className="gc-hero__title">{heading}</h1>
            {intro && <p className="gc-hero__intro">{intro}</p>}
            <p className="gc-hero__actions">
              <a className="gc-buy" href={href} target="_blank" rel="noopener noreferrer" onClick={go('gift-cards-hero')}>
                {label}
                <FaArrowUpRightFromSquare aria-hidden="true" className="gc-buy__icon" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
            {how && <p className="gc-hero__how">{how}</p>}
          </div>
          <div className="gc-hero__art">
            <DrawnCard />
            <img className="gc-hero__fox" src={BRAND.foxMascot} alt="" aria-hidden="true" loading="eager" decoding="async" />
          </div>
        </div>

        {occasions.length > 0 && (
          <div className="gc-occ">
            <h2 className="gc-occ__heading">{occHeading}</h2>
            {occHint && <p className="gc-occ__hint">{occHint}</p>}
            <ul className="gc-occ__list" data-count={occasions.length}>
              {occasions.map((o, i) => (
                <li key={o.n} className={`gc-occ__item gc-occ__item--${['raspberry', 'gold', 'sage', 'ink'][i % 4]}`}>
                  <a className="gc-occ__card" href={href} target="_blank" rel="noopener noreferrer" onClick={go(`gift-cards-occasion-${o.n}`)}>
                    <span className="gc-occ__art"><Art kind={o.art} /></span>
                    <span className="gc-occ__label">{o.label}</span>
                    {o.note && <span className="gc-occ__note">{o.note}</span>}
                    <span className="sr-only"> — buy an e-gift card (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showPhone && (
          <p className="gc-foot">
            Questions about a gift card? Call us at <a href={SITE.phoneHref}>{SITE.phone}</a>.
          </p>
        )}
      </div>
    </section>
  );
}
