import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './lib/auth.jsx';
import { FoxEmblem, Flourish } from '../components/Motifs.jsx';

/* Whimsical owner dashboard (build plan §5.8). Playful, on-brand, and friendly —
   the first thing Tom/Cat/Katie see. First-run checklist persists to localStorage. */
const CHECKLIST = [
  { key: 'hours', label: 'Confirm your hours', to: '/admin/hours', icon: '🕗' },
  { key: 'menu', label: 'Review your menu & prices', to: '/admin/menu', icon: '☕' },
  { key: 'team', label: 'Add your Troublemakers', to: '/admin/troublemakers', icon: '🦊' },
  { key: 'timeline', label: 'Add a few milestones', to: '/admin/timeline', icon: '📖' },
  { key: 'event', label: 'Add your first event', to: '/admin/events', icon: '🎉' },
  { key: 'google', label: 'Connect your Google profile', to: '/admin/google', icon: '⭐' },
  { key: 'concept', label: 'Pick your homepage look', to: '/admin/quick-blocks', icon: '🎨' },
];
const STORE_KEY = 'tbch-firstrun-v1';

const TILES = [
  { to: '/admin/pages', icon: '▦', label: 'Edit pages', tone: 'green', tilt: '-2deg' },
  { to: '/admin/menu', icon: '☕', label: 'The menu', tone: 'yellow', tilt: '1.5deg' },
  { to: '/admin/quick-blocks', icon: '🎨', label: 'Quick blocks', tone: 'pink', tilt: '-1.5deg' },
  { to: '/admin/troublemakers', icon: '🦊', label: 'Troublemakers', tone: 'green', tilt: '2deg' },
  { to: '/admin/media', icon: '🖼️', label: 'Photos', tone: 'black', tilt: '-1deg' },
  { to: '/admin/help', icon: '?', label: 'Help center', tone: 'yellow', tilt: '2deg' },
];

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

  const completed = CHECKLIST.filter((c) => done[c.key]).length;
  const remaining = CHECKLIST.length - completed;
  const pct = Math.round((completed / CHECKLIST.length) * 100);
  const name = user?.email ? user.email.split('@')[0] : 'Troublemaker';

  return (
    <div className="dash">
      <header className="dash-hero">
        <FoxEmblem size={84} className="dash-hero__fox" />
        <div>
          <p className="eyebrow">Owner panel</p>
          <h1>Hello, {name}! Let's cause some good trouble.</h1>
          <Flourish width={220} color="var(--color-yellow)" />
          <p className="dash-hero__sub">Everything about your website lives here — and anything you change can be undone.</p>
        </div>
        <Link to="/admin/inbox" className="dash-hero__inbox">
          <span className="dash-hero__inbox-num">{unread === null ? '—' : unread}</span>
          <span>unread<br />messages</span>
        </Link>
      </header>

      <div className="dash-tiles">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className={`dash-tile dash-tile--${t.tone}`} style={{ '--tilt': t.tilt }}>
            <span className="dash-tile__icon">{t.icon}</span>
            <span className="dash-tile__label">{t.label}</span>
          </Link>
        ))}
      </div>

      {!dismissed && remaining > 0 && (
        <section className="dash-checklist">
          <div className="dash-checklist__head">
            <div>
              <h2>Get set up</h2>
              <p className="field__hint">{completed} of {CHECKLIST.length} done — you've got this.</p>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={dismiss}>Dismiss</button>
          </div>
          <div className="dash-progress"><span style={{ width: `${pct}%` }} /></div>
          <ul className="dash-todo">
            {CHECKLIST.map((c) => (
              <li key={c.key} className={done[c.key] ? 'is-done' : ''}>
                <label>
                  <input type="checkbox" checked={Boolean(done[c.key])} onChange={() => toggle(c.key)} />
                  <span className="dash-todo__icon" aria-hidden="true">{c.icon}</span>
                  <span>{c.label}</span>
                </label>
                <Link to={c.to} className="btn btn--ghost btn--sm">Go →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(dismissed || remaining === 0) && (
        <p className="dash-allset">🎉 You're all set up. Tweak anything any time — and remember, <strong>History → Restore</strong> can undo almost everything.</p>
      )}
    </div>
  );
}
