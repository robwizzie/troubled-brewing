import CollectionManager from '../components/CollectionManager.jsx';

/* Exported so the on-page editor can embed this collection in its panel. */
export const EVENTS_COLLECTION = {
  table: 'events',
  title: 'Events',
  singular: 'event',
  labelKey: 'title',
  orderable: false,
  defaultItem: {},
  summary: (e) => `${e.event_date || ''}${e.end_date && e.end_date > e.event_date ? ` → ${e.end_date}` : ''}${e.event_time ? ` · ${e.event_time}` : ''}`,
  validate: (e) => (e.end_date && e.event_date && e.end_date < e.event_date ? { end_date: 'The end date can’t be before the start date.' } : null),
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'event_date', label: 'Date', type: 'date', required: true, hint: 'The first (or only) day.' },
    { name: 'end_date', label: 'End date (optional)', type: 'date', omitWhenBlank: true, hint: 'Only for events that run over several days, e.g. a weekend festival. Leave blank for a one-day event. The event stays on the site until this day has passed.' },
    { name: 'event_time', label: 'Time', type: 'text', hint: 'e.g. 6:00–8:00 PM. For a multi-day event, the daily hours.' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'image_url', label: 'Photo or flyer', type: 'image', preset: 'card', hint: 'Any shape works: a photo fills the poster, and a wide banner, tall flyer or logo is shown whole, never cropped.' },
  ],
};

export default function EventsManager() {
  return <CollectionManager {...EVENTS_COLLECTION} help="The events list on the Events page and the homepage. Past events drop off by themselves (multi-day events after their end date)." />;
}
