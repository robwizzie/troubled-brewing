import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import { asset } from '../../lib/config.js';

/* Landing concept #3 — Cozy Editorial: a magazine-style split. Oversized serif
   headline + founders' note on the left; a gilt-framed feature photo with a
   smaller overlapping inset on the right, echoing the gallery wall. */
const MAIN_PHOTO = asset('images/wall/order-menu.jpg');   // signature iced coffee
const INSET_PHOTO = asset('images/wall/troublemakers.jpg'); // latte-art pour

export default function CozyEditorialHero({ data = {} }) {
  // Concept-specific keys (ceh_*) so editing this look never bleeds into the
  // other concepts sharing the same hero row's data object.
  const {
    ceh_eyebrow: eyebrow = 'An independent coffee house · Haddon Heights',
    ceh_title: title = 'Good coffee.\nGood food.\nGood Trouble.',
    ceh_lead: lead = 'Two ex-bankers, one green-walled room, and a serious thing for good espresso. We press the paninis, bake the scones, and pull every shot with care — then keep the vibe relaxed.',
    ceh_signature: signature = '— Tom & Cat',
    ceh_main_image_url: mainPhoto = MAIN_PHOTO,
    ceh_inset_image_url: insetPhoto = INSET_PHOTO,
    order_label: orderLabel = 'Order Now',
    ceh_secondary_label: secondaryLabel = 'Our story',
  } = data;
  // Headline lines stack; the last one gets the italic flourish.
  const lines = String(title).split('\n').filter(Boolean);
  return (
    <section className="ceh">
      <div className="container ceh__grid">
        <div className="ceh__text">
          <p className="ceh__eyebrow">{eyebrow}</p>
          <h1 className="ceh__title">
            {lines.map((line, i) => (
              <span key={i}>
                {i === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
                {i < lines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="ceh__lead">{lead}</p>
          <p className="ceh__sig">{signature}</p>
          <div className="ceh__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/about">{secondaryLabel}</Link>
          </div>
        </div>

        <div className="ceh__media" aria-hidden="true">
          <figure className="ceh__frame ceh__frame--main">
            <img src={mainPhoto} alt="" loading="eager" />
          </figure>
          <figure className="ceh__frame ceh__frame--inset">
            <img src={insetPhoto} alt="" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  );
}
