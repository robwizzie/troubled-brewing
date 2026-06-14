import CollectionManager from '../components/CollectionManager.jsx';

export default function EventsManager() {
  return (
    <CollectionManager
      table="events"
      title="Events"
      singular="event"
      labelKey="title"
      orderable={false}
      defaultItem={{}}
      summary={(e) => `${e.event_date || ''}${e.event_time ? ` · ${e.event_time}` : ''}`}
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'event_date', label: 'Date', type: 'date', required: true },
        { name: 'event_time', label: 'Time', type: 'text', hint: 'e.g. 6:00–8:00 PM' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'image_url', label: 'Photo', type: 'image', preset: 'card' },
      ]}
    />
  );
}
