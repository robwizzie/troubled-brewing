import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { PAGES } from '../lib/seed.js';
import { Spinner } from './components/ui.jsx';

export default function PageList() {
  const [pages, setPages] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from('pages')
      .select('*')
      .order('slug')
      .then(({ data }) => {
        if (!alive) return;
        setPages(data && data.length ? data : Object.values(PAGES));
      });
    return () => { alive = false; };
  }, []);

  if (pages === null) return <Spinner />;

  return (
    <div>
      <h1>Pages</h1>
      <p className="admin__lead">Pick a page to edit its sections, or update its title & description for search engines.</p>
      <ul className="admin-list">
        {pages.map((p) => (
          <li key={p.slug} className="admin-list__row">
            <div className="admin-list__body">
              <strong>{p.title || p.slug}</strong>
              <div className="admin-list__meta">/{p.slug === 'home' ? '' : p.slug}</div>
            </div>
            <div className="admin-list__actions">
              <Link className="btn btn--ghost btn--sm" to={`/${p.slug === 'home' ? '' : p.slug}?preview=1`} target="_blank">Preview</Link>
              <Link className="btn btn--primary btn--sm" to={`/admin/pages/${p.slug}`}>Edit</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
