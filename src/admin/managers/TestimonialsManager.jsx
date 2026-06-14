import CollectionManager from '../components/CollectionManager.jsx';

export default function TestimonialsManager() {
  return (
    <CollectionManager
      table="testimonials"
      title="Testimonials"
      singular="testimonial"
      labelKey="author"
      defaultItem={{ source: 'Google', featured: false }}
      summary={(t) => `${t.rating ? '★'.repeat(t.rating) + ' · ' : ''}${t.source || ''}${t.featured ? ' · featured' : ''}`}
      fields={[
        { name: 'quote', label: 'Quote', type: 'textarea', required: true, hint: 'Paste the review text. Pick your best!' },
        { name: 'author', label: 'Name', type: 'text', required: true, hint: "First name + last initial, e.g. 'Sarah M.'" },
        { name: 'source', label: 'Source', type: 'text', hint: "Usually 'Google'." },
        { name: 'rating', label: 'Stars (1–5)', type: 'number', min: 1 },
        { name: 'featured', label: 'Feature this one', type: 'checkbox', hint: 'Featured testimonials show first.' },
      ]}
    />
  );
}
