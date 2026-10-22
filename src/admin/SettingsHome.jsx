import { Link } from 'react-router-dom';
import { LuChevronRight } from 'react-icons/lu';
import { ScreenHead } from './lib/publishing.jsx';
import { SETTINGS_TASKS } from './lib/nav.js';
import { Icon } from './components/Icon.jsx';

/* Settings: the setup and rarely changed screens, gathered in one quiet place
   so the home page can stay about the everyday jobs. */

const GROUPS = [
  { title: 'You', ids: ['account'] },
  { title: 'Connections', ids: ['social', 'google'] },
  { title: 'Other pages', ids: ['local', 'timeline'] },
  { title: 'Photos, numbers and help', ids: ['photos', 'stats', 'help'] },
];

export default function SettingsHome() {
  const byId = new Map(SETTINGS_TASKS.map((t) => [t.id, t]));
  return (
    <div className="settingshome">
      <ScreenHead title="Settings" help="Setup and things you change now and then. Everything you do every day is on Admin home." />
      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`settings-${g.ids[0]}`} className="settingshome__group">
          <h2 id={`settings-${g.ids[0]}`} className="adminhome__h">{g.title}</h2>
          <ul className="homelinks">
            {g.ids.map((id) => byId.get(id)).filter(Boolean).map((t) => (
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
      ))}
    </div>
  );
}
