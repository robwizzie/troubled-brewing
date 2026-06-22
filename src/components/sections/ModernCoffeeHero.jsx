import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import { FoxEmblem } from '../Motifs.jsx';
import { asset } from '../../lib/config.js';

/* Landing concept #4 — Modern Coffee: a bold, dark, contemporary hero. An
   oversized wordmark with the signature drink shot popping in front of it,
   a stat row, and a rotating badge. Dark espresso → caramel palette. */
const DRINK = asset('images/wall/order-menu.jpg');

export default function ModernCoffeeHero() {
  return (
    <section className="mch">
      <div className="container mch__inner">
        <p className="mch__eyebrow">Coffee House · Haddon Heights, New Jersey</p>

        <div className="mch__stage">
          <h1 className="mch__word">TROUBLE</h1>
          <div className="mch__drink">
            <img src={DRINK} alt="Trouble Brewing signature iced coffee" loading="eager" />
          </div>
          <Link to="/menu" className="mch__menu">Menu</Link>
        </div>
        <p className="mch__brand"><i aria-hidden="true">✦</i> Brewing <i aria-hidden="true">✦</i></p>

        <div className="mch__row">
          <p className="mch__lead">
            Bold espresso, scratch-made paninis and pastries, and a green-walled
            room worth lingering in — crafted fresh on Station Ave.
          </p>
          <ul className="mch__stats">
            <li><b>20+</b><span>Signature drinks</span></li>
            <li><b>4.9★</b><span>Neighborhood rating</span></li>
            <li><b>7&nbsp;days</b><span>Open weekly</span></li>
          </ul>
        </div>

        <OrderButton label="Order Now" className="btn btn--accent btn--lg mch__order" location="hero" />

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
          <FoxEmblem className="mch__badge-fox" size={40} />
        </div>

        <Link to="/menu" className="mch__arrow" aria-label="See the menu">→</Link>
      </div>
    </section>
  );
}
