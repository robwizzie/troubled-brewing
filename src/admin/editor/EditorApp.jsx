import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { getContentBlock } from '../../lib/dataService.js';
import { publishData, saveDataDraftQuiet, snapshotRecord } from '../lib/adminData.js';
import { publicUrl } from '../../lib/config.js';
import { CONCEPT_TO_TYPE, HERO_TYPES, CONCEPTS } from '../../lib/concepts.js';
import * as seed from '../../lib/seed.js';
import { useToast, Spinner } from '../components/ui.jsx';
import Canvas from './Canvas.jsx';
import SectionPanel from './SectionPanel.jsx';
import PagePanel from './PagePanel.jsx';
import { createDraftQueue } from './editorStore.js';
import './editor.css';

/* Friendly page names for the switcher — the owner picks "Menu", never a slug. */
const PAGE_NAMES = {
  home: 'Home',
  menu: 'Menu',
  about: 'Our Story',
  events: 'Events',
  location: 'Hours & Location',
  contact: 'Contact',
  community: 'Community',
  reviews: 'Reviews',
  'gallery-wall': 'Gallery Wall',
  troublemakers: 'Troublemakers',
  neighborhood: 'Local Love',
  timeline: 'Timeline',
};

/* Rows the canvas renders: draft replaces live data wholesale (the same
   resolution rule publishData uses — draft_data ?? data), hidden rows included
   so the owner can see and un-hide them. */
const resolveForCanvas = (rows) => rows.map((s) => ({ ...s, data: (s.draft_data ?? s.data) || {} }));

/* Seed fallback mirrors dataService's synthetic ids (read-only mode). */
const seedSections = (slug) =>
  (seed.SECTIONS[slug] || []).map((s, i) => ({
    id: `seed-${slug}-${i}`,
    page_slug: slug,
    display_order: i,
    status: 'published',
    visible: true,
    ...s,
  }));

const SAVE_LABELS = {
  pending: 'Saving…',
  saving: 'Saving…',
  saved: '✓ Draft saved',
  error: '⚠ Autosave failed — retrying on next change',
};

export default function EditorApp() {
  const { slug: slugParam } = useParams();
  const slug = PAGE_NAMES[slugParam] ? slugParam : 'home';
  const navigate = useNavigate();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const canvasRef = useRef(null);

  const [sections, setSections] = useState(null); // raw rows (draft_data intact)
  const [concept, setConcept] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null); // { field, index, itemLabel, nonce }
  const [viewport, setViewport] = useState('desktop');
  const [saveState, setSaveState] = useState('idle');

  // Debounced draft autosave: latest-wins per section, serialized writes,
  // one revision snapshot per section per session (never per keystroke).
  const queueRef = useRef(null);
  if (!queueRef.current) {
    queueRef.current = createDraftQueue({
      write: (id, dataObj) => saveDataDraftQuiet('sections', id, dataObj),
      snapshotOnce: (id) => snapshotRecord('sections', id),
      onStatus: (state, err) => {
        setSaveState(state);
        if (state === 'error') toastRef.current(err?.message || 'Autosave failed', 'error');
      },
    });
  }

  const loadSections = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSections(seedSections(slug));
      return;
    }
    const { data } = await supabase.from('sections').select('*').eq('page_slug', slug).order('display_order');
    setSections(data || []);
  }, [slug]);

  useEffect(() => {
    setSelectedId(null);
    setSections(null);
    loadSections();
    // leaving this page (or the editor): make sure pending drafts land
    return () => { queueRef.current.flushAll(); };
  }, [loadSections]);

  useEffect(() => {
    getContentBlock('homepage_concept').then((c) => setConcept(c?.concept || 'gallery_wall'));
  }, []);

  // Escape closes the section panel (back to the page outline).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setSelectedId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Warn on tab close only while a write is actually pending.
  useEffect(() => {
    function onBeforeUnload(e) {
      if (queueRef.current.hasPending()) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const canvasSections = useMemo(() => (sections ? resolveForCanvas(sections) : []), [sections]);
  const selected = sections?.find((s) => String(s.id) === String(selectedId)) || null;
  const draftCount = sections?.filter((s) => s.draft_data).length || 0;

  /* The home hero row keeps its stored type; the VISIBLE component is whichever
     concept is chosen. The panel must edit what the owner is looking at. */
  const isHomeHero = Boolean(selected && slug === 'home' && HERO_TYPES.has(selected.type));
  const effectiveType = isHomeHero ? CONCEPT_TO_TYPE[concept] || selected.type : selected?.type;

  async function changeConcept(next) {
    setConcept(next); // canvas swaps the hero live
    try {
      const { error } = await supabase
        .from('content_blocks')
        .upsert({ key: 'homepage_concept', data: { concept: next }, status: 'published' }, { onConflict: 'key' });
      if (error) throw error;
      toast('Homepage look updated');
    } catch (e) {
      toast(e.message || 'Could not save the look', 'error');
    }
  }

  /* Selection arrives from the canvas as { id, field?, index?, itemLabel? }
     (element-level precision) or from the outline as a bare id. */
  function handleSelect(payload) {
    if (!isSupabaseConfigured) {
      toast("Editing needs Supabase connected — the canvas is read-only right now.", 'error');
      return;
    }
    const p = payload && typeof payload === 'object' ? payload : { id: payload };
    if (!p.id) return;
    setSelectedId(p.id);
    setFocusTarget({
      field: p.field ?? null,
      index: p.index ?? null,
      itemLabel: p.itemLabel ?? null,
      nonce: Date.now(), // re-triggers targeting even for the same field
    });
  }

  function handleNavigate(nextSlug) {
    if (PAGE_NAMES[nextSlug] && nextSlug !== slug) navigate(`/admin/editor/${nextSlug}`);
  }

  /* Typing in the panel: canvas updates immediately (optimistic draft_data on
     the row), the queue persists it ~700ms later. */
  function handleChangeData(id, dataObj) {
    setSections((rows) =>
      rows.map((r) => (String(r.id) === String(id) ? { ...r, draft_data: dataObj } : r))
    );
    queueRef.current.enqueue(id, dataObj);
  }

  async function publishAll() {
    try {
      await queueRef.current.flushAll(); // drafts must be on the server first
      const drafts = sections.filter((s) => s.draft_data);
      await Promise.all(drafts.map((s) => publishData('sections', s.id)));
      toast(drafts.length ? `Published ${drafts.length} change${drafts.length === 1 ? '' : 's'} 🎉` : 'Nothing to publish');
      loadSections();
    } catch (e) {
      toast(e.message || 'Publish failed', 'error');
    }
  }

  return (
    <div className="admin tb-editor">
      <header className="tb-editor__topbar">
        <Link to="/admin/settings" className="tb-editor__back" title="Hours, inbox, media & more">⚙ Settings</Link>
        <label className="tb-editor__pagepick">
          <span className="sr-only">Page</span>
          <select value={slug} onChange={(e) => navigate(`/admin/editor/${e.target.value}`)}>
            {Object.entries(PAGE_NAMES).map(([s, name]) => (
              <option key={s} value={s}>{name}</option>
            ))}
          </select>
        </label>

        <span className="tb-editor__savestate" role="status">{SAVE_LABELS[saveState] || ''}</span>

        <div className="tb-editor__viewports" role="group" aria-label="Preview width">
          <button
            className={`tb-editor__vp ${viewport === 'desktop' ? 'is-active' : ''}`}
            onClick={() => setViewport('desktop')}
            title="Desktop width"
          >
            🖥
          </button>
          <button
            className={`tb-editor__vp ${viewport === 'mobile' ? 'is-active' : ''}`}
            onClick={() => setViewport('mobile')}
            title="Phone width"
          >
            📱
          </button>
        </div>

        <div className="tb-editor__actions">
          <button className="btn btn--accent btn--sm" onClick={publishAll} disabled={draftCount === 0}>
            {draftCount > 0 ? `Publish (${draftCount})` : 'Published ✓'}
          </button>
          <a className="tb-editor__viewsite" href={publicUrl(slug)} target="_blank" rel="noreferrer">
            Site ↗
          </a>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="tb-editor__notice">
          Read-only preview — connect Supabase to edit content.
        </p>
      )}

      <div className="tb-editor__body">
        {sections === null ? (
          <Spinner label="Loading page…" />
        ) : (
          <Canvas
            ref={canvasRef}
            slug={slug}
            sections={canvasSections}
            selectedId={selectedId}
            concept={concept}
            viewport={viewport}
            onSelect={handleSelect}
            onNavigate={handleNavigate}
            onLocked={(message) => toast(message || 'That part is managed by your developer.')}
          />
        )}
        {!selected && sections !== null && isSupabaseConfigured && (
          <PagePanel
            slug={slug}
            pageName={PAGE_NAMES[slug]}
            sections={sections}
            selectedId={selectedId}
            onSelect={handleSelect}
            onChanged={loadSections}
          />
        )}
        {selected && (
          <SectionPanel
            key={selected.id}
            section={selected}
            effectiveType={effectiveType}
            focusTarget={focusTarget}
            onChangeData={handleChangeData}
            onClose={() => setSelectedId(null)}
            onRestored={loadSections}
            onCollectionChanged={(table) => canvasRef.current?.invalidate(table)}
          >
            {isHomeHero && (
              <div className="tb-panel__concepts">
                <p className="tb-panel__grouplabel">Homepage look</p>
                <div className="concept-picker concept-picker--panel">
                  {CONCEPTS.map((c) => (
                    <label key={c.value} className={`concept-option ${concept === c.value ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="tb-concept"
                        value={c.value}
                        checked={concept === c.value}
                        onChange={() => changeConcept(c.value)}
                      />
                      <strong>{c.label}</strong>
                      <span>{c.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
