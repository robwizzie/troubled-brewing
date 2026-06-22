import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import { asset } from '../../lib/config.js';

/* Landing concept #3 — Cozy Editorial: a magazine-style split. Oversized serif
   headline + founders' note on the left; a gilt-framed feature photo with a
   smaller overlapping inset on the right, echoing the gallery wall. */
const MAIN_PHOTO = asset('images/wall/order-menu.jpg');   // signature iced coffee
const INSET_PHOTO = asset('images/wall/troublemakers.jpg'); // latte-art pour

export default function CozyEditorialHero() {
  return (
    <section className="ceh">
      <div className="container ceh__grid">
        <div className="ceh__text">
          <p className="ceh__eyebrow">An independent coffee house · Haddon Heights</p>
          <h1 className="ceh__title">Good coffee.<br />Good food.<br /><em>Good Trouble.</em></h1>
          <p className="ceh__lead">
            Two ex-bankers, one green-walled room, and a serious thing for good
            espresso. We press the paninis, bake the scones, and pull every shot
            with care — then keep the vibe relaxed.
          </p>
          <p className="ceh__sig">— Tom &amp; Cat</p>
          <div className="ceh__cta">
            <OrderButton label="Order Now" className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/about">Our story</Link>
          </div>
        </div>

        <div className="ceh__media" aria-hidden="true">
          <figure className="ceh__frame ceh__frame--main">
            <img src={MAIN_PHOTO} alt="" loading="eager" />
          </figure>
          <figure className="ceh__frame ceh__frame--inset">
            <img src={INSET_PHOTO} alt="" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  );
}
