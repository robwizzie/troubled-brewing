import { Link } from 'react-router-dom';

/* Settings landing — the editor's ⚙ target. Points back at the editor for
   anything page-shaped; the sidebar covers the rest. */
export default function SettingsHome() {
  return (
    <div>
      <h1>Settings</h1>
      <p className="admin__lead">
        Everything about how your <em>site looks</em> is edited right on the page — words, photos,
        sections, the homepage look. This area is for the behind-the-scenes stuff.
      </p>

      <section className="admin__panel">
        <h2>Want to change the site?</h2>
        <p>Open the editor, click the thing you want to change, and type. It's that direct.</p>
        <Link className="btn btn--primary" to="/admin/editor">✏️ Edit your site</Link>
      </section>

      <section className="admin__panel">
        <h2>What lives here</h2>
        <ul className="kv">
          <li><Link to="/admin/hours">Hours</Link> <span>weekly grid + holiday closures</span></li>
          <li><Link to="/admin/quick-blocks">Quick Blocks</Link> <span>announcement banner, social links, featured drink</span></li>
          <li><Link to="/admin/google">Google Profile</Link> <span>live rating + reviews connection</span></li>
          <li><Link to="/admin/inbox">Inbox</Link> <span>contact + catering messages</span></li>
          <li><Link to="/admin/media">Media Library</Link> <span>every photo you've uploaded</span></li>
          <li><Link to="/admin/help">Help Center</Link> <span>plain-English how-tos</span></li>
        </ul>
      </section>
    </div>
  );
}
