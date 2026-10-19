import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { listAll, createRecord, updateRecord, deleteRecord, clearDraft } from '../lib/adminData.js';
import { usePublishUnit, useUnsaved, ScreenHead } from '../lib/publishing.jsx';
import { same } from '../lib/publishHelpers.js';
import { ConfirmModal, useToast, Empty, Spinner } from './ui.jsx';
import { coerceFieldValue } from './FieldRenderer.jsx';
import ItemEditorForm from './ItemEditorForm.jsx';

/* Schema-driven manager for a structured table (Menu, Events, Troublemakers…).

   Explicit publishing: adding, editing, re-ordering and deleting all happen in
   a local working copy of the list. Nothing reaches the database until the
   screen's Publish button runs this unit's publish(), which then writes only
   what actually changed (one insert / update / delete per changed item).

   Rows that still carry a `draft_data` from the old "Save as draft" flow open
   with that draft merged in, so it shows as a pending change and goes live on
   the next Publish (or is cleared by Discard).

   Two render modes:
   - default: full page with heading + right-hand drawer for editing.
   - embedded: compact variant for the on-page editor's docked panel.
   `onChanged(table)` fires after a successful publish so the editor canvas
   refetches. */

let tempSeq = 0;
const tempId = () => `new-${Date.now().toString(36)}-${(tempSeq += 1)}`;
const isTemp = (id) => String(id).startsWith('new-');
const withDraft = (row) => ({ ...row, ...(row.draft_data && typeof row.draft_data === 'object' ? row.draft_data : {}) });

const CollectionManager = forwardRef(function CollectionManager(
  {
    table, title, singular, fields, defaultItem = {}, labelKey = 'name', orderable = true,
    summary, embedded = false, onChanged, autoOpenLabel, help, intro,
  },
  ref
) {
  const toast = useToast();
  const [live, setLive] = useState(null); //  rows exactly as the server has them
  const [work, setWork] = useState(null); //  working copy, in working order; flags: _remove
  const [editing, setEditing] = useState(null); // row id being edited, or 'new'
  const [form, setForm] = useState({});
  const [formBase, setFormBase] = useState(null);
  const { setSource, guard } = useUnsaved();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});

  async function refresh() {
    try {
      const data = await listAll(table, orderable ? {} : { orderBy: 'created_at', ascending: false });
      setLive(data);
      setWork(data.map(withDraft));
    } catch (e) {
      toast(e.message || 'Could not load items', 'error');
      setLive([]);
      setWork([]);
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [table]);

  /* An open item form with typing in it (before "Done") also counts as
     unsaved, so leaving the page or closing the form asks first. */
  const formDirty = Boolean(editing) && !same(form, formBase);
  useEffect(() => {
    setSource(`form:${table}`, formDirty);
  }, [formDirty, setSource, table]);
  useEffect(() => () => setSource(`form:${table}`, false), [setSource, table]);
  function requestClose() {
    guard(closeEditor, {
      when: () => formDirty,
      title: 'Close without keeping your changes?',
      body: 'You changed this item but didn’t press Done, so those changes will be thrown away.',
      confirmLabel: 'Close and discard',
    });
  }

  /* ---- What changed? --------------------------------------------------- */
  const liveById = new Map((live || []).map((r) => [String(r.id), r]));
  const kept = (work || []).filter((r) => !r._remove && !isTemp(r.id));
  const liveOrder = (live || []).map((r) => String(r.id)).filter((id) => kept.some((k) => String(k.id) === id));
  const orderChanged = orderable && !same(kept.map((r) => String(r.id)), liveOrder);

  function rowChanges(row) {
    const base = liveById.get(String(row.id));
    if (!base) return null;
    const out = {};
    for (const f of fields) if (!same(row[f.name], base[f.name])) out[f.name] = row[f.name];
    if ((row.status || 'published') !== (base.status || 'published')) out.status = row.status;
    if (base.draft_data) out.draft_data = null;
    return Object.keys(out).length ? out : null;
  }
  const changedIds = new Set((work || []).filter((r) => !isTemp(r.id) && !r._remove && rowChanges(r)).map((r) => String(r.id)));
  const added = (work || []).filter((r) => isTemp(r.id) && !r._remove);
  const removed = (work || []).filter((r) => r._remove && !isTemp(r.id));
  const legacyDrafts = (live || []).filter((r) => r.draft_data).length;
  const dirty = Boolean(work) && (changedIds.size > 0 || added.length > 0 || removed.length > 0 || orderChanged);

  /* ---- Publish / discard (only ever called from the action bar) -------- */
  async function publish() {
    let nextLive = [...live];
    let nextWork = [...work];
    try {
      for (const r of removed) {
        await deleteRecord(table, r.id);
        nextLive = nextLive.filter((x) => String(x.id) !== String(r.id));
        nextWork = nextWork.filter((x) => String(x.id) !== String(r.id));
      }
      const order = nextWork.filter((r) => !r._remove);
      for (let i = 0; i < order.length; i += 1) {
        const row = order[i];
        if (isTemp(row.id)) {
          const payload = {};
          for (const f of fields) payload[f.name] = row[f.name] ?? null;
          if (orderable) payload.display_order = i;
          const created = await createRecord(table, payload, { publish: row.status !== 'draft' });
          if (created) {
            nextLive = [...nextLive, created];
            nextWork = nextWork.map((x) => (x.id === row.id ? withDraft(created) : x));
          }
          continue;
        }
        const base = nextLive.find((x) => String(x.id) === String(row.id));
        const changes = rowChanges(row) || {};
        if (orderable && base && base.display_order !== i && orderChanged) changes.display_order = i;
        if (!Object.keys(changes).length) continue;
        const updated = await updateRecord(table, row.id, changes);
        const merged = updated || { ...base, ...changes };
        nextLive = nextLive.map((x) => (String(x.id) === String(row.id) ? merged : x));
      }
    } finally {
      setLive(nextLive);
      setWork(nextWork);
    }
    onChanged?.(table);
  }

  async function discard() {
    // throw away old server-side drafts too: "Discard" means "back to what's live"
    for (const r of live.filter((x) => x.draft_data)) await clearDraft(table, r.id);
    const clean = live.map(({ draft_data: _d, ...r }) => r);
    setLive(clean);
    setWork(clean);
    closeEditor();
  }

  usePublishUnit(`collection:${table}`, {
    dirty,
    canDiscard: dirty,
    publish,
    discard,
    note: dirty
      ? `Unsaved changes to ${title.toLowerCase()} — not on the site yet${legacyDrafts ? ` (includes ${legacyDrafts} saved earlier)` : ''}`
      : undefined,
  });

  /* Imported items (e.g. a Google review → testimonial) join the list as new,
     unpublished rows. */
  useImperativeHandle(ref, () => ({
    stageNew(item) {
      setWork((w) => [...(w || []), { ...defaultItem, ...item, id: tempId(), status: 'published' }]);
    },
  }));

  /* One-shot deep link from the on-page editor: open the clicked item. */
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenLabel || autoOpenedRef.current || !work || editing) return;
    autoOpenedRef.current = true;
    const n = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const target = n(autoOpenLabel);
    const found = work.find((it) => {
      const l = n(it[labelKey]);
      return l && (l === target || target.includes(l) || l.includes(target));
    });
    if (found) openEditor(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work, autoOpenLabel]);

  function openEditor(item) {
    const start = item ? { ...item } : { ...defaultItem, status: 'published' };
    setForm(start);
    setFormBase(start);
    setErrors({});
    setEditing(item ? item.id : 'new');
  }
  function closeEditor() {
    setEditing(null);
    setForm({});
    setFormBase(null);
  }
  function setField(name, val) {
    setForm((f) => ({ ...f, [name]: val }));
  }

  /* "Done": validate and fold the form into the working list. Not live. */
  function applyForm() {
    const payload = {};
    for (const f of fields) payload[f.name] = coerceFieldValue(f, form[f.name]);
    const errs = {};
    for (const f of fields) {
      if (f.required && (payload[f.name] === '' || payload[f.name] == null)) errs[f.name] = `${f.label} is required.`;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast('Please fill in the highlighted fields.', 'error');
      return;
    }
    const status = form.status === 'draft' ? 'draft' : 'published';
    if (editing === 'new') {
      setWork((w) => [...w, { ...payload, status, id: tempId() }]);
    } else {
      setWork((w) => w.map((r) => (r.id === editing ? { ...r, ...payload, status } : r)));
    }
    closeEditor();
  }

  function markRemove(item) {
    setConfirmDelete(null);
    if (isTemp(item.id)) setWork((w) => w.filter((r) => r.id !== item.id));
    else setWork((w) => w.map((r) => (r.id === item.id ? { ...r, _remove: true } : r)));
  }
  function undoRemove(item) {
    setWork((w) => w.map((r) => (r.id === item.id ? { ...r, _remove: false } : r)));
  }

  function move(index, dir) {
    const next = [...work];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setWork(next);
  }

  function badge(item) {
    if (item._remove) return <span className="badge badge--remove">Will be removed</span>;
    if (isTemp(item.id)) return <span className="badge badge--draft">New — not live yet</span>;
    if (changedIds.has(String(item.id))) return <span className="badge badge--draft">Changed — not live yet</span>;
    if (item.status === 'draft') return <span className="badge badge--draft">Not on the site</span>;
    return <span className="badge badge--live">Live</span>;
  }

  const editingItem = editing && editing !== 'new' ? work.find((r) => r.id === editing) : null;
  const wasHidden = Boolean(editingItem && liveById.get(String(editingItem.id))?.status === 'draft');

  const list =
    work === null ? (
      <Spinner />
    ) : work.length === 0 ? (
      <Empty>
        Nothing here yet. Press <strong>+ Add {singular}</strong> to create the first one — it goes on
        the site when you press Publish.
      </Empty>
    ) : (
      <ul className="admin-list">
        {work.map((item, i) => (
          <li key={item.id} className={`admin-list__row ${item._remove ? 'is-removed' : ''}`}>
            {orderable && (
              <div className="admin-list__reorder">
                <button className="iconbtn" aria-label={`Move ${item[labelKey] || singular} up`} disabled={i === 0 || item._remove} onClick={() => move(i, -1)}>▲</button>
                <button className="iconbtn" aria-label={`Move ${item[labelKey] || singular} down`} disabled={i === work.length - 1 || item._remove} onClick={() => move(i, 1)}>▼</button>
              </div>
            )}
            {item.image_url || item.photo_url ? (
              <img className="admin-list__thumb" src={item.image_url || item.photo_url} alt="" />
            ) : null}
            <div className="admin-list__body">
              <strong>{item[labelKey] || '(untitled)'}</strong>
              <div className="admin-list__meta">{summary ? summary(item) : null}</div>
            </div>
            <div className="admin-list__status">{badge(item)}</div>
            <div className="admin-list__actions">
              {item._remove ? (
                <button className="btn btn--ghost btn--sm" onClick={() => undoRemove(item)}>Undo remove</button>
              ) : (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={() => openEditor(item)}>Edit</button>
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirmDelete(item)}>Delete</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  const editorForm = editing && (
    <>
      <ItemEditorForm
        fields={fields}
        form={form}
        errors={errors}
        onField={setField}
        table={table}
        labelKey={labelKey}
        recordId={editingItem && !isTemp(editingItem.id) ? editingItem.id : null}
        onLoadVersion={(snap) => {
          const next = { ...form };
          for (const f of fields) if (f.name in snap) next[f.name] = snap[f.name];
          setForm(next);
          toast('Earlier version loaded — press Done, then Publish to put it back on the site');
        }}
      />
      {wasHidden && (
        <label className="checkfield">
          <input
            type="checkbox"
            checked={form.status !== 'draft'}
            onChange={(e) => setField('status', e.target.checked ? 'published' : 'draft')}
          />
          <span>Show this on the site (it was saved as a hidden draft earlier)</span>
        </label>
      )}
    </>
  );

  const formButtons = editing && (
    <>
      <button className="btn btn--ghost" onClick={requestClose}>Cancel</button>
      <button className="btn btn--primary" onClick={applyForm}>Done</button>
    </>
  );
  const formHint = <p className="field__hint drawer-hint">“Done” keeps your change here. It goes on the site when you press <strong>Publish</strong>.</p>;

  const confirm = (
    <ConfirmModal
      open={Boolean(confirmDelete)}
      title={`Delete “${confirmDelete?.[labelKey] || `this ${singular}`}”?`}
      body="It will come off the site when you press Publish. Until then you can undo it."
      confirmLabel="Delete"
      onConfirm={() => markRemove(confirmDelete)}
      onCancel={() => setConfirmDelete(null)}
    />
  );

  if (embedded) {
    return (
      <div className="cm-embedded">
        {editing ? (
          <div>
            <div className="cm-embedded__head">
              <button className="btn btn--ghost btn--sm" onClick={requestClose}>← All {title.toLowerCase()}</button>
              <strong>{editing === 'new' ? `Add ${singular}` : `Edit ${singular}`}</strong>
            </div>
            {editorForm}
            {formHint}
            <div className="cm-embedded__foot">{formButtons}</div>
          </div>
        ) : (
          <div>
            <div className="cm-embedded__head">
              <strong>{title}</strong>
              <button className="btn btn--primary btn--sm" onClick={() => openEditor(null)}>+ Add {singular}</button>
            </div>
            {list}
          </div>
        )}
        {confirm}
      </div>
    );
  }

  return (
    <div>
      <ScreenHead title={title} help={help}>
        <button className="btn btn--primary" onClick={() => openEditor(null)}>+ Add {singular}</button>
      </ScreenHead>
      {intro}

      {list}

      {editing && (
        <div className="admin-drawer-backdrop" onClick={requestClose}>
          <aside className="admin-drawer" role="dialog" aria-label={editing === 'new' ? `Add ${singular}` : `Edit ${singular}`} onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer__head">
              <h2>{editing === 'new' ? `Add ${singular}` : `Edit ${singular}`}</h2>
              <button className="iconbtn" aria-label="Close" onClick={requestClose}>✕</button>
            </div>
            <div className="admin-drawer__body">
              {editorForm}
              {formHint}
            </div>
            <div className="admin-drawer__foot">{formButtons}</div>
          </aside>
        </div>
      )}

      {confirm}
    </div>
  );
});

export default CollectionManager;
