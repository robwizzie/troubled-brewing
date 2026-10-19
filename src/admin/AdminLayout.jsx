import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { publicUrl } from '../lib/config.js';
import { useUnsaved } from './lib/publishing.jsx';
import { SCREENS, screenFor } from './lib/nav.js';

/* Admin shell: top bar, sidebar, breadcrumb, screen.

   The sidebar is short on purpose — Home, the chalkboard (the everyday job)
   and the page editor first, then the everyday screens and the three lists
   people actually touch. Everything rarer folds away under "More", which
   opens by itself when you're on one of those screens. On a phone the
   sidebar is a slide-in menu with big rows; the ☰ Menu button opens it. */
const GROUPS = ['Every day', 'Lists on the site'];

function NavItem({ item, unread }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `admin__navlink ${item.star ? 'admin__navlink--star' : ''} ${isActive ? 'active' : ''}`}
    >
      <span className="admin__navicon" aria-hidden="true">{item.icon}</span>
      <span className="admin__navlabel">{item.label}</span>
      {item.badge === 'inbox' && unread > 0 && (
        <span className="admin__navbadge" aria-label={`${unread} unread`}>{unread}</span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { guard } = useUnsaved();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const here = screenFor(pathname);
  const inMore = here?.nav === 'more';
  const [moreOpen, setMoreOpen] = useState(inMore);
  useEffect(() => { if (inMore) setMoreOpen(true); }, [inMore]);

  // close the phone menu after moving to another screen
  useEffect(() => { setOpen(false); }, [pathname]);
  // and on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Unread messages badge.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .then(({ count }) => setUnread(count || 0), () => {});
  }, []);

  function handleSignOut() {
    guard(async () => {
      await signOut();
      navigate('/admin/login');
    });
  }

  const top = SCREENS.filter((s) => s.nav === 'top');
  const more = SCREENS.filter((s) => s.nav === 'more');
  const bottom = SCREENS.filter((s) => s.nav === 'bottom');
  const isHome = here?.to === '/admin';

  return (
    <div className="admin">
      <header className="admin__topbar">
        <button
          type="button"
          className="admin__burger"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close the admin menu' : 'Open the admin menu'}
          aria-expanded={open}
          aria-controls="admin-sidebar"
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span> Menu
        </button>
        <Link to="/admin" className="admin__title">Trouble Brewing admin</Link>
        <div className="admin__topbar-right">
          <a href={publicUrl()} target="_blank" rel="noreferrer" className="admin__viewsite">See the website ↗</a>
          <span className="admin__user">{user?.email}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <div className="admin__body">
        {open && <div className="admin__scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
        <nav id="admin-sidebar" className={`admin__sidebar ${open ? 'is-open' : ''}`} aria-label="Admin sections">
          {top.map((item) => <NavItem key={item.to} item={item} unread={unread} />)}
          {GROUPS.map((g) => (
            <div key={g} className="admin__navgroup" role="group" aria-label={g}>
              <p className="admin__navsection">{g}</p>
              {SCREENS.filter((s) => s.nav === g).map((item) => <NavItem key={item.to} item={item} unread={unread} />)}
            </div>
          ))}
          <div className="admin__navgroup">
            <button
              type="button"
              className="admin__navmore"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span className="admin__navicon" aria-hidden="true">{moreOpen ? '▾' : '▸'}</span>
              <span className="admin__navlabel">More</span>
            </button>
            {moreOpen && more.map((item) => <NavItem key={item.to} item={item} unread={unread} />)}
          </div>
          <div className="admin__navgroup admin__navgroup--end">
            {bottom.map((item) => <NavItem key={item.to} item={item} unread={unread} />)}
            <a href={publicUrl()} target="_blank" rel="noreferrer" className="admin__navlink admin__navlink--site">
              <span className="admin__navicon" aria-hidden="true">🌐</span>
              <span className="admin__navlabel">See the website ↗</span>
            </a>
          </div>
        </nav>

        <main className="admin__main">
          {!isHome && (
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link to="/admin" className="crumbs__home">← Admin home</Link>
              {here && <span className="crumbs__here" aria-current="page"><span aria-hidden="true">/</span> {here.label}</span>}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
