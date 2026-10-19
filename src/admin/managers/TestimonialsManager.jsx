import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus } from 'react-icons/lu';
import CollectionManager from '../components/CollectionManager.jsx';
import { Icon } from '../components/Icon.jsx';
import { loadReviews } from '../../lib/reviews.js';
import { useToast, Hint } from '../components/ui.jsx';

/* One-click import from the cached Google review library: pick a review, it
   joins the list below as a NEW quote — it goes on the site with the next
   Publish, like any other change.

   The list comes from loadReviews({ only: 'google' }), which is the same
   selection the public site uses — so it honors the owner's star minimum and
   anything they hid, and reviews already imported are gone from it (they
   dedupe onto their testimonial). No second definition of "a good review". */
function GoogleImport({ onAdded }) {
  const [reviews, setReviews] = useState(null);
  const [added, setAdded] = useState(() => new Set());
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    loadReviews({ only: 'google' }).then((r) => alive && setReviews(r.reviews.filter((x) => x.quote)));
    return () => { alive = false; };
  }, []);

  if (!reviews || reviews.length === 0) return null;
  const remaining = reviews.filter((r) => !added.has(r.key));
  if (remaining.length === 0) return null;

  function add(r) {
    onAdded({
      author: r.author,
      source: 'Google',
      rating: Math.min(5, Math.round(r.rating || 5)),
      quote: r.quote,
      image_url: r.photo || '',
      featured: false,
    });
    setAdded((s) => new Set(s).add(r.key));
    toast('Added to the list — press Publish to put it on the site');
  }

  return (
    <section className="admin-import">
      <h2 className="admin-import__title">From your Google reviews</h2>
      <Hint>
        Your real Google reviews, filtered exactly the way the site filters them. Click
        <strong> Add</strong> to hand-pick one as a quote you can re-word and feature.
        To change the star minimum, hide a review, or attach its photo, use{' '}
        <Link to="/admin/reviews">Reviews</Link>.
      </Hint>
      <ul className="admin-import__list">
        {remaining.map((r) => (
          <li key={r.id} className="admin-import__row">
            <div className="admin-import__meta">
              <strong>{r.author}</strong>
              <span className="admin-import__stars">{Math.min(5, Math.round(r.rating || 5))} stars</span>
              <p className="admin-import__text">{r.quote}</p>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => add(r)}><Icon icon={LuPlus} size={16} />Add</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Exported so the on-page editor can embed this collection in its panel. */
export const TESTIMONIALS_COLLECTION = {
  table: 'testimonials',
  title: 'Testimonials',
  singular: 'testimonial',
  labelKey: 'author',
  defaultItem: { source: 'Google', featured: false },
  summary: (t) => `${t.rating ? `${t.rating} stars · ` : ''}${t.source || ''}${t.featured ? ' · featured' : ''}${t.image_url ? ' · has a photo' : ''}`,
  fields: [
    { name: 'quote', label: 'Quote', type: 'textarea', required: true, hint: 'Paste the review text. Pick your best!' },
    { name: 'author', label: 'Name', type: 'text', required: true, hint: "First name + last initial, e.g. 'Sarah M.'" },
    { name: 'source', label: 'Source', type: 'text', hint: "Usually 'Google'." },
    { name: 'rating', label: 'Stars (1–5)', type: 'number', min: 1 },
    { name: 'image_url', label: 'Photo (optional)', type: 'image', preset: 'card', hint: 'Save the photo from the review on Google and upload it here — Google’s API never sends review photos. Photo reviews lead the homepage strip and get their own filter on the site.' },
    { name: 'featured', label: 'Feature this one', type: 'checkbox', hint: 'Featured testimonials show first.' },
  ],
};

export default function TestimonialsManager() {
  const listRef = useRef(null);
  return (
    <>
      <CollectionManager
        ref={listRef}
        {...TESTIMONIALS_COLLECTION}
        title="Hand-picked quotes"
        help="Your favourite quotes, shown above the Google reviews on the Reviews page and in the homepage strip."
      />
      <GoogleImport onAdded={(item) => listRef.current?.stageNew(item)} />
    </>
  );
}
