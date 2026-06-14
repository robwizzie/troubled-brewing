import CollectionManager from '../components/CollectionManager.jsx';

const CATEGORIES = ['restaurant', 'cafe', 'retail', 'service', 'bakery', 'bar', 'other'];

export default function LocalBusinessManager() {
  return (
    <CollectionManager
      table="local_businesses"
      title="Local Love"
      singular="business"
      labelKey="name"
      defaultItem={{ category: 'restaurant' }}
      summary={(b) => `${b.category || ''}${b.url ? ' · linked' : ''}`}
      fields={[
        { name: 'name', label: 'Business name', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'select', options: CATEGORIES.map((c) => ({ value: c, label: c })) },
        { name: 'blurb', label: 'A sentence about them', type: 'textarea', rows: 2 },
        { name: 'url', label: 'Website link', type: 'text', hint: 'Full URL, e.g. https://…' },
        { name: 'photo_url', label: 'Photo', type: 'image', preset: 'card' },
      ]}
    />
  );
}
