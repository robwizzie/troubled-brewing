import { Link } from 'react-router-dom';
import { CONCEPTS } from '../lib/concepts.js';

/* A little pill bar pinned to the bottom of the homepage while someone is
   comparing looks with ?concept=… — every concept one tap away, the current
   one highlighted. It only exists in that preview URL (never for ordinary
   visitors), and choosing one doesn't save anything: the owner locks a look
   in from admin → Quick Blocks. */
export default function ConceptSwitcher({ current }) {
  return (
    <nav className="concept-switcher" aria-label="Compare homepage looks">
      <span className="concept-switcher__label">Homepage look</span>
      <div className="concept-switcher__list">
        {CONCEPTS.map((c) => (
          <Link
            key={c.value}
            to={`/?concept=${c.value}`}
            className={`concept-switcher__pill ${c.value === current ? 'is-active' : ''}`}
            aria-current={c.value === current ? 'page' : undefined}
            title={c.desc}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
