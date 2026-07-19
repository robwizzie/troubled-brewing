import { useContext } from 'react';
import { SECTION_RENDERERS, SECTION_LABELS } from './sections/registry.js';
import { CanvasEditingContext } from '../lib/canvasContext.jsx';

/* Renders one section by looking up its type in the registry. Unknown types
   render nothing (forward-compatible) rather than crashing the page.

   Inside the editor canvas (CanvasEditingContext non-null) each section gets a
   display:contents wrapper carrying its row id + label so the editor can
   outline, name, and select it. display:contents generates no box, so the
   wrapper never disturbs the public layout — and rect math elsewhere must read
   the wrapper's firstElementChild, never the wrapper itself. */
/* Content-carrying types that render near-invisible with empty data; in the
   canvas they get a "click to add" placeholder instead (collection-backed
   types always have something to show, so they're excluded). */
const PLACEHOLDER_TYPES = new Set(['hero', 'rich_text', 'image', 'gallery', 'cta', 'intro_duo']);
const isEmptyData = (data) =>
  !data ||
  !Object.values(data).some((v) =>
    Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : v
  );

export default function SectionRenderer({ section }) {
  const canvas = useContext(CanvasEditingContext);
  if (!section) return null;
  const Comp = SECTION_RENDERERS[section.type];
  if (!Comp) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[SectionRenderer] no renderer for type "${section.type}"`);
    }
    return null;
  }
  let body = <Comp data={section.data || {}} section={section} />;
  if (!canvas) return body;
  if (PLACEHOLDER_TYPES.has(section.type) && isEmptyData(section.data)) {
    body = (
      <div className="tb-empty">
        Empty {(SECTION_LABELS[section.type] || section.type).toLowerCase()}
        <small>Click to add your content — it shows up right here.</small>
      </div>
    );
  }
  return (
    <div
      data-tb-section-id={section.id}
      data-tb-label={SECTION_LABELS[section.type] || section.type}
      data-tb-hidden={section.visible === false ? '' : undefined}
      data-tb-selected={canvas.selectedId === section.id ? '' : undefined}
      style={{ display: 'contents' }}
    >
      {body}
    </div>
  );
}
