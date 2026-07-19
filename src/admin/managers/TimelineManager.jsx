import CollectionManager from '../components/CollectionManager.jsx';

/* Exported so the on-page editor can embed this collection in its panel. */
export const TIMELINE_COLLECTION = {
  table: 'timeline_events',
  title: 'TB Timeline',
  singular: 'milestone',
  labelKey: 'title',
  defaultItem: {},
  summary: (e) => e.date_label || '',
  fields: [
    { name: 'date_label', label: 'Date label', type: 'text', required: true, hint: 'Flexible — e.g. “Spring 2021”, “March 2023”, “Day One”.' },
    { name: 'sort_date', label: 'Sort date', type: 'date', hint: 'Used only for ordering on the timeline (newest/oldest). Optional.' },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'image_url', label: 'Photo', type: 'image', preset: 'card' },
  ],
};

export default function TimelineManager() {
  return <CollectionManager {...TIMELINE_COLLECTION} />;
}
