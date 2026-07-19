import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import { asset } from '../../lib/config.js';

/* Landing concept #2 — Warm Storefront: an immersive, photography-led hero.
   A full-bleed coffee shot behind a warm scrim with a gilt keyline frame, the
   welcome line anchored bottom-left so it never fights the photo, plus today's
   open/closed status. */
const HERO_PHOTO = asset('images/wall/whats-on.jpg');

export default function WarmStorefrontHero({ data = {} }) {
  // Concept-specific keys (wsh_*) so editing this look never bleeds into the
  // other concepts sharing the same hero row's data object.
  const bg = data.background_image_url || HERO_PHOTO;
  const {
    wsh_eyebrow: eyebrow = 'Haddon Heights, New Jersey',
    wsh_title: title = 'Pull up a chair',
    wsh_sub: sub = 'Serious coffee, scratch-made paninis and pastries, and a green-walled room full of art that our regulars call a second home.',
    order_label: orderLabel = 'Order Now',
    wsh_ghost_label: ghostLabel = 'See the menu',
  } = data;
  return (
    <section className="wsh">
      <div className="wsh__photo" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />
      <div className="wsh__scrim" aria-hidden="true" />
      <div className="container wsh__inner">
        <div className="wsh__content">
          <p className="wsh__eyebrow">✦&nbsp; {eyebrow} &nbsp;✦</p>
          <h1 className="wsh__title">{title}</h1>
          <p className="wsh__sub">{sub}</p>
          <div className="wsh__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--lg wsh__ghost" to="/menu">{ghostLabel}</Link>
          </div>
          <div className="wsh__hours"><HoursToday /></div>
        </div>
      </div>
    </section>
  );
}
