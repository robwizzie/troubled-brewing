import CollectionManager from '../components/CollectionManager.jsx';

export default function GalleryManager() {
  return (
    <CollectionManager
      table="gallery_pieces"
      title="Gallery Wall"
      singular="piece"
      labelKey="title"
      defaultItem={{}}
      summary={(p) => (p.story ? p.story.slice(0, 80) + (p.story.length > 80 ? '…' : '') : '')}
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true, hint: 'A fun name for the piece.' },
        { name: 'image_url', label: 'Photo of the art', type: 'image', preset: 'card' },
        { name: 'story', label: 'The story', type: 'textarea', rows: 5, hint: 'Where it came from, why it’s there, an inside joke…' },
      ]}
    />
  );
}
