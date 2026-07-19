import { useEffect, useRef, useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CanvasEditingContext } from '../lib/canvasContext.jsx';
import { MSG, postToParent, listen } from '../lib/canvasBridge.js';
import { bump } from '../lib/dataVersion.js';
import { schemaFor } from '../admin/editors/schemas.js';
import { CONCEPT_TO_TYPE, HERO_TYPES } from '../lib/concepts.js';
import { matchField, locateFieldElement } from './fieldMatcher.js';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import AnnouncementBanner from '../components/AnnouncementBanner.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Home from '../pages/Home.jsx';
import SitePage from '../pages/SitePage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import PrivacyPage from '../pages/PrivacyPage.jsx';
import AccessibilityPage from '../pages/AccessibilityPage.jsx';
import NotFound from '../pages/NotFound.jsx';
import './canvas.css';

/* The editor canvas: the REAL public page, booted as its own document inside
   the editor's iframe. Content arrives from the parent over postMessage (so
   hidden sections and drafts render too); clicks select sections instead of
   acting; internal links switch which page is being edited. Deliberately
   excluded from the real shell: useAnalytics (no GA4 from editor sessions),
   ConsentBanner, ScrollToTop. */

const slugToPath = (slug) => (slug === 'home' ? '/' : `/${slug}`);

function pathToSlug(pathname) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let p = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  p = p.replace(/^\/+|\/+$/g, '');
  return p === '' ? 'home' : p;
}

/* Developer-managed areas get an honest lock: hover names them, click explains
   where (or by whom) they're edited instead of silently doing nothing. */
function Locked({ label, message, children }) {
  return (
    <div data-tb-locked={label} data-tb-locked-msg={message} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

const GENERIC_LOCK_MSG = 'This part of the site is managed by your developer.';

function Shell({ children }) {
  return (
    <>
      <Locked label="Announcement banner" message="The announcement banner is edited in ⚙ Settings → Quick Blocks.">
        <AnnouncementBanner />
      </Locked>
      <Locked label="Header & navigation" message="The header, logo, and navigation are set up by your developer.">
        <Nav />
      </Locked>
      <main id="main">{children}</main>
      <Locked label="Footer" message="The footer is set up by your developer — social links live in ⚙ Settings → Quick Blocks.">
        <Footer />
      </Locked>
    </>
  );
}

const truncate = (s, n = 26) => (s.length > n ? `${s.slice(0, n)}…` : s);
const rectOf = (el) => {
  const r = el?.getBoundingClientRect?.();
  return r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
};

/* Capture-phase interaction layer: every click is intercepted. A click inside
   a tagged section is matched to the exact FIELD the element renders (see
   fieldMatcher.js) and selects section + field; a click on an internal link
   (nav/footer chrome) switches the edited page; everything else is inert.
   Hovering names the specific thing under the cursor and rings it; the
   selected element keeps a solid ring that survives re-renders. */
function Interactions({ pushed }) {
  const [chip, setChip] = useState(null);
  const [hoverRect, setHoverRect] = useState(null);
  const [selRect, setSelRect] = useState(null);
  const stateRef = useRef(pushed);
  stateRef.current = pushed;
  const hoverRef = useRef(null); //  matched hovered element
  const selRef = useRef(null); //    { sectionId, field, index, el }
  const refreshSelectedRef = useRef(() => {});

  useEffect(() => {
    /* Section wrapper → its row, effective schema fields (concept-aware on
       home), and whether it's collection-backed. */
    function infoFor(wrap) {
      const { sections = [], slug, concept } = stateRef.current || {};
      const id = wrap.getAttribute('data-tb-section-id');
      const row = sections.find((s) => String(s.id) === String(id));
      if (!row) return null;
      const effType =
        slug === 'home' && HERO_TYPES.has(row.type) && CONCEPT_TO_TYPE[concept]
          ? CONCEPT_TO_TYPE[concept]
          : row.type;
      const schema = schemaFor(effType);
      return {
        id,
        row,
        fields: schema.fields || [],
        hasManager: Boolean(schema.manager),
        label: wrap.getAttribute('data-tb-label') || 'Section',
      };
    }

    function matchAt(target, wrap, info) {
      const sectionEl = wrap.firstElementChild;
      if (!sectionEl || !info) return null;
      return matchField({
        target,
        sectionEl,
        fields: info.fields,
        data: (info.row.draft_data ?? info.row.data) || info.row.data || {},
        hasManager: info.hasManager,
      });
    }

    /* Anything outside a section that is real content (not the page scaffold)
       is developer territory — say so instead of silently ignoring it. */
    function lockedInfo(target) {
      const el = target instanceof Element ? target : target?.parentElement;
      if (!el) return null;
      const wrapper = el.closest('[data-tb-locked]');
      if (wrapper) {
        return {
          label: wrapper.getAttribute('data-tb-locked') || 'Developer setting',
          message: wrapper.getAttribute('data-tb-locked-msg') || GENERIC_LOCK_MSG,
          el: wrapper.firstElementChild || el,
        };
      }
      const scaffold = new Set(['HTML', 'BODY', 'MAIN']);
      if (scaffold.has(el.tagName) || el.classList.contains('tb-canvas-root') || el.id === 'root') return null;
      return { label: 'Set up by your developer', message: GENERIC_LOCK_MSG, el };
    }

    function computeHover(target) {
      const wrap = target.closest?.('[data-tb-section-id]');
      if (!wrap) {
        hoverRef.current = null;
        setHoverRect(null);
        const lock = lockedInfo(target);
        if (lock) {
          const anchor = rectOf(lock.el);
          setChip(anchor ? { locked: true, label: lock.label, x: Math.max(anchor.left, 10), y: Math.max(anchor.top - 34, 10) } : null);
        } else {
          setChip(null);
        }
        return;
      }
      const info = infoFor(wrap);
      const m = info ? matchAt(target, wrap, info) : null;
      hoverRef.current = m?.el || null;
      const hintField = !m?.field && wrap.getAttribute('data-tb-field');
      const fieldName = m?.field || hintField || null;
      const fieldLabel = fieldName ? info?.fields.find((f) => f.name === fieldName)?.label || null : null;
      const label = m?.itemLabel ? `“${truncate(m.itemLabel)}”` : fieldLabel || info?.label || 'Section';
      const anchor = rectOf(m?.el) || rectOf(wrap.firstElementChild);
      if (!anchor) { setChip(null); setHoverRect(null); return; }
      setChip({ label, x: Math.max(anchor.left, 10), y: Math.max(anchor.top - 34, 10) });
      setHoverRect(m?.el ? rectOf(m.el) : null);
    }

    function refreshSelected() {
      const s = selRef.current;
      if (!s) { setSelRect(null); return; }
      let el = s.el;
      if (!el || !el.isConnected) {
        // re-render replaced the node — re-locate by field
        const wrap = document.querySelector(`[data-tb-section-id="${CSS.escape(String(s.sectionId))}"]`);
        const info = wrap && infoFor(wrap);
        el =
          wrap && info && s.field
            ? locateFieldElement(
                wrap.firstElementChild,
                info.fields,
                (info.row.draft_data ?? info.row.data) || {},
                s.field,
                s.index
              )
            : null;
        s.el = el;
      }
      setSelRect(rectOf(el));
    }
    // expose for the state-sync effect below
    refreshSelectedRef.current = refreshSelected;

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const wrap = e.target.closest?.('[data-tb-section-id]');
      if (wrap) {
        const info = infoFor(wrap);
        const payload = { id: wrap.getAttribute('data-tb-section-id') };
        const m = info ? matchAt(e.target, wrap, info) : null;
        const hintField = m?.field || wrap.getAttribute('data-tb-field') || null;
        if (hintField) {
          payload.field = hintField;
          if (m?.index != null) payload.index = m.index;
        }
        if (m?.itemLabel) payload.itemLabel = m.itemLabel;
        selRef.current = { sectionId: payload.id, field: m?.field ?? null, index: m?.index ?? null, el: m?.el || null };
        setSelRect(rectOf(m?.el));
        postToParent(MSG.SELECT, payload);
        return;
      }
      const a = e.target.closest?.('a');
      if (a && a.href) {
        try {
          const url = new URL(a.href);
          if (url.origin === window.location.origin) {
            postToParent(MSG.NAVIGATE, { slug: pathToSlug(url.pathname) });
            return;
          }
        } catch { /* unparsable href — ignore */ }
      }
      const lock = lockedInfo(e.target);
      if (lock) postToParent(MSG.LOCKED, { message: lock.message });
    }

    function onMouseDown(e) {
      // A mousedown on a link/button would focus it, dragging keyboard focus
      // into the canvas document. Selection is a click concern; block focus.
      if (e.target.closest?.('a, button, input, select, textarea, [tabindex]')) e.preventDefault();
    }

    function onOver(e) { computeHover(e.target); }
    function onScrollOrResize() {
      setHoverRect(rectOf(hoverRef.current));
      refreshSelected();
      setChip((c) => {
        const anchor = rectOf(hoverRef.current);
        return c && anchor ? { ...c, x: Math.max(anchor.left, 10), y: Math.max(anchor.top - 34, 10) } : c;
      });
    }
    function onLeave() { hoverRef.current = null; setChip(null); setHoverRect(null); }

    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', onScrollOrResize);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Keep the selected ring honest across parent pushes: drop it when the
  // parent deselects/moves selection; re-measure after data edits re-render.
  useEffect(() => {
    const sel = selRef.current;
    if (sel && String(pushed?.selectedId ?? '') !== String(sel.sectionId)) {
      selRef.current = null;
      setSelRect(null);
      return;
    }
    const raf = requestAnimationFrame(() => refreshSelectedRef.current());
    return () => cancelAnimationFrame(raf);
  }, [pushed]);

  return (
    <>
      {hoverRect && <div className="tb-ring tb-ring--hover" style={hoverRect} />}
      {selRect && <div className="tb-ring tb-ring--sel" style={selRect} />}
      {chip && (
        <div className={`tb-chip ${chip.locked ? 'tb-chip--locked' : ''}`} style={{ left: chip.x, top: chip.y }}>
          {chip.locked ? <>🔒 {chip.label} <span>Not editable here</span></> : <>{chip.label} <span>✏️ Click to edit</span></>}
        </div>
      )}
    </>
  );
}

export default function CanvasApp() {
  const [pushed, setPushed] = useState(null); // { slug, sections, selectedId, concept }

  useEffect(() => {
    const unlisten = listen(
      () => window.parent,
      (type, payload) => {
        if (type === MSG.STATE) setPushed(payload || null);
        else if (type === MSG.INVALIDATE && payload?.key) bump(payload.key);
      }
    );
    // Idempotent under StrictMode's double-mount: the parent just re-sends state.
    postToParent(MSG.READY, {});
    return unlisten;
  }, []);

  // Selection made in the parent's outline: bring that section into view.
  const selectedId = pushed?.selectedId;
  useEffect(() => {
    if (!selectedId) return;
    const el = document.querySelector(`[data-tb-section-id="${CSS.escape(String(selectedId))}"]`);
    el?.firstElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  if (!pushed) return null; // parent sends state right after READY

  const { slug = 'home' } = pushed;
  return (
    <CanvasEditingContext.Provider value={pushed}>
      <div className="tb-canvas-root">
        <ErrorBoundary>
          {/* key remounts the router on page switch, like a real navigation */}
          <MemoryRouter key={slug} initialEntries={[slugToPath(slug)]}>
            <Interactions pushed={pushed} />
            <Routes>
              <Route path="/" element={<Shell><Home /></Shell>} />
              <Route path="/menu" element={<Shell><SitePage slug="menu" /></Shell>} />
              <Route path="/about" element={<Shell><SitePage slug="about" /></Shell>} />
              <Route path="/events" element={<Shell><SitePage slug="events" /></Shell>} />
              <Route path="/location" element={<Shell><SitePage slug="location" /></Shell>} />
              <Route path="/contact" element={<Shell><ContactPage /></Shell>} />
              <Route path="/community" element={<Shell><SitePage slug="community" showSocial /></Shell>} />
              <Route path="/timeline" element={<Shell><SitePage slug="timeline" /></Shell>} />
              <Route path="/reviews" element={<Shell><SitePage slug="reviews" /></Shell>} />
              <Route path="/gallery-wall" element={<Shell><SitePage slug="gallery-wall" /></Shell>} />
              <Route path="/troublemakers" element={<Shell><SitePage slug="troublemakers" /></Shell>} />
              <Route path="/neighborhood" element={<Shell><SitePage slug="neighborhood" /></Shell>} />
              <Route path="/privacy" element={<Shell><PrivacyPage /></Shell>} />
              <Route path="/accessibility" element={<Shell><AccessibilityPage /></Shell>} />
              <Route path="*" element={<Shell><NotFound /></Shell>} />
            </Routes>
          </MemoryRouter>
        </ErrorBoundary>
      </div>
    </CanvasEditingContext.Provider>
  );
}
