import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { LuArrowRight, LuCamera, LuChevronRight, LuCircleCheck, LuCircleDot, LuSearch, LuSettings, LuSquarePen, LuUpload, LuX } from 'react-icons/lu';
import { COMMON_COUNT, PAGE_NAMES, SITE_TASKS, TASKS, VISITOR_TASKS, agoLabel, readRecent, searchTasks } from './lib/nav.js';
import { Icon } from './components/Icon.jsx';
import { StatusChip } from './components/ui.jsx';
import { chalkStatus, loadChalkboard } from './lib/chalkStatus.js';

/* Admin home — a calm task launcher. The first thing on screen is the job
   staff do every morning (the chalkboard); under it, "What do you want to
   change?", the most common jobs as cards, then everything else, grouped.
   Below that: anything waiting to publish and what was published recently
   from this device. Every screen is one tap from here. */

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
      <span className="homechalk__icon"><Icon icon={LuCamera} size={26} /></span>
      <span className="homechalk__text">
        <strong className="homechalk__title">Update today’s chalkboard</strong>
        <span className="homechalk__desc">Snap the specials board and put it on the homepage — about 30 seconds.</span>
        {status && (
          <span className={`homechalk__status ${status.live ? 'is-live' : ''}`}>
            <Icon icon={status.live ? LuCircleCheck : LuCircleDot} size={15} />
            {status.text}
          </span>
        )}
      </span>
      <span className="homechalk__go"><Icon icon={LuArrowRight} size={22} /></span>
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
          <Icon icon={LuX} size={16} />
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
      <div className="homesearch__field">
      <Icon icon={LuSearch} size={20} className="homesearch__icon" />
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
      </div>
      {typed && (
        <div className="homesearch__results" aria-live="polite">
          {results.length ? (
            <ul aria-label="Matching screens">
              {results.map((t) => (
                <li key={t.id}>
                  <Link to={t.to}>
                    <span className="homesearch__ricon"><Icon icon={t.icon} /></span>
                    <span><strong>{t.title}</strong><small>{t.desc}</small></span>
                    <Icon icon={LuArrowRight} size={18} className="homesearch__go" />
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
          <h2><Icon icon={LuUpload} size={18} />Waiting to publish</h2>
          <p className="panel-help">You previewed changes to these pages but didn’t publish them. Open one to publish or discard.</p>
          <ul className="homeactivity__list">
            {waiting.map((slug) => (
              <li key={slug}>
                <Link to={`/admin/editor/${slug}`}><Icon icon={LuSquarePen} size={16} />{PAGE_NAMES[slug] || 'A page'} page</Link>
                <StatusChip state="draft" />
              </li>
            ))}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <>
          <h2><Icon icon={LuCircleCheck} size={18} />Recently published</h2>
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

function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(now));
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function TaskCard({ t }) {
  return (
    <li>
      <Link to={t.to} className="taskcard">
        <span className="taskcard__icon"><Icon icon={t.icon} size={22} /></span>
        <span className="taskcard__title">{t.title}</span>
        <span className="taskcard__desc">{t.desc}</span>
      </Link>
    </li>
  );
}

/* The one way into setup and rarely used screens (account, social links,
   Google, photo library, stats, help): kept off the home page itself. */
const SETTINGS_ENTRY = {
  id: 'settings', to: '/admin/settings', icon: LuSettings,
  title: 'Settings and more',
  desc: 'Your password, social links, Google, photos, stats and help.',
};

/* A short list of jobs: icon, name, one line. Calmer than a wall of cards. */
function TaskList({ id, title, tasks }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="adminhome__h">{title}</h2>
      <ul className="homelinks">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link to={t.to}>
              <span className="homelinks__icon"><Icon icon={t.icon} /></span>
              <span className="homelinks__text"><strong>{t.title}</strong><span>{t.desc}</span></span>
              <Icon icon={LuChevronRight} size={18} className="homelinks__go" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminHome() {
  const common = TASKS.filter((t) => t.id !== 'chalkboard').slice(0, COMMON_COUNT);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  return (
    <div className="adminhome">
      <header className="adminhome__head">
        <p className="adminhome__date">{today}</p>
        <h1 className="adminhome__hello">{greeting()}</h1>
        <p className="adminhome__sub">What would you like to update? Nothing goes on the website until you press Publish.</p>
      </header>
      <ChalkboardCard />
      <FirstTimeTip />
      <TaskSearch />

      <section aria-labelledby="home-common">
        <h2 id="home-common" className="adminhome__h">Most days</h2>
        <ul className="taskcards">
          {common.map((t) => <TaskCard key={t.id} t={t} />)}
        </ul>
      </section>

      <div className="adminhome__lists">
        <TaskList id="home-site" title="On the website" tasks={SITE_TASKS} />
        <div className="adminhome__col">
          <TaskList id="home-visitors" title="From your visitors" tasks={VISITOR_TASKS} />
          <TaskList id="home-settings" title="Settings" tasks={[SETTINGS_ENTRY]} />
        </div>
      </div>

      <Activity />
    </div>
  );
}
