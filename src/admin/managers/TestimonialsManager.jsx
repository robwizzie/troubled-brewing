import { useEffect, useState } from 'react';
import CollectionManager from '../components/CollectionManager.jsx';
import { createRecord } from '../lib/adminData.js';
import { getGoogleProfile } from '../../lib/dataService.js';
import { useToast, Hint } from '../components/ui.jsx';

/* One-click import from the cached Google review library: pick a review,
   it becomes a curated testimonial (then attach the review's photo by hand —
   Google's APIs don't expose per-review images, so owners add them). */
function GoogleImport({ onAdded }) {
  const [reviews, setReviews] = useState(null);
  const [added, setAdded] = useState(() => new Set());
  const toast = useToast();

  useEffect(() => {
    getGoogleProfile().then((p) => setReviews((p?.reviews || []).filter((r) => (r.rating ?? 5) >= 4 && r.text)));
  }, []);

  if (!reviews || reviews.length === 0) return null;

  async function add(r, i) {
    try {
      await createRecord('testimonials', {
        author: r.author,
        source: 'Google',
        rating: Math.min(5, Math.round(r.rating || 5)),
        quote: r.text,
        featured: false,
      });
      setAdded((s) => new Set(s).add(i));
      toast('Added to testimonials');
      onAdded();
    } catch (e) {
      toast(e.message || 'Could not add', 'error');
    }
  }

  return (
    <section className="admin-import">
      <h2 className="admin-import__title">From your Google reviews</h2>
      <Hint>
        The 4★+ reviews cached from Google. Click <strong>Add</strong> to hand-pick one as a
        testimonial — then edit it to attach the review’s photo (if it has one on Google) and
        it joins the “with photos” wall.
      </Hint>
      <ul className="admin-import__list">
        {reviews.map((r, i) => (
          <li key={i} className="admin-import__row">
            <div className="admin-import__meta">
              <strong>{r.author}</strong>
              <span className="admin-import__stars">{'★'.repeat(Math.min(5, Math.round(r.rating || 5)))}</span>
              <p className="admin-import__text">{r.text}</p>
            </div>
            <button type="button" className="btn btn--sm" disabled={added.has(i)} onClick={() => add(r, i)}>
              {added.has(i) ? 'Added ✓' : '+ Add'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TestimonialsManager() {
  // bump remounts the list after a Google import so the new row appears
  const [bump, setBump] = useState(0);
  return (
    <>
      <CollectionManager
        key={bump}
        table="testimonials"
        title="Testimonials"
        singular="testimonial"
        labelKey="author"
        defaultItem={{ source: 'Google', featured: false }}
        summary={(t) => `${t.rating ? '★'.repeat(t.rating) + ' · ' : ''}${t.source || ''}${t.featured ? ' · featured' : ''}${t.image_url ? ' · 📷' : ''}`}
        fields={[
          { name: 'quote', label: 'Quote', type: 'textarea', required: true, hint: 'Paste the review text. Pick your best!' },
          { name: 'author', label: 'Name', type: 'text', required: true, hint: "First name + last initial, e.g. 'Sarah M.'" },
          { name: 'source', label: 'Source', type: 'text', hint: "Usually 'Google'." },
          { name: 'rating', label: 'Stars (1–5)', type: 'number', min: 1 },
          { name: 'image_url', label: 'Photo (optional)', type: 'image', preset: 'card', hint: 'If the review has a photo on Google, add it here — photo reviews get their own filter on the site.' },
          { name: 'featured', label: 'Feature this one', type: 'checkbox', hint: 'Featured testimonials show first.' },
        ]}
      />
      <GoogleImport onAdded={() => setBump((b) => b + 1)} />
    </>
  );
}
