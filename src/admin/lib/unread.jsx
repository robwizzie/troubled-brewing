import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { useAuth } from './auth.jsx';

/* "What's new": the admin's unread counts, from the real data.

     wishes   wishes.status = 'new'      (cleared by marking a wish Considering,
                                           Added, Not now or Hidden)
     inbox    submissions.read = false   (cleared by Mark read, or deleting)

   One provider for the whole admin, so the sidebar badges, the home page
   rows, the "New since you last looked" line and the tab title all agree.
   Counts refresh on every move between screens, when the window gets focus
   back, every minute, and straight away when a screen calls refresh() after
   changing something. */

export const UNREAD_SOURCES = [
  { key: 'wishes', table: 'wishes', column: 'status', value: 'new', to: '/admin/wishes', one: 'new wish', many: 'new wishes' },
  { key: 'inbox', table: 'submissions', column: 'read', value: false, to: '/admin/inbox', one: 'new message', many: 'new messages' },
];

export const REFRESH_MS = 60000;

const EMPTY = Object.freeze({ wishes: 0, inbox: 0 });

/** One count query per source; a source that fails (or isn't there) counts 0. */
export async function fetchUnreadCounts(client = supabase) {
  const out = { ...EMPTY };
  await Promise.all(UNREAD_SOURCES.map(async (s) => {
    try {
      const { count, error } = await client
        .from(s.table)
        .select('id', { count: 'exact', head: true })
        .eq(s.column, s.value);
      out[s.key] = error ? 0 : Math.max(0, Number(count) || 0);
    } catch {
      out[s.key] = 0;
    }
  }));
  return out;
}

/** "1 new wish", "2 new messages". */
export function unreadLabel(key, n) {
  const s = UNREAD_SOURCES.find((x) => x.key === key);
  if (!s) return '';
  return `${n} ${n === 1 ? s.one : s.many}`;
}

/** The tab title with "(n) " in front while there's something new. */
export function titleWithCount(title, total) {
  const base = String(title || '').replace(/^\(\d+\)\s*/, '');
  return total > 0 ? `(${total}) ${base}` : base;
}

const UnreadContext = createContext({ counts: EMPTY, total: 0, refresh: () => {} });

export function UnreadProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [counts, setCounts] = useState(EMPTY);
  const alive = useRef(true);
  const signedIn = Boolean(user) && isSupabaseConfigured;

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    const next = await fetchUnreadCounts();
    if (alive.current) setCounts((c) => (c.wishes === next.wishes && c.inbox === next.inbox ? c : next));
  }, [signedIn]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // on sign-in and on every move between screens
  useEffect(() => {
    if (!signedIn) { setCounts(EMPTY); return; }
    refresh();
  }, [signedIn, pathname, refresh]);

  // window focus, the tab coming back into view, and a light poll
  useEffect(() => {
    if (!signedIn) return undefined;
    const onFocus = () => refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const t = window.setInterval(refresh, REFRESH_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(t);
    };
  }, [signedIn, refresh]);

  const total = counts.wishes + counts.inbox;

  // "(2) Admin" in the tab while there's something new
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.title = titleWithCount(document.title, total);
    return undefined;
  }, [total, pathname]);
  useEffect(() => () => { document.title = titleWithCount(document.title, 0); }, []);

  const value = useMemo(() => ({ counts, total, refresh }), [counts, total, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}

/** The count badge: nothing at all when there's nothing new. */
export function CountBadge({ n, label, className = '' }) {
  if (!n) return null;
  return (
    <span className={`countbadge ${className}`.trim()} aria-label={label || `${n} new`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}
