/* Guests' own photos of the food, the drinks and the room — the customer
   photos Google holds for the shop, cached by the google-profile Edge Function
   (google_profile.photos). Hung as a row of little snapshots, each credited to
   whoever took it. Renders nothing until there are photos to show. */

const TILTS = [-3, 2, -1.5, 3, -2, 1.5, -2.5, 2.5];

export default function GuestPhotos({ photos, max = 6, heading, className = '' }) {
  const list = (Array.isArray(photos) ? photos : []).filter((p) => p && p.url).slice(0, max);
  if (!list.length) return null;
  return (
    <div className={`guest-photos ${className}`}>
      {heading && <p className="guest-photos__heading">{heading}</p>}
      <ul className="guest-photos__list" style={{ '--n': list.length }} aria-label="Photos from our guests on Google">
        {list.map((ph, i) => (
          <li key={ph.url} style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` }}>
            <img src={ph.url} alt={ph.author ? `Photo by ${ph.author}` : 'Guest photo'} loading="lazy" referrerPolicy="no-referrer" />
            {ph.author && <span>{ph.author}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
