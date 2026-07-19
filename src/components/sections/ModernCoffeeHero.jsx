import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import BrandImg from '../BrandImg.jsx';
import { FoxEmblem } from '../Motifs.jsx';
import { asset, BRAND } from '../../lib/config.js';

/* Landing concept #4 — Modern Coffee: a bold, dark, contemporary hero. An
   oversized wordmark with the signature drink shot popping in front of it,
   a stat row, and a rotating badge. Dark espresso → caramel palette. */
const DRINK = asset('images/wall/order-menu.jpg');

export default function ModernCoffeeHero({ data = {} }) {
  // Concept-specific keys (mch_*) so editing this look never bleeds into the
  // other concepts sharing the same hero row's data object.
  const {
    mch_eyebrow: eyebrow = 'Coffee House · Haddon Heights, New Jersey',
    mch_word: word = 'TROUBLE',
    mch_brand: brand = 'Brewing',
    mch_lead: lead = 'Bold espresso, scratch-made paninis and pastries, and a green-walled room worth lingering in — crafted fresh on Station Ave.',
    mch_drink_image_url: drinkPhoto = DRINK,
    mch_stats: statsSrc = '20+ | Signature drinks\n4.9★ | Neighborhood rating\n7 days | Open weekly',
    order_label: orderLabel = 'Order Now',
  } = data;
  // "Big | Little label" per line
  const stats = String(statsSrc)
    .split('\n')
    .map((line) => line.split('|'))
    .filter((parts) => parts[0]?.trim())
    .map(([b, s]) => ({ b: b.trim(), s: (s || '').trim() }));
  return (
    <section className="mch">
      <div className="container mch__inner">
        <p className="mch__eyebrow">{eyebrow}</p>

        <div className="mch__stage">
          <h1 className="mch__word">{word}</h1>
          <div className="mch__drink">
            <img src={drinkPhoto} alt="Trouble Brewing signature iced coffee" loading="eager" />
          </div>
          <Link to="/menu" className="mch__menu">Menu</Link>
        </div>
        <p className="mch__brand"><i aria-hidden="true">✦</i> {brand} <i aria-hidden="true">✦</i></p>

        <div className="mch__row">
          <p className="mch__lead">{lead}</p>
          <ul className="mch__stats">
            {stats.map((st, i) => (
              <li key={i}><b>{st.b}</b><span>{st.s}</span></li>
            ))}
          </ul>
        </div>

        <OrderButton label={orderLabel} className="btn btn--accent btn--lg mch__order" location="hero" />

        <div className="mch__badge" aria-hidden="true">
          <svg viewBox="0 0 140 140" className="mch__badge-svg">
            <defs>
              <path id="mch-ring" d="M70,70 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" />
            </defs>
            <text className="mch__badge-text">
              <textPath href="#mch-ring" startOffset="0">
                TROUBLE BREWING · GOOD COFFEE · GOOD TROUBLE ·&nbsp;
              </textPath>
            </text>
          </svg>
          <BrandImg src={BRAND.foxHead} alt="" loading="lazy" className="mch__badge-fox" fallback={<FoxEmblem size={48} />} />
        </div>

        <Link to="/menu" className="mch__arrow" aria-label="See the menu">→</Link>
      </div>
    </section>
  );
}
