import { useState } from 'react';
import { ADDABLE_SECTION_TYPES, SECTION_LABELS } from '../../components/sections/registry.js';
import { ConfirmModal } from '../components/ui.jsx';

/* The default docked panel (nothing selected): what this page IS. The section
   outline — the keyboard-friendly way to select, reorder, hide, add and
   remove sections — then the search-engine details. Everything here is a
   local change that goes live with the editor's Publish button. */
export default function PagePanel({
  pageName, sections, removed = [], rowState, selectedId, meta, onMeta, metaDirty,
  onSelect, onMove, onToggleVisible, onRemove, onUndoRemove, onAdd,
}) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [addType, setAddType] = useState('');

  function statusBadges(s) {
    const st = rowState(s);
    return (
      <>
        {st === 'new' && <span className="badge badge--draft">New — not live yet</span>}
        {st === 'changed' && <span className="badge badge--draft">Changed — not live yet</span>}
        {!st && <span className="badge badge--live">Live</span>}
        {s.visible === false && <span className="badge badge--hidden">Hidden</span>}
      </>
    );
  }

  return (
    <aside className="tb-panel" aria-label={`${pageName} page`}>
      <div className="tb-panel__head">
        <h2>{pageName} page</h2>
      </div>
      <div className="tb-panel__body">
        <p className="tb-panel__grouplabel">Sections on this page</p>
        <p className="tb-panel__help">Tap a section here — or right on the page — to edit it.</p>
        {sections.length === 0 && <p className="admin-empty">No sections yet — add your first one below.</p>}
        <ul className="tb-outline" aria-label="Page sections">
          {sections.map((s, i) => {
            const name = SECTION_LABELS[s.type] || s.type;
            return (
              <li key={s.id} className={`tb-outline__row ${s.visible === false ? 'is-hidden' : ''} ${String(selectedId) === String(s.id) ? 'is-selected' : ''}`}>
                <div className="tb-outline__reorder">
                  <button className="iconbtn" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => onMove(i, -1)}>▲</button>
                  <button className="iconbtn" aria-label={`Move ${name} down`} disabled={i === sections.length - 1} onClick={() => onMove(i, 1)}>▼</button>
                </div>
                <button className="tb-outline__label" onClick={() => onSelect(s.id)}>
                  <strong>{name}</strong>
                  <span>{s.data?.heading || ''}</span>
                </button>
                <div className="tb-outline__status">{statusBadges(s)}</div>
                <div className="tb-outline__actions">
                  <button
                    className="iconbtn"
                    title={s.visible === false ? 'Show this section' : 'Hide this section'}
                    aria-label={s.visible === false ? `Show ${name}` : `Hide ${name}`}
                    aria-pressed={s.visible === false}
                    onClick={() => onToggleVisible(s.id)}
                  >
                    {s.visible === false ? '🙈' : '👁'}
                  </button>
                  <button className="iconbtn" title="Remove this section" aria-label={`Remove ${name}`} onClick={() => setConfirmDel(s)}>🗑</button>
                </div>
              </li>
            );
          })}
        </ul>

        {removed.length > 0 && (
          <>
            <p className="tb-panel__grouplabel">Coming off when you publish</p>
            <ul className="tb-outline" aria-label="Sections to remove">
              {removed.map((s) => (
                <li key={s.id} className="tb-outline__row is-removed">
                  <span className="tb-outline__label"><strong>{SECTION_LABELS[s.type] || s.type}</strong></span>
                  <button className="btn btn--ghost btn--sm" onClick={() => onUndoRemove(s.id)}>Undo</button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="add-section">
          <select value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="Section type to add">
            <option value="">+ Add a section…</option>
            {ADDABLE_SECTION_TYPES.map((t) => <option key={t} value={t}>{SECTION_LABELS[t] || t}</option>)}
          </select>
          <button className="btn btn--primary btn--sm" onClick={() => { onAdd(addType); setAddType(''); }} disabled={!addType}>Add</button>
        </div>

        <details className="admin-history" open={metaDirty || undefined}>
          <summary>How this page shows up on Google {metaDirty && <span className="badge badge--draft">Changed</span>}</summary>
          <div className="field">
            <label htmlFor="pp-title">Page title</label>
            <input id="pp-title" value={meta.title} onChange={(e) => onMeta((m) => ({ ...m, title: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="pp-desc">Search description</label>
            <textarea id="pp-desc" rows={2} value={meta.meta_description} onChange={(e) => onMeta((m) => ({ ...m, meta_description: e.target.value }))} />
          </div>
        </details>
      </div>
      <div className="tb-panel__foot">
        <p className="tb-panel__hint">
          Moving, hiding, adding and removing all wait for <strong>Publish</strong> at the bottom, like every other change.
        </p>
      </div>

      <ConfirmModal
        open={Boolean(confirmDel)}
        title={`Remove the “${SECTION_LABELS[confirmDel?.type] || 'this'}” section?`}
        body="It comes off the page when you press Publish. Until then you can undo it. Its history is kept."
        confirmLabel="Remove"
        onConfirm={() => { onRemove(confirmDel.id); setConfirmDel(null); }}
        onCancel={() => setConfirmDel(null)}
      />
    </aside>
  );
}
