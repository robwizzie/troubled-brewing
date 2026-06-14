import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';

const NAV = [
  { section: 'Content' },
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/pages', label: 'Pages' },
  { to: '/admin/menu', label: 'Menu' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/hours', label: 'Hours' },
  { to: '/admin/quick-blocks', label: 'Quick Blocks' },
  { section: 'Whimsy' },
  { to: '/admin/gallery', label: 'Gallery Wall' },
  { to: '/admin/troublemakers', label: 'Troublemakers' },
  { to: '/admin/neighborhood', label: 'Local Love' },
  { section: 'Reviews & Profile' },
  { to: '/admin/testimonials', label: 'Testimonials' },
  { to: '/admin/google', label: 'Google Profile' },
  { section: 'Operations' },
  { to: '/admin/inbox', label: 'Inbox' },
  { to: '/admin/media', label: 'Media Library' },
  { to: '/admin/help', label: 'Help Center' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="admin">
      <header className="admin__topbar">
        <button className="admin__burger" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">☰</button>
        <span className="admin__title">Trouble Brewing — Owner Panel</span>
        <div className="admin__topbar-right">
          <a href="/" target="_blank" rel="noreferrer" className="admin__viewsite">View site ↗</a>
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
