import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuCornerDownLeft, LuSearch, LuX } from 'react-icons/lu';
import { SCREENS, groupOf, searchTasks } from '../lib/nav.js';
import { Icon } from './Icon.jsx';
import { useUnsaved } from '../lib/publishing.jsx';

/* "Find a screen" — the quick-jump in the top bar. Type what you want to
   change ("closed for snow", "open mic") or a screen's name; arrows + Enter
   or a tap goes there. Press / (or Ctrl/Cmd+K) anywhere to open it. With an
   empty box it lists every screen, grouped like the sidebar. */

const byName = (q) => {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return SCREENS.filter((x) => x.label.toLowerCase().includes(s)).map((x) => ({
    id: `screen:${x.to}`, to: x.to, icon: x.icon, title: x.label, desc: groupOf(x) || 'Main',
  }));
};

function jumpResults(q) {
  if (!q.trim()) {
    return SCREENS.map((x) => ({ id: `screen:${x.to}`, to: x.to, icon: x.icon, title: x.label, desc: groupOf(x) || 'Main' }));
  }
  const seen = new Set();
  const out = [];
  for (const r of [...searchTasks(q, { limit: 6 }), ...byName(q)]) {
    if (seen.has(r.to)) continue;
    seen.add(r.to);
    out.push(r);
  }
  return out.slice(0, 8);
}

export default function QuickJump() {
  const navigate = useNavigate();
  const { guard } = useUnsaved();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();
  const results = useMemo(() => jumpResults(q), [q]);

  useEffect(() => {
    function onKey(e) {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  function go(r) {
    if (!r) return;
    setOpen(false);
    guard(() => navigate(r.to));
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  }

  return (
    <>
      <button type="button" className="quickjump__open" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon icon={LuSearch} size={17} />
        <span className="quickjump__open-text">Find a screen</span>
        <kbd className="quickjump__kbd" aria-hidden="true">/</kbd>
      </button>
      {open && (
        <div className="modal-backdrop quickjump__backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="quickjump" role="dialog" aria-modal="true" aria-label="Find a screen" onClick={(e) => e.stopPropagation()}>
            <div className="quickjump__bar">
              <Icon icon={LuSearch} size={20} />
              <input
                ref={inputRef}
                className="quickjump__input"
                type="search"
                value={q}
                placeholder="What do you want to change?"
                aria-label="What do you want to change?"
                aria-controls={listId}
                aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
                role="combobox"
                aria-expanded="true"
                autoComplete="off"
                enterKeyHint="go"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <button type="button" className="iconbtn quickjump__close" aria-label="Close" onClick={() => setOpen(false)}>
                <Icon icon={LuX} />
              </button>
            </div>
            {results.length ? (
              <ul className="quickjump__list" id={listId} role="listbox" aria-label="Screens">
                {results.map((r, i) => (
                  <li
                    key={r.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`quickjump__item ${i === active ? 'is-active' : ''}`}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(r)}
                  >
                    <span className="quickjump__icon"><Icon icon={r.icon} /></span>
                    <span className="quickjump__text">
                      <strong>{r.title}</strong>
                      <small>{r.desc}</small>
                    </span>
                    {i === active && <Icon icon={LuCornerDownLeft} size={16} className="quickjump__enter" />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="quickjump__none">Nothing matches “{q.trim()}”. Try a word like <em>hours</em>, <em>menu</em> or <em>chalkboard</em>.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
