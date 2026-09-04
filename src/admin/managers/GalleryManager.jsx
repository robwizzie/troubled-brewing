import CollectionManager from '../components/CollectionManager.jsx';
import { FRAME_STYLE_OPTIONS } from '../../lib/frameStyles.js';

/* Exported so the on-page editor can embed this collection in its panel. */
export const GALLERY_COLLECTION = {
  table: 'gallery_pieces',
  title: 'Gallery Wall',
  singular: 'piece',
  labelKey: 'title',
  defaultItem: { for_sale: false },
  summary: (p) => [p.artist && `by ${p.artist}`, p.medium, p.for_sale ? 'for sale' : null].filter(Boolean).join(' · '),
  fields: [
    { name: 'title', label: 'What the piece is called', type: 'text', required: true, hint: 'Its real title if it has one, or a name you use for it — “The Ornate Gold One” is a perfectly good title.' },
    { name: 'image_url', label: 'Photo of the piece', type: 'image', preset: 'card', folder: 'gallery', hint: 'Shoot it straight on in daylight if you can. It gets hung in a frame on the page, so photograph the artwork rather than the wall around it.' },
    {
      name: 'artist',
      label: 'Who made it',
      type: 'text',
      hint: 'The artist’s name. This is the whole point of the page — if you know who made a piece, name them.',
    },
    { name: 'artist_url', label: 'Link for the artist', type: 'text', hint: 'Their website, Instagram or shop. Their name becomes a link to it.' },
    { name: 'medium', label: 'What it is', type: 'text', hint: 'e.g. “Oil on canvas”, “Screen print”, “Vintage photograph”. Leave blank if you’re not sure.' },
    { name: 'year_label', label: 'When it’s from', type: 'text', hint: 'However you know it — “2023”, “1970s”, “Found, undated”.' },
    { name: 'story', label: 'The story', type: 'textarea', rows: 5, hint: 'Where it came from, why it’s on the wall, the inside joke. This is what people actually read.' },
    {
      name: 'frame_style',
      label: 'Frame it hangs in',
      type: 'select',
      options: FRAME_STYLE_OPTIONS,
      hint: 'Pick the molding closest to the real one. Leave it blank and we choose a different frame for each piece so the wall doesn’t look uniform.',
    },
    { name: 'for_sale', label: 'This one is for sale', type: 'checkbox', hint: 'Adds a line inviting people to ask about it.' },
  ],
};

export default function GalleryManager() {
  return <CollectionManager {...GALLERY_COLLECTION} />;
}
