import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal, useToast } from '../components/ui.jsx';
import { friendlyError, publishedTime } from './publishHelpers.js';

/* =============================================================================
   Explicit publishing — the one rule the whole admin follows:

     NOTHING you change goes on the live site until you press Publish.

   Every editing screen keeps its changes in local state. A screen (or the
   on-page editor) is a <PublishScope>; each piece of it that can change calls
   usePublishUnit() with { dirty, publish, discard }. The shared <ActionBar>
   reads the scope: "Unsaved changes" indicator, Discard, optional Preview, and
   the one Publish button, which runs publish() on every dirty unit.

   <UnsavedProvider> (once, at the admin root) is the safety net: it warns
   before the tab closes and before any in-app link or guarded action would
   throw unpublished changes away.

   Photo uploads are the only thing that still touch the server early — the
   file goes to storage so it can be previewed, but no page points at it until
   Publish writes the new URL.
   ============================================================================= */

/* ---- Leave guard (whole admin) -------------------------------------------- */
const UnsavedContext = createContext({
  setSource: () => {},
  guard: (action) => action(),
  anyDirty: () => false,
  isDirty: () => false,
});

export function UnsavedProvider({ children }) {
  const navigate = useNavigate();
  const sources = useRef(new Map()); // id → boolean
  const [pending, setPending] = useState(null); // { action, title, body }

  const anyDirty = useCallback(() => [...sources.current.values()].some(Boolean), []);
  const isDirty = useCallback((pred) => [...sources.current.entries()].some(([k, v]) => v && pred(k)), []);
  const setSource = useCallback((id, dirty) => {
    if (dirty) sources.current.set(id, true);
    else sources.current.delete(id);
  }, []);

  const guard = useCallback(
    (action, opts = {}) => {
      const dirty = opts.when ? opts.when() : anyDirty();
      if (!dirty) {
        action();
        return;
      }
      setPending({
        action,
        title: opts.title || 'Leave without publishing?',
        body:
          opts.body ||
          'You have changes that aren’t on the site yet. If you leave now they’ll be thrown away. Stay here and press Publish to keep them.',
        confirmLabel: opts.confirmLabel || 'Leave and discard',
      });
    },
    [anyDirty]
  );

  // Closing / reloading the tab.
  useEffect(() => {
    function onBeforeUnload(e) {
      if (!anyDirty()) return undefined;
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [anyDirty]);

  // Any in-app link (sidebar, "Settings", help links…) while changes are unpublished.
  useEffect(() => {
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!anyDirty()) return;
      e.preventDefault();
      e.stopPropagation();
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const to = (base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname) + url.search;
      const isAdmin = to.startsWith('/admin');
      guard(() => {
        sources.current.clear();
        if (isAdmin) navigate(to);
        else window.location.assign(url.href);
      });
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [anyDirty, guard, navigate]);

  const value = useMemo(() => ({ setSource, guard, anyDirty, isDirty }), [setSource, guard, anyDirty, isDirty]);

  return (
    <UnsavedContext.Provider value={value}>
      {children}
      <ConfirmModal
        open={Boolean(pending)}
        title={pending?.title}
        body={pending?.body}
        confirmLabel={pending?.confirmLabel}
        cancelLabel="Stay here"
        onConfirm={() => {
          const act = pending.action;
          setPending(null);
          act();
        }}
        onCancel={() => setPending(null)}
      />
    </UnsavedContext.Provider>
  );
}

export function useUnsaved() {
  return useContext(UnsavedContext);
}

/* ---- Publish scope (one per editing screen) ------------------------------- */
const ScopeContext = createContext(null);

export function PublishScope({ children, id = 'screen' }) {
  const toast = useToast();
  const { setSource } = useUnsaved();
  const units = useRef(new Map()); // unitId → { dirty, canDiscard, publish, discard, label }
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState('');
  const [lastPublished, setLastPublished] = useState(null);
  const [lastError, setLastError] = useState('');
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const list = () => [...units.current.entries()];
  const dirtyUnits = list().filter(([, u]) => u.dirty);
  const dirty = dirtyUnits.length > 0;
  const canDiscard = list().some(([, u]) => u.canDiscard);

  useEffect(() => {
    setSource(id, dirty);
  }, [id, dirty, setSource]);
  useEffect(() => () => setSource(id, false), [id, setSource]);

  const register = useCallback(
    (unitId, unit) => {
      const prev = units.current.get(unitId);
      units.current.set(unitId, unit);
      if (!prev || prev.dirty !== unit.dirty || prev.canDiscard !== unit.canDiscard || prev.note !== unit.note) rerender();
    },
    [rerender]
  );
  const unregister = useCallback(
    (unitId) => {
      if (units.current.delete(unitId)) rerender();
    },
    [rerender]
  );

  const publish = useCallback(async () => {
    const todo = [...units.current.values()].filter((u) => u.dirty);
    if (!todo.length) return;
    setBusy('publish');
    setLastError('');
    try {
      for (const u of todo) await u.publish();
      const at = new Date();
      setLastPublished(at);
      toast(`Published — live on the site now (${publishedTime(at)})`, 'success');
    } catch (e) {
      const msg = friendlyError(e);
      setLastError(msg);
      toast(msg, 'error', { duration: 9000 });
      // eslint-disable-next-line no-console
      console.warn('[publish]', e);
    } finally {
      setBusy('');
    }
  }, [toast]);

  const discard = useCallback(async () => {
    setBusy('discard');
    try {
      for (const u of [...units.current.values()]) if (u.dirty || u.canDiscard) await u.discard();
      setLastError('');
      toast('Changes thrown away — the site is exactly as it was', 'success');
    } catch (e) {
      toast(friendlyError(e), 'error', { duration: 9000 });
    } finally {
      setBusy('');
    }
  }, [toast]);

  const unitDirty = useCallback((pred) => [...units.current.entries()].some(([k, u]) => u.dirty && pred(k)), []);

  const notes = list().map(([, u]) => u.note).filter(Boolean);

  const value = {
    register, unregister, dirty, canDiscard, busy, setBusy, publish, discard,
    lastPublished, lastError, unitDirty, notes,
    count: dirtyUnits.length,
  };
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function usePublishScope() {
  return useContext(ScopeContext);
}

/** Register one changeable piece of a screen. `publish` should write ONLY when
    called (it is never called on change) and throw on failure; `discard`
    restores the screen to what's live. */
export function usePublishUnit(unitId, { dirty, canDiscard = dirty, publish, discard, note }) {
  const scope = useContext(ScopeContext);
  const latest = useRef({ publish, discard });
  latest.current = { publish, discard };

  const stable = useMemo(
    () => ({
      publish: (...a) => latest.current.publish(...a),
      discard: (...a) => latest.current.discard?.(...a),
    }),
    []
  );

  const register = scope?.register;
  const unregister = scope?.unregister;
  useEffect(() => {
    register?.(unitId, { dirty: Boolean(dirty), canDiscard: Boolean(canDiscard), note, ...stable });
  });
  useEffect(() => () => unregister?.(unitId), [unregister, unitId]);
}

/* ---- The shared sticky action bar ----------------------------------------- */
export function ActionBar({ preview, viewHref, viewLabel = 'View the live page ↗', publishLabel = 'Publish' }) {
  const scope = usePublishScope();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (!scope) return null;
  const { dirty, canDiscard, busy, publish, discard, lastPublished, notes } = scope;

  let status;
  if (busy === 'publish') status = 'Publishing…';
  else if (dirty && notes.length === 1) status = notes[0];
  else if (dirty && scope.count > 1) status = `Unsaved changes in ${scope.count} places — not on the site yet`;
  else if (dirty) status = 'Unsaved changes — not on the site yet';
  else if (lastPublished) status = `✓ Published at ${publishedTime(lastPublished)} — the site is up to date`;
  else status = '✓ No changes — the site is up to date';

  return (
    <div className={`actionbar ${dirty ? 'is-dirty' : ''}`} role="region" aria-label="Publish changes">
      <p className="actionbar__status" role="status" aria-live="polite">
        {dirty && busy !== 'publish' && <span className="actionbar__dot" aria-hidden="true" />}
        {status}
      </p>
      <div className="actionbar__buttons">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!canDiscard || Boolean(busy)}
          onClick={() => setConfirmDiscard(true)}
        >
          Discard
        </button>
        {preview && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={Boolean(busy)}
            onClick={preview.onClick}
            title={preview.title}
          >
            Preview ↗
          </button>
        )}
        {!preview && viewHref && (
          <a className="btn btn--ghost btn--sm actionbar__view" href={viewHref} target="_blank" rel="noreferrer">
            {viewLabel}
          </a>
        )}
        <button
          type="button"
          className="btn btn--primary actionbar__publish"
          disabled={!dirty || Boolean(busy)}
          onClick={publish}
        >
          {busy === 'publish' ? 'Publishing…' : publishLabel}
        </button>
      </div>
      <ConfirmModal
        open={confirmDiscard}
        title="Throw away your changes?"
        body="Everything you changed here since the last Publish goes back to what’s on the site now. This can’t be undone."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setConfirmDiscard(false);
          discard();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

/* ---- Screen chrome: title + one plain line about what it changes ---------- */
export function ScreenHead({ title, help, children }) {
  return (
    <header className="screenhead">
      <div className="screenhead__text">
        <h1>{title}</h1>
        {help && <p className="screenhead__help">{help}</p>}
      </div>
      {children && <div className="screenhead__actions">{children}</div>}
    </header>
  );
}

/** A full settings screen: scope + content + the sticky bar. */
export function EditScreen({ children, viewHref, viewLabel }) {
  return (
    <PublishScope>
      <div className="editscreen">{children}</div>
      <ActionBar viewHref={viewHref} viewLabel={viewLabel} />
    </PublishScope>
  );
}
