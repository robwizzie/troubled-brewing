import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { publicUrl } from '../lib/config.js';

/* Slim settings shell. Site content is edited on the page itself (/admin/editor);
   this sidebar covers shop settings, operations, and full-width content lists. */
const NAV = [
  { to: '/admin/editor', label: '✏️ Edit your site' },
  { section: 'Shop settings' },
  { to: '/admin/hours', label: 'Hours' },
  { to: '/admin/quick-blocks', label: 'Quick Blocks' },
  { to: '/admin/google', label: 'Google Profile' },
  { section: 'Operations' },
  { to: '/admin/inbox', label: 'Inbox', badge: 'inbox' },
  { to: '/admin/media', label: 'Media Library' },
  { to: '/admin/help', label: 'Help Center' },
  { section: 'Content lists' },
  { to: '/admin/menu', label: 'Menu' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/testimonials', label: 'Testimonials' },
  { to: '/admin/gallery', label: 'Gallery Wall' },
  { to: '/admin/troublemakers', label: 'Troublemakers' },
  { to: '/admin/neighborhood', label: 'Local Love' },
  { to: '/admin/timeline', label: 'TB Timeline' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Unread-submissions badge on Inbox (salvaged from the old dashboard).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .then(({ count }) => setUnread(count || 0));
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="admin">
      <header className="admin__topbar">
        <button className="admin__burger" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">☰</button>
        <span className="admin__title">Trouble Brewing — Settings</span>
        <div className="admin__topbar-right">
          <a href={publicUrl()} target="_blank" rel="noreferrer" className="admin__viewsite">View site ↗</a>
          <span className="admin__user">{user?.email}</span>
          <button className="btn btn--ghost btn--sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <div className="admin__body">
        <nav className={`admin__sidebar ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}>
          {NAV.map((item, i) =>
            item.section ? (
              <p key={`s-${i}`} className="admin__navsection">{item.section}</p>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin__navlink ${isActive ? 'active' : ''}`}
              >
                {item.label}
                {item.badge === 'inbox' && unread > 0 && <span className="admin__navbadge">{unread}</span>}
              </NavLink>
            )
          )}
        </nav>

        <main className="admin__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
