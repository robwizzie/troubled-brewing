import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './lib/auth.jsx';

/* First-run checklist (build plan §5.8) tracks completion in localStorage so it
   can be dismissed and won't nag forever. Also surfaces unread inbox count. */
const CHECKLIST = [
  { key: 'hours', label: 'Confirm your hours', to: '/admin/hours' },
  { key: 'menu', label: 'Review your menu & prices', to: '/admin/menu' },
  { key: 'team', label: 'Add your Troublemakers', to: '/admin/troublemakers' },
  { key: 'event', label: 'Add your first event', to: '/admin/events' },
  { key: 'google', label: 'Connect your Google Profile', to: '/admin/google' },
  { key: 'concept', label: 'Pick your homepage look', to: '/admin/quick-blocks' },
];
const STORE_KEY = 'tbch-firstrun-v1';

function loadDone() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

export default function Dashboard() {
  const { user } = useAuth();
  const [done, setDone] = useState(loadDone());
  const [unread, setUnread] = useState(null);
  const [dismissed, setDismissed] = useState(() => loadDone().__dismissed === true);

  useEffect(() => {
    let alive = true;
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .then(({ count }) => alive && setUnread(count ?? 0))
      .catch(() => alive && setUnread(0));
    return () => { alive = false; };
  }, []);

  function toggle(key) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function dismiss() {
    const next = { ...done, __dismissed: true };
    setDismissed(true);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  const remaining = CHECKLIST.filter((c) => !done[c.key]).length;

  return (
    <div>
      <h1>Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋</h1>
      <p className="admin__lead">Everything about your website lives here. Changes are easy to make — and easy to undo.</p>

      <div className="admin__cards">
        <Link to="/admin/inbox" className="admin__stat">
          <span className="admin__stat-num">{unread === null ? '—' : unread}</span>
          <span>Unread messages</span>
        </Link>
        <Link to="/admin/menu" className="admin__stat"><span className="admin__stat-num">☕</span><span>Edit the menu</span></Link>
        <Link to="/admin/pages" className="admin__stat"><span className="admin__stat-num">▦</span><span>Edit pages</span></Link>
        <Link to="/admin/help" className="admin__stat"><span className="admin__stat-num">?</span><span>Help center</span></Link>
      </div>

      {!dismissed && remaining > 0 && (
        <section className="admin__panel firstrun">
          <div className="firstrun__head">
            <h2>Get set up ({CHECKLIST.length - remaining}/{CHECKLIST.length})</h2>
            <button className="btn btn--ghost btn--sm" onClick={dismiss}>Dismiss</button>
          </div>
          <ul className="firstrun__list">
            {CHECKLIST.map((c) => (
              <li key={c.key} className={done[c.key] ? 'is-done' : ''}>
                <label>
                  <input type="checkbox" checked={Boolean(done[c.key])} onChange={() => toggle(c.key)} />
                  <span>{c.label}</span>
                </label>
                <Link to={c.to} className="btn btn--ghost btn--sm">Go →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
