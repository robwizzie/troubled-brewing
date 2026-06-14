import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import {
  reorder, deleteRecord, setSectionVisible, addSection, publishData, updateRecord,
} from './lib/adminData.js';
import { ADDABLE_SECTION_TYPES, SECTION_LABELS } from '../components/sections/registry.js';
import SectionEditor from './editors/SectionEditor.jsx';
import { useToast, ConfirmModal, StatusBadge, Spinner } from './components/ui.jsx';

/* The core self-editing deliverable: edit a page's sections in order, reorder,
   toggle visibility, add/remove, edit inline, preview drafts, and publish. */
export default function PageEditor() {
  const { slug } = useParams();
  const toast = useToast();
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [addType, setAddType] = useState('');
  const [meta, setMeta] = useState({ title: '', meta_description: '' });

  async function loadSections() {
    const { data } = await supabase.from('sections').select('*').eq('page_slug', slug).order('display_order');
    setSections(data || []);
  }
  async function loadPage() {
    const { data } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle();
    setPage(data);
    setMeta({ title: data?.title || '', meta_description: data?.meta_description || '' });
  }
  useEffect(() => { loadPage(); loadSections(); /* eslint-disable-next-line */ }, [slug]);

  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
    try { await reorder('sections', next.map((s) => s.id)); }
    catch (e) { toast(e.message || 'Reorder failed', 'error'); loadSections(); }
  }

  async function toggleVisible(s) {
    try { await setSectionVisible(s.id, !s.visible); loadSections(); }
    catch (e) { toast(e.message || 'Could not update', 'error'); }
  }

  async function add() {
    if (!addType) return;
    try {
      await addSection(slug, addType, sections.length);
      toast('Section added');
      setAddType('');
      loadSections();
    } catch (e) { toast(e.message || 'Could not add', 'error'); }
  }

  async function remove(s) {
    try { await deleteRecord('sections', s.id); toast('Section removed'); setConfirmDel(null); loadSections(); }
    catch (e) { toast(e.message || 'Delete failed', 'error'); }
  }

  async function publishOne(s) {
    try { await publishData('sections', s.id); toast('Published'); loadSections(); }
    catch (e) { toast(e.message || 'Publish failed', 'error'); }
  }

  async function publishAll() {
    const drafts = sections.filter((s) => s.draft_data);
    try {
      await Promise.all(drafts.map((s) => publishData('sections', s.id)));
      toast(`Published ${drafts.length} change${drafts.length === 1 ? '' : 's'}`);
      loadSections();
    } catch (e) { toast(e.message || 'Publish failed', 'error'); }
  }

  async function saveMeta() {
    try {
      if (page) await updateRecord('pages', slug, meta, { idCol: 'slug' });
      else await supabase.from('pages').upsert({ slug, ...meta });
      toast('Page details saved');
    } catch (e) { toast(e.message || 'Save failed', 'error'); }
  }

  if (sections === null) return <Spinner />;

  const draftCount = sections.filter((s) => s.draft_data).length;
  const publicPath = `/${slug === 'home' ? '' : slug}`;

  return (
    <div>
      <div className="admin__pagehead">
        <div>
          <Link to="/admin/pages" className="admin__back">← All pages</Link>
          <h1>Editing: {page?.title || slug}</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link className="btn btn--ghost" to={`${publicPath}?preview=1`} target="_blank">Preview</Link>
          {draftCount > 0 && <button className="btn btn--accent" onClick={publishAll}>Publish all ({draftCount})</button>}
        </div>
      </div>

      <section className="admin__panel">
        <h2>Page details (SEO)</h2>
        <div className="field"><label>Title</label><input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} /></div>
        <div className="field"><label>Search description</label><textarea rows={2} value={meta.meta_description} onChange={(e) => setMeta((m) => ({ ...m, meta_description: e.target.value }))} /></div>
        <button className="btn btn--primary" onClick={saveMeta}>Save details</button>
      </section>

      <section className="admin__panel">
        <h2>Sections</h2>
        {sections.length === 0 ? (
          <p className="field__hint">This page has no sections yet. Add one below.</p>
        ) : (
          <ul className="admin-list">
            {sections.map((s, i) => (
              <li key={s.id} className={`admin-list__row ${s.visible ? '' : 'is-hidden'}`}>
                <div className="admin-list__reorder">
                  <button className="iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                  <button className="iconbtn" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>▼</button>
                </div>
                <div className="admin-list__body">
                  <strong>{SECTION_LABELS[s.type] || s.type}</strong>
                  <div className="admin-list__meta">{s.data?.heading || s.draft_data?.heading || ''}</div>
                </div>
                <div className="admin-list__status">
                  <StatusBadge status={s.status} hasDraft={Boolean(s.draft_data)} />
                  {!s.visible && <span className="badge badge--draft">Hidden</span>}
                </div>
                <div className="admin-list__actions">
                  {s.draft_data && <button className="btn btn--accent btn--sm" onClick={() => publishOne(s)}>Publish</button>}
                  <button className="btn btn--ghost btn--sm" onClick={() => toggleVisible(s)}>{s.visible ? 'Hide' : 'Show'}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(s)}>Edit</button>
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirmDel(s)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="add-section">
          <select value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="Section type to add">
            <option value="">+ Add a section…</option>
            {ADDABLE_SECTION_TYPES.map((t) => <option key={t} value={t}>{SECTION_LABELS[t] || t}</option>)}
          </select>
          <button className="btn btn--primary" onClick={add} disabled={!addType}>Add</button>
        </div>
      </section>

      {editing && (
        <SectionEditor section={editing} onClose={() => setEditing(null)} onSaved={loadSections} />
      )}

      <ConfirmModal
        open={Boolean(confirmDel)}
        title="Remove this section?"
        body="It will be removed from the page. You can re-add it later, and its history is kept."
        confirmLabel="Remove"
        onConfirm={() => remove(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
