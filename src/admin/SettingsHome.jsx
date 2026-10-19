import { Link } from 'react-router-dom';
import { ScreenHead } from './lib/publishing.jsx';

/* Admin home — where "☰ Admin menu" in the editor lands. */
const LINKS = [
  ['/admin/chalkboard', '📷 Today’s chalkboard', 'Snap the real specials board and put it on the homepage.'],
  ['/admin/hours', '🕘 Hours & holidays', 'Opening hours and one-off closures.'],
  ['/admin/quick-blocks', '📣 Banner, links & featured drink', 'The message bar on every page, social links, the featured drink.'],
  ['/admin/inbox', '✉️ Inbox', 'Contact and catering messages from the site.'],
  ['/admin/menu', 'Menu', 'Descriptions, photos and dietary tags (prices come from SpotOn).'],
  ['/admin/reviews', 'Google reviews', 'Which reviews show, which lead, and their photos.'],
  ['/admin/help', 'Help', 'Plain-English how-tos.'],
];

export default function SettingsHome() {
  return (
    <div>
      <ScreenHead
        title="Admin"
        help="Pick what you want to change. Nothing you do here goes on the site until you press Publish."
      />

      <section className="admin__panel admin__panel--feature">
        <h2>Change words or photos on a page</h2>
        <p>Open the editor, tap the part of the page you want to change, and type. Press <strong>Publish</strong> when it looks right.</p>
        <Link className="btn btn--primary" to="/admin/editor">✏️ Edit your pages</Link>
      </section>

      <section className="admin__panel">
        <h2>Everything else</h2>
        <ul className="homelinks">
          {LINKS.map(([to, label, desc]) => (
            <li key={to}>
              <Link to={to}><strong>{label}</strong><span>{desc}</span></Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin__panel">
        <h2>How publishing works</h2>
        <ol className="howto">
          <li>Make your changes — they show straight away on your screen only.</li>
          <li>The bar at the bottom says <strong>Unsaved changes</strong> while anything is waiting.</li>
          <li>Press <strong>Publish</strong> to put it on the live site, or <strong>Discard</strong> to throw it away.</li>
        </ol>
      </section>
    </div>
  );
}
