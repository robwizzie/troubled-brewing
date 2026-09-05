import CollectionManager from '../components/CollectionManager.jsx';

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café / tea room' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'bar', label: 'Bar' },
  { value: 'retail', label: 'Shop' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Something else' },
];

/* Exported so the on-page editor can embed this collection in its panel. */
export const LOCAL_BUSINESS_COLLECTION = {
  table: 'local_businesses',
  title: 'Local Love',
  singular: 'business',
  labelKey: 'name',
  defaultItem: { category: 'restaurant' },
  summary: (b) => [b.address, CATEGORIES.find((c) => c.value === b.category)?.label, b.url ? 'linked' : null].filter(Boolean).join(' · '),
  fields: [
    { name: 'name', label: 'Business name', type: 'text', required: true },
    { name: 'category', label: 'What kind of place', type: 'select', placeholderOption: false, options: CATEGORIES },
    {
      name: 'address',
      label: 'Street address',
      type: 'text',
      hint: 'Just the street part, e.g. “512 Station Ave”. The page walks down the street in number order and adds a Directions link, so this is worth filling in.',
    },
    { name: 'blurb', label: 'A sentence about them', type: 'textarea', rows: 3, hint: 'What they are and why you like them. Two sentences at most.' },
    {
      name: 'we_love',
      label: 'What you send people for',
      type: 'text',
      hint: 'The specific thing — “the vodka rigatoni”, “a dozen empanadas on a Friday”. This is the line customers actually act on.',
    },
    { name: 'url', label: 'Website or Facebook page', type: 'text', hint: 'Full URL, starting with https://' },
    { name: 'logo_url', label: 'Their logo', type: 'image', preset: 'card', folder: 'neighbors', hint: 'Ask them for one — most places are glad to be featured. Without it we draw their initials instead, which looks fine.' },
    { name: 'photo_url', label: 'A photo of the place', type: 'image', preset: 'card', folder: 'neighbors', hint: 'Optional. A storefront shot works well.' },
  ],
};

export default function LocalBusinessManager() {
  return <CollectionManager {...LOCAL_BUSINESS_COLLECTION} />;
}
