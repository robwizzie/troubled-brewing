import CollectionManager from '../components/CollectionManager.jsx';

export default function TroublemakersManager() {
  return (
    <CollectionManager
      table="team_members"
      title="Troublemakers"
      singular="Troublemaker"
      labelKey="name"
      defaultItem={{ active: true, fun_facts: { favorite_local_food: '', favorite_movie: '', favorite_book: '', favorite_show: '', favorite_artist: '' } }}
      summary={(m) => `${m.role || ''}${m.active === false ? ' · inactive' : ''}`}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'role', label: 'Role', type: 'text', hint: 'e.g. Barista, GM' },
        { name: 'photo_url', label: 'Photo', type: 'image', preset: 'avatar' },
        { name: 'bio', label: 'Short bio', type: 'textarea', rows: 3 },
        { name: 'fun_facts', label: 'Fun facts', type: 'funfacts', hint: 'Add any fun facts — favorite local food, movie, book, show, artist… add your own too!' },
        { name: 'active', label: 'Currently on the team', type: 'checkbox', hint: 'Turn off when someone moves on (keeps their record).' },
      ]}
    />
  );
}
