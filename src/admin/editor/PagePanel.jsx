import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { updateRecord, reorder, setSectionVisible, deleteRecord, addSection } from '../lib/adminData.js';
import { ADDABLE_SECTION_TYPES, SECTION_LABELS } from '../../components/sections/registry.js';
import { useToast, ConfirmModal, StatusBadge } from '../components/ui.jsx';

/* The default docked panel (nothing selected): what this page IS. Search
   details up top, then the section outline — the keyboard-friendly way to
   select, reorder, hide, add and delete sections. Structure changes write
   through immediately (like reordering always has); content stays in the
   draft/publish flow. */
export default function PagePanel({ slug, pageName, sections, selectedId, onSelect, onChanged }) {
  const toast = useToast();
  const [meta, setMeta] = useState({ title: '', meta_description: '' });
  const [pageExists, setPageExists] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [addType, setAddType] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.from('pages').select('*').eq('slug', slug).maybeSingle().then(({ data }) => {
      if (!alive) return;
      setPageExists(Boolean(data));
      setMeta({ title: data?.title || '', meta_description: data?.meta_description || '' });
    });
    return () => { alive = false; };
  }, [slug]);

  async function saveMeta() {
    try {
      if (pageExists) await updateRecord('pages', slug, meta, { idCol: 'slug' });
      else await supabase.from('pages').upsert({ slug, ...meta });
      toast('Page details saved');
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    }
  }

  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      await reorder('sections', next.map((s) => s.id));
      onChanged();
    } catch (e) {
      toast(e.message || 'Reorder failed', 'error');
    }
  }

  async function toggleVisible(s) {
    try {
      await setSectionVisible(s.id, !s.visible);
      onChanged();
    } catch (e) {
      toast(e.message || 'Could not update', 'error');
    }
  }

  async function remove(s) {
    try {
      await deleteRecord('sections', s.id);
      toast('Section removed');
      setConfirmDel(null);
      onChanged();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  }

  async function add() {
    if (!addType) return;
    try {
      const row = await addSection(slug, addType, sections.length);
      toast('Section added — it’s at the bottom of the page');
      setAddType('');
      onChanged();
      if (row?.id) onSelect(row.id);
    } catch (e) {
      toast(e.message || 'Could not add', 'error');
    }
  }

  return (
    <aside className="tb-panel" aria-label={`${pageName} page`}>
      <div className="tb-panel__head">
        <h2>{pageName}</h2>
      </div>
      <div className="tb-panel__body">
        <p className="tb-panel__grouplabel">Sections on this page</p>
        <p className="tb-panel__help">Click a section here — or right on the page — to edit it.</p>
        {sections.length === 0 && <p className="admin-empty">No sections yet — add your first one below.</p>}
        <ul className="tb-outline" aria-label="Page sections">
          {sections.map((s, i) => (
            <li key={s.id} className={`tb-outline__row ${s.visible === false ? 'is-hidden' : ''} ${String(selectedId) === String(s.id) ? 'is-selected' : ''}`}>
              <div className="tb-outline__reorder">
                <button className="iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                <button className="iconbtn" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>▼</button>
              </div>
              <button className="tb-outline__label" onClick={() => onSelect(s.id)}>
                <strong>{SECTION_LABELS[s.type] || s.type}</strong>
                <span>{(s.draft_data ?? s.data)?.heading || ''}</span>
              </button>
              <div className="tb-outline__status">
                <StatusBadge status={s.status} hasDraft={Boolean(s.draft_data)} />
                {s.visible === false && <span className="badge badge--draft">Hidden</span>}
              </div>
              <div className="tb-outline__actions">
                <button className="iconbtn" title={s.visible === false ? 'Show this section' : 'Hide this section'} aria-label={s.visible === false ? 'Show' : 'Hide'} onClick={() => toggleVisible(s)}>
                  {s.visible === false ? '🙈' : '👁'}
                </button>
                <button className="iconbtn" title="Delete this section" aria-label="Delete" onClick={() => setConfirmDel(s)}>🗑</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="add-section">
          <select value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="Section type to add">
            <option value="">+ Add a section…</option>
            {ADDABLE_SECTION_TYPES.map((t) => <option key={t} value={t}>{SECTION_LABELS[t] || t}</option>)}
          </select>
          <button className="btn btn--primary btn--sm" onClick={add} disabled={!addType}>Add</button>
        </div>

        <details className="admin-history">
          <summary>Search-engine details (SEO)</summary>
          <div className="field">
            <label>Page title</label>
            <input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} />
          </div>
          <div className="field">
            <label>Search description</label>
            <textarea rows={2} value={meta.meta_description} onChange={(e) => setMeta((m) => ({ ...m, meta_description: e.target.value }))} />
          </div>
          <button className="btn btn--primary btn--sm" onClick={saveMeta}>Save details</button>
        </details>
      </div>
      <div className="tb-panel__foot">
        <p className="tb-panel__hint">Moving, hiding, and deleting apply right away. Text and photo edits stay drafts until you publish.</p>
      </div>

      <ConfirmModal
        open={Boolean(confirmDel)}
        title="Remove this section?"
        body="It will be removed from the page. You can re-add it later, and its history is kept."
        confirmLabel="Remove"
        onConfirm={() => remove(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </aside>
  );
}
