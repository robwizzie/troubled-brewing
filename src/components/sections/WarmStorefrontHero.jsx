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
  const bg = data.background_image_url || HERO_PHOTO;
  return (
    <section className="wsh">
      <div className="wsh__photo" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />
      <div className="wsh__scrim" aria-hidden="true" />
      <div className="container wsh__inner">
        <div className="wsh__content">
          <p className="wsh__eyebrow">✦&nbsp; Haddon Heights, New Jersey &nbsp;✦</p>
          <h1 className="wsh__title">Pull up a chair</h1>
          <p className="wsh__sub">
            Serious coffee, scratch-made paninis and pastries, and a green-walled
            room full of art that our regulars call a second home.
          </p>
          <div className="wsh__cta">
            <OrderButton label="Order Now" className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--lg wsh__ghost" to="/menu">See the menu</Link>
          </div>
          <div className="wsh__hours"><HoursToday /></div>
        </div>
      </div>
    </section>
  );
}
