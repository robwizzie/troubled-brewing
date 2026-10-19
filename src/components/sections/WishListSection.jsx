import { useContext } from 'react';
import { CanvasEditingContext } from '../../lib/canvasContext.jsx';
import { WishFlow, WishSection } from '../FoxWish.jsx';

/* "Wish list" — the owner can drop the make-a-wish form onto any page from
   the admin. The same flow as the fox's card and /wish (src/components/
   FoxWish.jsx): one wish a day, the same checks, the submit_wish RPC and
   the wish_submitted stat. Wishes land in Admin → Wish list. Blank fields
   fall back to the defaults below. */
const WISH_LIST_DEFAULTS = {
  heading: 'Make a wish for the menu',
  intro: 'A drink or a treat you’d love to see? Tom and Cat read every one.',
};

export default function WishListSection({ data = {} }) {
  const canvas = useContext(CanvasEditingContext);
  const heading = (data.heading || '').trim() || WISH_LIST_DEFAULTS.heading;
  const intro = (data.intro || '').trim() || WISH_LIST_DEFAULTS.intro;
  // inside the editor the form is shown but can't send a wish
  if (canvas) {
    return (
      <section className="section wish-section" aria-label={heading}>
        <div className="container" inert="">
          <WishFlow variant="split" intro={<><h2 className="wish-section__title">{heading}</h2><p className="wish-section__lede">{intro}</p></>} />
        </div>
      </section>
    );
  }
  return <WishSection heading={heading} intro={intro} />;
}
