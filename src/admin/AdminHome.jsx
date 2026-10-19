import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { MORE_TASKS, PAGE_NAMES, TASKS, agoLabel, readRecent, searchTasks } from './lib/nav.js';
import { chalkStatus, loadChalkboard } from './lib/chalkStatus.js';

/* Admin home — a task launcher. The first thing on screen is the job staff do
   every morning (the chalkboard); under it, "What do you want to change?"
   and a big card for each common job, in the words people use for it. Below
   that: anything waiting to publish, what was published recently from this
   device, and the one rule (nothing goes live until you publish). */

const TIP_KEY = 'tb-admin-tip-dismissed-v1';
function tipDismissed() {
  try { return window.localStorage.getItem(TIP_KEY) === '1'; } catch { return false; }
}
function dismissTip() {
  try { window.localStorage.setItem(TIP_KEY, '1'); } catch { /* the tip just comes back next time */ }
}

function ChalkboardCard() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let alive = true;
    loadChalkboard().then((b) => alive && setStatus(chalkStatus(b)), () => {});
    return () => { alive = false; };
  }, []);
  return (
    <Link to="/admin/chalkboard" className="homechalk">
      <span className="homechalk__icon" aria-hidden="true">📷</span>
      <span className="homechalk__text">
        <strong className="homechalk__title">Update today’s chalkboard</strong>
        <span className="homechalk__desc">Snap the specials board and put it on the homepage — about 30 seconds.</span>
        {status && (
          <span className={`homechalk__status ${status.live ? 'is-live' : ''}`}>{status.live ? '✓ ' : ''}{status.text}</span>
        )}
      </span>
      <span className="homechalk__go" aria-hidden="true">→</span>
    </Link>
  );
}

function FirstTimeTip() {
  const [hidden, setHidden] = useState(tipDismissed);
  if (hidden) return null;
  return (
    <section className="hometip" aria-labelledby="hometip-title">
      <div className="hometip__head">
        <h2 id="hometip-title">First time here? It’s three steps.</h2>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => { dismissTip(); setHidden(true); }}
        >
          Got it — hide this
        </button>
      </div>
      <ol className="hometip__steps">
        <li><strong>Pick a job</strong><span>Tap a card below, or type what you want to change in the box.</span></li>
        <li><strong>Make your change</strong><span>Only you can see it — nothing is on the website yet.</span></li>
        <li><strong>Press Publish</strong><span>That’s the moment it goes live. Changed your mind? Press Discard.</span></li>
      </ol>
    </section>
  );
}

function TaskSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const id = useId();
  const results = useMemo(() => searchTasks(q), [q]);
  const typed = q.trim().length > 0;
  return (
    <form
      className="homesearch"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (results[0]) navigate(results[0].to);
      }}
    >
      <label htmlFor={id} className="homesearch__label">What do you want to change?</label>
      <input
        id={id}
        type="search"
        className="homesearch__input"
        value={q}
        placeholder="e.g. closed for snow, open mic"
        autoComplete="off"
        enterKeyHint="go"
        onChange={(e) => setQ(e.target.value)}
      />
      {typed && (
        <div className="homesearch__results" aria-live="polite">
          {results.length ? (
            <ul aria-label="Matching screens">
              {results.map((t) => (
                <li key={t.id}>
                  <Link to={t.to}>
                    <span aria-hidden="true">{t.icon}</span>
                    <span><strong>{t.title}</strong><small>{t.desc}</small></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="homesearch__none">
              Nothing matches “{q.trim()}”. Try a word like <em>hours</em>, <em>menu</em> or <em>chalkboard</em> — or
              open <Link to="/admin/help">Help</Link>.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

/* Pages with a previewed-but-unpublished draft (the editor's Preview saves a
   private copy the public site never reads). */
function useWaitingPages() {
  const [pages, setPages] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let alive = true;
    supabase
      .from('sections')
      .select('page_slug, draft_data')
      .then(({ data, error }) => {
        if (!alive || error || !Array.isArray(data)) return;
        const slugs = [...new Set(data.filter((r) => r.draft_data).map((r) => r.page_slug).filter(Boolean))];
        setPages(slugs);
      }, () => {});
    return () => { alive = false; };
  }, []);
  return pages;
}

function Activity() {
  const waiting = useWaitingPages();
  const [recent] = useState(readRecent);
  if (!waiting.length && !recent.length) return null;
  return (
    <section className="admin__panel homeactivity">
      {waiting.length > 0 && (
        <>
          <h2>Waiting to publish</h2>
          <p className="panel-help">You previewed changes to these pages but didn’t publish them. Open one to publish or discard.</p>
          <ul className="homeactivity__list">
            {waiting.map((slug) => (
              <li key={slug}>
                <Link to={`/admin/editor/${slug}`}>✏️ {PAGE_NAMES[slug] || 'A page'} page</Link>
                <span className="badge badge--draft">Not on the site yet</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <>
          <h2>Recently published</h2>
          <ul className="homeactivity__list">
            {recent.map((r) => (
              <li key={`${r.label}-${r.at}`}>
                <Link to={r.path}>{r.label}</Link>
                <span className="homeactivity__when">{agoLabel(r.at)}</span>
              </li>
            ))}
          </ul>
          <p className="field__hint">From this phone or computer.</p>
        </>
      )}
    </section>
  );
}

export default function AdminHome() {
  const cards = TASKS.filter((t) => t.id !== 'chalkboard');
  return (
    <div className="adminhome">
      <h1 className="sr-only">Admin home</h1>
      <ChalkboardCard />
      <FirstTimeTip />
      <TaskSearch />

      <h2 className="adminhome__h">Things you can change</h2>
      <ul className="taskcards">
        {cards.map((t) => (
          <li key={t.id}>
            <Link to={t.to} className="taskcard">
              <span className="taskcard__icon" aria-hidden="true">{t.icon}</span>
              <span className="taskcard__title">{t.title}</span>
              <span className="taskcard__desc">{t.desc}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Activity />

      <details className="admin__panel homemore">
        <summary>Something else? Gallery, staff, local businesses, messages…</summary>
        <ul className="homelinks">
          {MORE_TASKS.map((t) => (
            <li key={t.id}>
              <Link to={t.to}><strong><span aria-hidden="true">{t.icon}</span> {t.title}</strong><span>{t.desc}</span></Link>
            </li>
          ))}
        </ul>
      </details>

      <section className="admin__panel">
        <h2>How publishing works</h2>
        <ol className="howto">
          <li>Make your changes — they show straight away on your screen only.</li>
          <li>The bar at the bottom says <strong>Unsaved changes</strong> while anything is waiting.</li>
          <li>Press <strong>Publish</strong> to put it on the website, or <strong>Discard</strong> to throw it away.</li>
        </ol>
      </section>
    </div>
  );
}
