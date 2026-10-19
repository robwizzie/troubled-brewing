import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { publicUrl } from '../lib/config.js';
import { useUnsaved } from './lib/publishing.jsx';

/* Admin shell. Site pages are edited on the page itself (/admin/editor); this
   sidebar groups everything else by how often staff reach for it. */
const NAV = [
  { to: '/admin/editor', label: '✏️ Edit your pages' },
  { section: 'Every day' },
  { to: '/admin/chalkboard', label: '📷 Today’s chalkboard' },
  { to: '/admin/hours', label: '🕘 Hours & holidays' },
  { to: '/admin/quick-blocks', label: '📣 Banner, links & featured drink' },
  { to: '/admin/inbox', label: '✉️ Inbox', badge: 'inbox' },
  { section: 'Lists on the site' },
  { to: '/admin/menu', label: 'Menu' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/reviews', label: 'Google reviews' },
  { to: '/admin/testimonials', label: 'Hand-picked quotes' },
  { to: '/admin/gallery', label: 'Gallery Wall' },
  { to: '/admin/troublemakers', label: 'Troublemakers' },
  { to: '/admin/neighborhood', label: 'Local Love' },
  { to: '/admin/timeline', label: 'Timeline' },
  { section: 'Behind the scenes' },
  { to: '/admin/google', label: 'Google connection' },
  { to: '/admin/media', label: 'Photo library' },
  { to: '/admin/help', label: 'Help' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { guard } = useUnsaved();
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

  function handleSignOut() {
    guard(async () => {
      await signOut();
      navigate('/admin/login');
    });
  }

  return (
    <div className="admin">
      <header className="admin__topbar">
        <button className="admin__burger" onClick={() => setOpen((v) => !v)} aria-label="Open the admin menu" aria-expanded={open}>☰</button>
        <span className="admin__title">Trouble Brewing admin</span>
        <div className="admin__topbar-right">
          <a href={publicUrl()} target="_blank" rel="noreferrer" className="admin__viewsite">Live site ↗</a>
          <span className="admin__user">{user?.email}</span>
          <button className="btn btn--ghost btn--sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <div className="admin__body">
        {open && <div className="admin__scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
        <nav className={`admin__sidebar ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-label="Admin sections">
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
