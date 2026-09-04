import CollectionManager from '../components/CollectionManager.jsx';

/* Exported so the on-page editor can embed this collection in its panel. */
export const TROUBLEMAKERS_COLLECTION = {
  table: 'team_members',
  title: 'Troublemakers',
  singular: 'Troublemaker',
  labelKey: 'name',
  defaultItem: {
    active: true,
    fun_facts: { favorite_local_food: '', favorite_movie: '', favorite_book: '', favorite_show: '', favorite_artist: '' },
  },
  summary: (m) => [m.role, m.drink, m.active === false ? 'not currently on the team' : null].filter(Boolean).join(' · '),
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, hint: 'However they want to be known to customers — first name is usually right.' },
    { name: 'photo_url', label: 'Photo', type: 'image', preset: 'avatar', folder: 'team', hint: 'A friendly head-and-shoulders shot. Ask first, and let people skip it — the card looks fine with just their initial.' },
    { name: 'role', label: 'What they do', type: 'text', hint: 'e.g. Barista, General Manager, Baker.' },
    { name: 'pronouns', label: 'Pronouns', type: 'text', hint: 'Only if they want it shown — ask, don’t assume. e.g. she/her, they/them.' },
    {
      name: 'drink',
      label: 'Their go-to order',
      type: 'text',
      hint: '“What should I get?” is the question they field all day. e.g. “Oat cortado, no sugar”.',
    },
    { name: 'started_label', label: 'How long they’ve been here', type: 'text', hint: 'However you say it — “Since day one”, “Joined 2024”.' },
    { name: 'bio', label: 'Short bio', type: 'textarea', rows: 3, hint: 'Two or three sentences in their voice, not a résumé.' },
    { name: 'fun_facts', label: 'Fun facts', type: 'funfacts', hint: 'Favorite local food, movie, book, show, artist — or invent your own. Leave any of them blank and they just don’t show.' },
    { name: 'active', label: 'Currently on the team', type: 'checkbox', hint: 'Turn this off when someone moves on. Their card comes off the site but the record is kept, so it’s easy to put back.' },
  ],
};

export default function TroublemakersManager() {
  return <CollectionManager {...TROUBLEMAKERS_COLLECTION} />;
}
