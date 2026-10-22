import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { getContentBlock } from '../../lib/dataService.js';
import { updateRecord, deleteRecord, clearDraft, saveDataDraftQuiet } from '../lib/adminData.js';
import { ActionBar, PublishScope, usePublishScope, usePublishUnit, useUnsaved } from '../lib/publishing.jsx';
import { same } from '../lib/publishHelpers.js';
import { publicUrl } from '../../lib/config.js';
import { bump } from '../../lib/dataVersion.js';
import { CONCEPT_TO_TYPE, DEFAULT_CONCEPT, HERO_TYPES } from '../../lib/concepts.js';
import { LuArrowLeft, LuExternalLink, LuMonitor, LuSmartphone } from 'react-icons/lu';
import { Icon } from '../components/Icon.jsx';
import ConceptPicker from '../components/ConceptPicker.jsx';
import * as seed from '../../lib/seed.js';
import { useToast, Spinner } from '../components/ui.jsx';
import Canvas from './Canvas.jsx';
import SectionPanel from './SectionPanel.jsx';
import PagePanel from './PagePanel.jsx';
import WallEditor from './WallEditor.jsx';
import './editor.css';
import { PAGE_NAMES } from '../lib/nav.js';

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

let tempSeq = 0;
const isTemp = (id) => String(id).startsWith('new-');
/* working copy of a server row: what the owner sees and edits. A leftover
   server draft (from Preview, or the old autosave) is the starting point. */
const toWork = (row) => ({
  id: row.id,
  type: row.type,
  visible: row.visible !== false,
  data: (row.draft_data ?? row.data) || {},
});

/* The on-page editor.

   Explicit publishing: everything — text, photos, the homepage look, the
   search details, moving / hiding / adding / removing sections, the featured
   drink — is held here in local state and shown on the canvas straight away,
   but nothing reaches the live site until Publish. Preview saves the text and
   photo edits as a private draft (never public) so ?preview=1 can show them
   in a new tab. Discard goes back to exactly what's live. */
export default function EditorApp() {
  return (
    <PublishScope id="editor">
      <Editor />
    </PublishScope>
  );
}

function Editor() {
  const { slug: slugParam } = useParams();
  const slug = PAGE_NAMES[slugParam] ? slugParam : 'home';
  const navigate = useNavigate();
  const toast = useToast();
  const scope = usePublishScope();
  const { guard, isDirty } = useUnsaved();
  const canvasRef = useRef(null);

  const [live, setLive] = useState(null); //   server rows for this page
  const [work, setWork] = useState(null); //   working rows in working order
  const [removed, setRemoved] = useState([]); // server rows marked for removal
  const [concept, setConcept] = useState(null);
  const [savedConcept, setSavedConcept] = useState(null);
  const [meta, setMeta] = useState({ title: '', meta_description: '' });
  const [savedMeta, setSavedMeta] = useState(null);
  const [pageExists, setPageExists] = useState(false);
  const [blocks, setBlocks] = useState({}); //  key → { saved, value }
  const [selectedId, setSelectedId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [viewport, setViewport] = useState('desktop');
  /* The Gallery Wall room's own editor (the photo with every piece's box)
     takes over the canvas while it's open; its changes are page changes. */
  const [wallId, setWallId] = useState(null);
  const [search, setSearch] = useSearchParams();

  const loadSections = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const rows = seedSections(slug);
      setLive(rows);
      setWork(rows.map(toWork));
      return;
    }
    const { data } = await supabase.from('sections').select('*').eq('page_slug', slug).order('display_order');
    setLive(data || []);
    setWork((data || []).map(toWork));
    setRemoved([]);
  }, [slug]);

  useEffect(() => {
    setSelectedId(null);
    setWallId(null);
    setLive(null);
    setWork(null);
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let alive = true;
    supabase.from('pages').select('*').eq('slug', slug).maybeSingle().then(({ data }) => {
      if (!alive) return;
      const m = { title: data?.title || '', meta_description: data?.meta_description || '' };
      setPageExists(Boolean(data));
      setMeta(m);
      setSavedMeta(m);
    });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    getContentBlock('homepage_concept').then((c) => {
      const v = c?.concept || DEFAULT_CONCEPT;
      setConcept(v);
      setSavedConcept(v);
    });
  }, []);

  /* /admin/editor/gallery-wall?wall=1 (where "Edit the Gallery Wall" goes)
     opens straight into the wall editor. */
  const wantsWall = search.get('wall') === '1';
  useEffect(() => {
    if (!wantsWall || !work || !isSupabaseConfigured) return;
    const room = work.find((w) => w.type === 'gallery_wall_room');
    if (room) {
      setSelectedId(room.id);
      setWallId(room.id);
    }
    const next = new URLSearchParams(search);
    next.delete('wall');
    setSearch(next, { replace: true });
  }, [wantsWall, work, search, setSearch]);

  // Escape closes the section panel (back to the page outline).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return;
      if (wallId) {
        // the wall editor uses Escape to let go of a box; only leave when nothing is chosen
        if (!document.activeElement?.closest?.('.wed')) setWallId(null);
        return;
      }
      closePanel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  /* ---- What changed? --------------------------------------------------- */
  const liveById = useMemo(() => new Map((live || []).map((r) => [String(r.id), r])), [live]);
  const rowState = useCallback(
    (w) => {
      if (isTemp(w.id)) return 'new';
      const base = liveById.get(String(w.id));
      if (!base) return null;
      if (!same(w.data, base.data || {}) || w.visible !== (base.visible !== false) || base.draft_data) return 'changed';
      return null;
    },
    [liveById]
  );
  const liveOrder = (live || []).filter((r) => !removed.some((x) => x.id === r.id)).map((r) => String(r.id));
  const workOrder = (work || []).filter((r) => !isTemp(r.id)).map((r) => String(r.id));
  const orderChanged = Boolean(work) && !same(workOrder, liveOrder);
  const changedRows = (work || []).filter((w) => rowState(w));
  const conceptDirty = savedConcept !== null && concept !== savedConcept;
  const metaDirty = savedMeta !== null && !same(meta, savedMeta);
  const dirtyBlocks = Object.entries(blocks).filter(([, b]) => !same(b.value, b.saved));
  const pageDirty =
    isSupabaseConfigured &&
    (changedRows.length > 0 || removed.length > 0 || orderChanged || conceptDirty || metaDirty || dirtyBlocks.length > 0);
  const changeCount = changedRows.length + removed.length + (orderChanged ? 1 : 0) + (conceptDirty ? 1 : 0) + (metaDirty ? 1 : 0) + dirtyBlocks.length;

  /* ---- Publish: the ONLY place this page writes to live columns -------- */
  async function publishPage() {
    let nextLive = [...live];
    let nextWork = [...work];
    let nextRemoved = [...removed];
    const reindex = orderChanged || work.some((w) => isTemp(w.id));
    try {
      for (const r of removed) {
        await deleteRecord('sections', r.id);
        nextRemoved = nextRemoved.filter((x) => x.id !== r.id);
        nextLive = nextLive.filter((x) => x.id !== r.id);
      }
      for (let i = 0; i < nextWork.length; i += 1) {
        const w = nextWork[i];
        if (isTemp(w.id)) {
          const { data: created, error } = await supabase
            .from('sections')
            .insert({ page_slug: slug, type: w.type, display_order: i, data: w.data, status: 'published', visible: w.visible })
            .select()
            .maybeSingle();
          if (error) throw error;
          if (created) {
            nextLive = [...nextLive, created];
            nextWork = nextWork.map((x) => (x.id === w.id ? toWork(created) : x));
            if (selectedId === w.id) setSelectedId(created.id);
          }
          continue;
        }
        const base = nextLive.find((x) => String(x.id) === String(w.id));
        if (!base) continue;
        const changes = {};
        if (!same(w.data, base.data || {}) || base.draft_data) {
          changes.data = w.data;
          changes.draft_data = null;
          changes.status = 'published';
        }
        if (w.visible !== (base.visible !== false)) changes.visible = w.visible;
        if (reindex && base.display_order !== i) changes.display_order = i;
        if (!Object.keys(changes).length) continue;
        const updated = await updateRecord('sections', w.id, changes);
        nextLive = nextLive.map((x) => (String(x.id) === String(w.id) ? updated || { ...base, ...changes } : x));
      }
      if (conceptDirty) {
        const { error } = await supabase
          .from('content_blocks')
          .upsert({ key: 'homepage_concept', data: { concept }, status: 'published' }, { onConflict: 'key' });
        if (error) throw error;
        setSavedConcept(concept);
      }
      if (metaDirty) {
        if (pageExists) await updateRecord('pages', slug, meta, { idCol: 'slug' });
        else {
          const { error } = await supabase.from('pages').upsert({ slug, ...meta });
          if (error) throw error;
          setPageExists(true);
        }
        setSavedMeta(meta);
      }
      for (const [key, b] of dirtyBlocks) {
        const { error } = await supabase.from('content_blocks').upsert({ key, data: b.value, status: 'published' }, { onConflict: 'key' });
        if (error) throw error;
        setBlocks((all) => ({ ...all, [key]: { saved: b.value, value: all[key]?.value ?? b.value } }));
        bump('content_blocks');
        canvasRef.current?.invalidate('content_blocks');
      }
    } finally {
      setLive(nextLive);
      setWork(nextWork);
      setRemoved(nextRemoved);
    }
  }

  /* Discard = back to exactly what's live (including clearing any private
     draft saved by Preview). */
  async function discardPage() {
    for (const r of live.filter((x) => x.draft_data)) await clearDraft('sections', r.id);
    const clean = live.map(({ draft_data: _d, ...r }) => r);
    setLive(clean);
    setWork(clean.map(toWork));
    setRemoved([]);
    setConcept(savedConcept);
    if (savedMeta) setMeta(savedMeta);
    setBlocks((all) => Object.fromEntries(Object.entries(all).map(([k, b]) => [k, { ...b, value: b.saved }])));
    setSelectedId((id) => (id && isTemp(id) ? null : id));
  }

  usePublishUnit('editor:page', {
    dirty: pageDirty,
    publish: publishPage,
    discard: discardPage,
    note: pageDirty
      ? `${changeCount} unpublished change${changeCount === 1 ? '' : 's'} on ${PAGE_NAMES[slug]} — not on the site yet`
      : undefined,
  });

  /* Preview in a new tab: text/photo edits are saved as a PRIVATE draft
     (draft_data — the public site never reads it) and the page opens with
     ?preview=1. Order, visibility, new sections and the look are shown in the
     editor canvas itself. */
  async function preview() {
    const win = window.open('', '_blank');
    try {
      for (const w of work) {
        if (isTemp(w.id)) continue;
        const base = liveById.get(String(w.id));
        if (!base) continue;
        const differsFromLive = !same(w.data, base.data || {});
        if (differsFromLive && !same(w.data, base.draft_data)) await saveDataDraftQuiet('sections', w.id, w.data);
        else if (!differsFromLive && base.draft_data) await clearDraft('sections', w.id);
      }
      setLive((rows) =>
        rows.map((r) => {
          const w = work.find((x) => String(x.id) === String(r.id));
          if (!w) return r;
          return { ...r, draft_data: same(w.data, r.data || {}) ? null : w.data };
        })
      );
      const url = `${publicUrl(slug)}?preview=1`;
      if (win) win.location.href = url;
      else window.open(url, '_blank');
    } catch (e) {
      win?.close();
      toast(`Couldn’t open the preview: ${e.message || 'please try again'}`, 'error');
    }
  }

  /* ---- Selection ------------------------------------------------------- */
  const embeddedDirty = () =>
    scope.unitDirty((id) => id !== 'editor:page') || isDirty((id) => id.startsWith('form:'));
  const listGuard = (action) =>
    guard(action, {
      when: embeddedDirty,
      title: 'Leave this list without publishing?',
      body: 'You changed items in this list but haven’t published them. If you close it now those changes are thrown away. Stay and press Publish to keep them.',
      confirmLabel: 'Close and discard',
    });

  function closePanel() {
    if (selectedId == null) return;
    listGuard(() => setSelectedId(null));
  }

  function handleSelect(payload) {
    if (!isSupabaseConfigured) {
      toast('Editing needs Supabase connected — the canvas is read-only right now.', 'error');
      return;
    }
    const p = payload && typeof payload === 'object' ? payload : { id: payload };
    if (!p.id) return;
    const go = () => {
      setSelectedId(p.id);
      setFocusTarget({ field: p.field ?? null, index: p.index ?? null, itemLabel: p.itemLabel ?? null, nonce: Date.now() });
    };
    if (String(p.id) === String(selectedId) && !p.itemLabel) go();
    else listGuard(go);
  }

  function goToPage(nextSlug) {
    if (!PAGE_NAMES[nextSlug] || nextSlug === slug) return;
    guard(() => navigate(`/admin/editor/${nextSlug}`));
  }

  /* ---- Edits (all local) ---------------------------------------------- */
  function handleChangeData(id, dataObj) {
    setWork((rows) => rows.map((r) => (String(r.id) === String(id) ? { ...r, data: dataObj } : r)));
  }
  function moveSection(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= work.length) return;
    const next = [...work];
    [next[i], next[j]] = [next[j], next[i]];
    setWork(next);
  }
  function toggleVisible(id) {
    setWork((rows) => rows.map((r) => (String(r.id) === String(id) ? { ...r, visible: !r.visible } : r)));
  }
  function removeSection(id) {
    const row = live.find((r) => String(r.id) === String(id));
    if (row) setRemoved((list) => [...list, row]);
    setWork((rows) => rows.filter((r) => String(r.id) !== String(id)));
    if (String(selectedId) === String(id)) setSelectedId(null);
  }
  function undoRemove(id) {
    const row = live.find((r) => String(r.id) === String(id));
    if (!row) return;
    setRemoved((list) => list.filter((r) => r.id !== row.id));
    setWork((rows) => {
      const idx = live.findIndex((r) => r.id === row.id);
      const next = [...rows];
      next.splice(Math.min(idx, next.length), 0, toWork(row));
      return next;
    });
  }
  function addSection(type) {
    tempSeq += 1;
    const id = `new-${tempSeq}`;
    setWork((rows) => [...rows, { id, type, visible: true, data: {} }]);
    return id;
  }

  /* Featured-drink style blocks inside a section panel */
  const blockApi = {
    get: (key) => blocks[key]?.value,
    loaded: (key, value) => setBlocks((all) => (all[key] ? all : { ...all, [key]: { saved: value, value } })),
    set: (key, value) => setBlocks((all) => ({ ...all, [key]: { saved: all[key]?.saved ?? {}, value } })),
    dirty: (key) => Boolean(blocks[key]) && !same(blocks[key].value, blocks[key].saved),
  };

  /* ---- Canvas rows ------------------------------------------------------ */
  const canvasSections = useMemo(
    () => (work || []).map((w, i) => ({ ...(liveById.get(String(w.id)) || { page_slug: slug, status: 'published' }), ...w, draft_data: null, display_order: i })),
    [work, liveById, slug]
  );
  const selectedWork = work?.find((s) => String(s.id) === String(selectedId)) || null;
  const selected = selectedWork ? { ...(liveById.get(String(selectedWork.id)) || {}), ...selectedWork, draft_data: null } : null;

  const isHomeHero = Boolean(selected && slug === 'home' && HERO_TYPES.has(selected.type));
  const effectiveType = isHomeHero ? CONCEPT_TO_TYPE[concept] || selected.type : selected?.type;

  return (
    <div className="admin tb-editor">
      <header className="tb-editor__topbar">
        <Link to="/admin" className="tb-editor__back" title="Chalkboard, hours, menu, events & more"><Icon icon={LuArrowLeft} size={16} />Admin home</Link>
        <label className="tb-editor__pagepick">
          <span className="tb-editor__pagelabel">Editing page</span>
          <select value={slug} onChange={(e) => goToPage(e.target.value)} aria-label="Page to edit">
            {Object.entries(PAGE_NAMES).map(([s, name]) => (
              <option key={s} value={s}>{name}</option>
            ))}
          </select>
        </label>

        <div className="tb-editor__viewports" role="group" aria-label="Preview width">
          <button className={`tb-editor__vp ${viewport === 'desktop' ? 'is-active' : ''}`} onClick={() => setViewport('desktop')} title="Desktop width" aria-label="Desktop width" aria-pressed={viewport === 'desktop'}><Icon icon={LuMonitor} /></button>
          <button className={`tb-editor__vp ${viewport === 'mobile' ? 'is-active' : ''}`} onClick={() => setViewport('mobile')} title="Phone width" aria-label="Phone width" aria-pressed={viewport === 'mobile'}><Icon icon={LuSmartphone} /></button>
        </div>

        <a className="tb-editor__viewsite" href={publicUrl(slug)} target="_blank" rel="noreferrer"><Icon icon={LuExternalLink} size={16} /><span>Live site</span></a>
      </header>

      {!isSupabaseConfigured && (
        <p className="tb-editor__notice">Read-only preview — connect Supabase to edit content.</p>
      )}

      <div className="tb-editor__body">
        {wallId && work && work.some((w) => String(w.id) === String(wallId)) ? (
          <WallEditor
            section={work.find((w) => String(w.id) === String(wallId))}
            onChangeData={handleChangeData}
            onClose={() => setWallId(null)}
          />
        ) : (
        <>
        {work === null ? (
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
            onNavigate={goToPage}
            onLocked={(message) => toast(message || 'That part is managed by your developer.')}
          />
        )}
        {!selected && work !== null && isSupabaseConfigured && (
          <PagePanel
            pageName={PAGE_NAMES[slug]}
            sections={work}
            removed={removed}
            rowState={rowState}
            selectedId={selectedId}
            meta={meta}
            onMeta={setMeta}
            metaDirty={metaDirty}
            onSelect={handleSelect}
            onMove={moveSection}
            onToggleVisible={toggleVisible}
            onRemove={removeSection}
            onUndoRemove={undoRemove}
            onAdd={(type) => {
              const id = addSection(type);
              toast('Section added at the bottom of the page — it goes live when you publish');
              handleSelect(id);
            }}
          />
        )}
        {selected && (
          <SectionPanel
            key={selected.id}
            section={selected}
            isNew={isTemp(selected.id)}
            effectiveType={effectiveType}
            focusTarget={focusTarget}
            onChangeData={handleChangeData}
            onClose={closePanel}
            blockApi={blockApi}
            onCollectionChanged={(table) => canvasRef.current?.invalidate(table)}
            onOpenWall={() => setWallId(selected.id)}
          >
            {isHomeHero && (
              <div className="tb-panel__concepts">
                <p className="tb-panel__grouplabel">
                  Homepage look {conceptDirty && <span className="badge badge--draft">Changed — not live yet</span>}
                </p>
                <p className="tb-panel__help">Tap a picture to preview a look full-size. Choosing one swaps it here; it goes live when you publish.</p>
                <ConceptPicker compact value={concept} live={savedConcept} onChoose={setConcept} />
              </div>
            )}
          </SectionPanel>
        )}
        </>
        )}
      </div>

      {isSupabaseConfigured && (
        <ActionBar
          preview={{
            onClick: preview,
            title: 'Opens this page in a new tab with your text and photo changes. Nobody else can see them.',
          }}
        />
      )}
    </div>
  );
}
