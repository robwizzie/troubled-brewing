import { SECTION_RENDERERS } from './sections/registry.js';

/* Renders one section by looking up its type in the registry. Unknown types
   render nothing (forward-compatible) rather than crashing the page. */
export default function SectionRenderer({ section }) {
  if (!section) return null;
  const Comp = SECTION_RENDERERS[section.type];
  if (!Comp) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[SectionRenderer] no renderer for type "${section.type}"`);
    }
    return null;
  }
  return <Comp data={section.data || {}} section={section} />;
}
