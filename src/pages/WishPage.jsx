import { Link } from 'react-router-dom';
import { LuBookOpen } from 'react-icons/lu';
import SEO from '../components/SEO.jsx';
import { WishFlow } from '../components/FoxWish.jsx';

/* /wish — "Make a wish for the menu" as a page of its own, with a big top
   hat to catch the note. The same flow as the fox's card (?fox=wish keeps
   working on any page, this one included), so the rules, the one-wish-a-day
   limit and the stats are the same wherever a wish is made. A table-card QR
   can point here as /wish?src=table (counted as a table-card scan). */
export default function WishPage() {
  return (
    <>
      <SEO path="/wish" />
      <section className="wish-page" aria-labelledby="wish-page-title">
        <div className="container">
          <WishFlow
            variant="split"
            className="fox-wish--page"
            intro={(
              <>
                <h1 className="wish-page__title" id="wish-page-title">Make a wish for the menu</h1>
                <p className="wish-page__lede">
                  A drink, a pastry or a dish you’d love to see at the counter? Write it on a note and drop it in the hat.
                  Tom and Cat read every one.
                </p>
              </>
            )}
            after={(
              <Link className="wish-page__menu" to="/menu">
                <LuBookOpen aria-hidden="true" /> See today’s menu
              </Link>
            )}
          />
        </div>
      </section>
    </>
  );
}
