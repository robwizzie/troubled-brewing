import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuChevronDown, LuChevronRight, LuExternalLink, LuLogOut, LuMenu, LuX } from 'react-icons/lu';
import { useAuth } from './lib/auth.jsx';
import { publicUrl } from '../lib/config.js';
import { useUnsaved } from './lib/publishing.jsx';
import { NAV_GROUPS, SCREENS, groupOf, screenFor } from './lib/nav.js';
import { Icon } from './components/Icon.jsx';
import QuickJump from './components/QuickJump.jsx';
import { CountBadge, unreadLabel, useUnread } from './lib/unread.jsx';

/* Admin shell: top bar, sidebar, breadcrumb, screen.

   The sidebar is short on purpose — Home, the chalkboard (the everyday job)
   and the page editor first, then the named groups from lib/nav.js
   ("Every day", "On the site", …). Everything rarer folds away under "More",
   which opens by itself when you're on one of those screens. On a phone the
   sidebar is a slide-in menu with big rows; the Menu button opens it. The
   quick-jump ("Find a screen", or press /) reaches any screen from anywhere. */

function NavItem({ item, counts }) {
  const n = item.badge ? counts[item.badge] || 0 : 0;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `admin__navlink ${item.star ? 'admin__navlink--star' : ''} ${isActive ? 'active' : ''}`}
    >
      <span className="admin__navicon"><Icon icon={item.icon} /></span>
      <span className="admin__navlabel">{item.label}</span>
      <CountBadge n={n} label={unreadLabel(item.badge, n)} className="admin__navbadge" />
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { guard } = useUnsaved();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { counts } = useUnread();
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
  const group = groupOf(here);

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
          <Icon icon={open ? LuX : LuMenu} size={20} />
          <span className="admin__burger-text">Menu</span>
        </button>
        <Link to="/admin" className="admin__title">
          <span className="admin__mark" aria-hidden="true">TB</span>
          <span className="admin__wordmark">Trouble Brewing</span>
          <span className="admin__tag">Admin</span>
        </Link>
        <QuickJump />
        <div className="admin__topbar-right">
          <a href={publicUrl()} target="_blank" rel="noreferrer" className="admin__viewsite">
            <Icon icon={LuExternalLink} size={16} />
            <span>View website</span>
          </a>
          <Link to="/admin/account" className="admin__user" title="Your account: password and sign out">{user?.email}</Link>
          <button type="button" className="btn btn--ghost btn--sm admin__signout" onClick={handleSignOut}>
            <Icon icon={LuLogOut} size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <div className="admin__body">
        {open && <div className="admin__scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
        <nav id="admin-sidebar" className={`admin__sidebar ${open ? 'is-open' : ''}`} aria-label="Admin sections">
          <div className="admin__navgroup">
            {top.map((item) => <NavItem key={item.to} item={item} counts={counts} />)}
          </div>
          {NAV_GROUPS.map((g) => (
            <div key={g} className="admin__navgroup" role="group" aria-label={g}>
              <p className="admin__navsection">{g}</p>
              {SCREENS.filter((s) => s.nav === g).map((item) => <NavItem key={item.to} item={item} counts={counts} />)}
            </div>
          ))}
          <div className="admin__navgroup">
            <button
              type="button"
              className="admin__navmore"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span className="admin__navsection admin__navsection--btn">Settings &amp; more</span>
              <Icon icon={moreOpen ? LuChevronDown : LuChevronRight} size={16} />
            </button>
            {moreOpen && more.map((item) => <NavItem key={item.to} item={item} counts={counts} />)}
          </div>
          <div className="admin__navgroup admin__navgroup--end">
            {bottom.map((item) => <NavItem key={item.to} item={item} counts={counts} />)}
            <a href={publicUrl()} target="_blank" rel="noreferrer" className="admin__navlink admin__navlink--site">
              <span className="admin__navicon"><Icon icon={LuExternalLink} /></span>
              <span className="admin__navlabel">View website</span>
            </a>
          </div>
        </nav>

        <main className="admin__main">
          {!isHome && (
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link to="/admin" className="crumbs__home">
                <Icon icon={LuArrowLeft} size={16} />
                Admin home
              </Link>
              {group && (
                <span className="crumbs__group">
                  <span className="crumbs__sep" aria-hidden="true">/</span>
                  {here?.nav === 'more' ? <Link to="/admin/settings" className="crumbs__link">{group}</Link> : group}
                </span>
              )}
              {here && (
                <span className="crumbs__here" aria-current="page">
                  <span className="crumbs__sep" aria-hidden="true">/</span>{here.label}
                </span>
              )}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
