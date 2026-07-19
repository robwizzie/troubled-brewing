import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { getContentBlock } from '../../lib/dataService.js';
import { schemaFor } from '../editors/schemas.js';
import { SECTION_LABELS } from '../../components/sections/registry.js';
import FieldRenderer, { coerceFieldValue } from '../components/FieldRenderer.jsx';
import RevisionHistory from '../components/RevisionHistory.jsx';
import CollectionManager from '../components/CollectionManager.jsx';
import { useToast, Spinner } from '../components/ui.jsx';
import { managerFor } from './sectionMeta.js';

/* Editor for a section whose content lives in a content_blocks row (e.g. the
   featured drink). Blocks have no draft column that the public reader honors,
   so these fields keep an explicit Save that goes live immediately — the note
   says so out loud. */
function BlockFields({ spec, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getContentBlock(spec.key).then((d) => alive && setData(d || {}));
    return () => { alive = false; };
  }, [spec.key]);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...data };
      spec.fields.forEach((f) => { payload[f.name] = coerceFieldValue(f, payload[f.name]); });
      const { error } = await supabase
        .from('content_blocks')
        .upsert({ key: spec.key, data: payload, status: 'published' }, { onConflict: 'key' });
      if (error) throw error;
      toast(`${spec.title} updated`);
      onChanged?.('content_blocks'); // canvas refetches in place
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (data === null) return <Spinner />;
  return (
    <div className="tb-panel__block">
      <p className="tb-panel__grouplabel">{spec.title}</p>
      {spec.fields.map((f) => (
        <FieldRenderer key={f.name} field={f} value={data[f.name]} onChange={(v) => setData((d) => ({ ...d, [f.name]: v }))} />
      ))}
      <button className="btn btn--primary btn--sm" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : `Save ${spec.title.toLowerCase()}`}
      </button>
      {spec.note && <p className="field__hint">{spec.note}</p>}
    </div>
  );
}

/* Docked editing panel for the selected section. Fields come from the same
   schemas the old drawer used; every change goes up through onChangeData,
   which updates the canvas instantly and autosaves as a draft. `children`
   renders extra controls above the fields (concept switcher).

   Collection-backed sections (menu, events, team…) get a "Manage —" button
   that swaps the panel to the embedded collection manager, so the owner
   reaches "the menu items" from the menu they're looking at.

   Value resolution is draft_data ?? data — REPLACEMENT, matching publishData
   (adminData.js) — never a merge of the two. */
export default function SectionPanel({ section, effectiveType, focusTarget, onChangeData, onClose, onRestored, onCollectionChanged, children }) {
  const type = effectiveType || section.type;
  const schema = schemaFor(type);
  const manager = managerFor(type);
  const [managing, setManaging] = useState(false);
  const [autoLabel, setAutoLabel] = useState(null);
  const bodyRef = useRef(null);
  const data = (section.draft_data ?? section.data) || {};
  const set = (name, val) => onChangeData(section.id, { ...data, [name]: val });

  // Selecting a section (usually by clicking the canvas) hands focus to the
  // panel's first field so keyboard users land where the editing happens.
  useEffect(() => {
    bodyRef.current?.querySelector('input, textarea, select')?.focus({ preventScroll: true });
  }, []);

  /* Element-level deep link: the canvas click named the exact field (or the
     exact collection item) the owner pointed at — land them right on it. */
  useEffect(() => {
    if (!focusTarget) return undefined;
    if (focusTarget.itemLabel && manager) {
      setAutoLabel(focusTarget.itemLabel);
      setManaging(true);
      return undefined;
    }
    if (!focusTarget.field) return undefined;
    setManaging(false);
    const raf = requestAnimationFrame(() => {
      const holder = bodyRef.current?.querySelector(`[data-panelfield="${focusTarget.field}"]`);
      if (!holder) return;
      let target = holder.firstElementChild; // the .field block
      if (focusTarget.index != null) {
        const items = holder.querySelectorAll('.frames-editor__row, .card');
        if (items[focusTarget.index]) target = items[focusTarget.index];
      }
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.classList.add('field--targeted');
      setTimeout(() => target.classList.remove('field--targeted'), 1800);
      target.querySelector('input, textarea, select')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.nonce]);

  if (managing && manager) {
    return (
      <aside className="tb-panel" aria-label={`Manage ${manager.title}`}>
        <div className="tb-panel__head">
          <button className="btn btn--ghost btn--sm" onClick={() => setManaging(false)}>← Section</button>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="tb-panel__body">
          {/* key: a click on a different item re-arms the one-shot auto-open */}
          <CollectionManager
            key={autoLabel || 'manager'}
            {...manager}
            embedded
            onChanged={onCollectionChanged}
            autoOpenLabel={autoLabel}
          />
        </div>
        <div className="tb-panel__foot">
          <p className="tb-panel__hint">
            Changes here go live when you publish each item — the page behind
            updates as you go.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="tb-panel" aria-label="Edit section">
      <div className="tb-panel__head">
        <h2>{SECTION_LABELS[type] || type}</h2>
        <button className="iconbtn" aria-label="Close" onClick={onClose}>✕</button>
      </div>
      <div className="tb-panel__body" ref={bodyRef}>
        {children}
        {manager ? (
          <button className="btn btn--primary tb-panel__manage" onClick={() => setManaging(true)}>
            Manage {manager.title.toLowerCase()} →
          </button>
        ) : (
          schema.note && <p className="admin-note">{schema.note}</p>
        )}
        {schema.fields.map((f) => (
          <div key={f.name} data-panelfield={f.name} style={{ display: 'contents' }}>
            <FieldRenderer field={f} value={data[f.name]} onChange={(v) => set(f.name, v)} />
          </div>
        ))}
        {schema.block && <BlockFields spec={schema.block} onChanged={onCollectionChanged} />}
        <details className="admin-history">
          <summary>History & restore</summary>
          <RevisionHistory table="sections" recordId={section.id} labelKey="type" onRestored={onRestored} />
        </details>
      </div>
      <div className="tb-panel__foot">
        <p className="tb-panel__hint">
          Changes save automatically as a private draft — press <strong>Publish</strong> up top when
          you're ready for the world to see them.
        </p>
      </div>
    </aside>
  );
}
