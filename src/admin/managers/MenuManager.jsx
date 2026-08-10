import CollectionManager from '../components/CollectionManager.jsx';

const CATEGORIES = [
  { value: 'espresso', label: 'Espresso' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'food', label: 'Food' },
  { value: 'pastry', label: 'Pastries' },
  { value: 'seasonal', label: 'Seasonal' },
];

/* Exported so the on-page editor can embed this collection in its panel. */
export const MENU_COLLECTION = {
  table: 'menu_items',
  title: 'Menu',
  singular: 'item',
  labelKey: 'name',
  defaultItem: { available: true, category: 'specialty', dietary_flags: [] },
  summary: (i) => `${i.category}${i.price != null ? ` · $${Number(i.price).toFixed(2)}` : ''}${i.available === false ? ' · hidden' : ''}`,
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
    { name: 'price', label: 'Price', type: 'price', hint: 'Just the number — the $ is added automatically.' },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true },
    { name: 'dietary_flags', label: 'Dietary tags', type: 'tags', hint: 'e.g. gluten-free, vegan — comma separated.' },
    { name: 'image_url', label: 'Photo', type: 'image', preset: 'card' },
    { name: 'available', label: 'Available (show on the menu)', type: 'checkbox', hint: 'Turn off to temporarily hide (e.g. sold out).' },
  ],
};

export default function MenuManager() {
  return (
    <>
      {/* the nightly SpotOn sync owns the structural fields — warn before edits
          quietly bounce back (docs/INTEGRATIONS.md §SpotOn) */}
      <div className="admin__note" role="note">
        <strong>Synced with SpotOn ordering.</strong> Names, prices, categories, availability, and
        order refresh from your SpotOn menu every morning — edit those in SpotOn and the site
        follows. Descriptions, photos, and dietary tags are yours here and are never overwritten.
      </div>
      <CollectionManager {...MENU_COLLECTION} />
    </>
  );
}
