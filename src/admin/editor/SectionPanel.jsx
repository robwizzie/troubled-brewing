import { useEffect, useRef, useState } from 'react';
import { getContentBlock } from '../../lib/dataService.js';
import { schemaFor } from '../editors/schemas.js';
import { SECTION_LABELS } from '../../components/sections/registry.js';
import FieldRenderer from '../components/FieldRenderer.jsx';
import RevisionHistory from '../components/RevisionHistory.jsx';
import CollectionManager from '../components/CollectionManager.jsx';
import { useToast, Spinner } from '../components/ui.jsx';
import { managerFor } from './sectionMeta.js';
import { usePublishScope, useUnsaved } from '../lib/publishing.jsx';

/* Fields for a section whose content lives in a content_blocks row (e.g. the
   featured drink). The editor holds the value (blockApi) so it publishes with
   everything else on the page — no separate Save. */
function BlockFields({ spec, blockApi }) {
  const value = blockApi.get(spec.key);

  useEffect(() => {
    if (value !== undefined) return undefined;
    let alive = true;
    getContentBlock(spec.key).then((d) => alive && blockApi.loaded(spec.key, d || {}));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.key]);

  if (value === undefined) return <Spinner />;
  return (
    <div className="tb-panel__block">
      <p className="tb-panel__grouplabel">
        {spec.title} {blockApi.dirty(spec.key) && <span className="badge badge--draft">Changed — not live yet</span>}
      </p>
      {spec.fields.map((f) => (
        <FieldRenderer
          key={f.name}
          field={f}
          value={value[f.name]}
          onChange={(v) => blockApi.set(spec.key, { ...value, [f.name]: v })}
        />
      ))}
      {spec.note && <p className="field__hint">{spec.note}</p>}
    </div>
  );
}

/* Docked editing panel for the selected section. Every change goes up through
   onChangeData, which updates the canvas instantly — and stays local until
   the page is published. `children` renders extra controls above the fields
   (the homepage-look switcher).

   Collection-backed sections (menu, events, team…) get a "Manage —" button
   that swaps the panel to the embedded collection manager. Its changes join
   the same Publish button at the bottom of the editor. */
export default function SectionPanel({ section, isNew, effectiveType, focusTarget, onChangeData, onClose, onCollectionChanged, blockApi, children }) {
  const toast = useToast();
  const { guard, isDirty } = useUnsaved();
  const scope = usePublishScope();
  const type = effectiveType || section.type;
  const schema = schemaFor(type);
  const manager = managerFor(type);
  const [managing, setManaging] = useState(false);
  const [autoLabel, setAutoLabel] = useState(null);
  const bodyRef = useRef(null);
  const data = section.data || {};
  const set = (name, val) => onChangeData(section.id, { ...data, [name]: val });

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
      let target = holder.firstElementChild;
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
          <button
            className="btn btn--ghost btn--sm"
            onClick={() =>
              guard(() => setManaging(false), {
                when: () => Boolean(scope?.unitDirty((id) => id !== 'editor:page')) || isDirty((id) => id.startsWith('form:')),
                title: 'Leave this list without publishing?',
                body: 'You changed items in this list but haven’t published them. If you go back now those changes are thrown away. Stay and press Publish to keep them.',
                confirmLabel: 'Go back and discard',
              })
            }
          >
            ← Back to the section
          </button>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="tb-panel__body">
          {manager.component ? (
            <manager.component embedded onChanged={onCollectionChanged} />
          ) : (
            <CollectionManager
              key={autoLabel || 'manager'}
              {...manager}
              embedded
              onChanged={onCollectionChanged}
              autoOpenLabel={autoLabel}
            />
          )}
        </div>
        <div className="tb-panel__foot">
          <p className="tb-panel__hint">
            List changes stay here until you press <strong>Publish</strong> at the bottom. The page
            behind shows them after publishing.
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
        {schema.block && blockApi && <BlockFields spec={schema.block} blockApi={blockApi} />}
        {!isNew && (
          <details className="admin-history">
            <summary>Earlier versions</summary>
            <RevisionHistory
              table="sections"
              recordId={section.id}
              labelKey="type"
              onLoad={(snap) => {
                onChangeData(section.id, snap.data || {});
                toast('Earlier version loaded — press Publish to put it back on the site');
              }}
            />
          </details>
        )}
      </div>
      <div className="tb-panel__foot">
        <p className="tb-panel__hint">
          You see your changes on the page straight away. Nobody else does until you press{' '}
          <strong>Publish</strong> at the bottom.
        </p>
      </div>
    </aside>
  );
}
