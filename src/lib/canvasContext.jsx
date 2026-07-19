import { createContext } from 'react';

/* Non-null ONLY inside the editor canvas iframe, where CanvasApp provides
   { slug, sections, concept, selectedId }. On the public site it stays null,
   so SectionRenderer / SitePage / Home read it as a zero-cost no-op. */
export const CanvasEditingContext = createContext(null);
