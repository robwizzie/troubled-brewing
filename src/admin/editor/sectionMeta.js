import { MENU_COLLECTION } from '../managers/MenuManager.jsx';
import { EVENTS_COLLECTION } from '../managers/EventsManager.jsx';
import { TESTIMONIALS_COLLECTION } from '../managers/TestimonialsManager.jsx';
import { GALLERY_COLLECTION } from '../managers/GalleryManager.jsx';
import { TROUBLEMAKERS_COLLECTION } from '../managers/TroublemakersManager.jsx';
import { LOCAL_BUSINESS_COLLECTION } from '../managers/LocalBusinessManager.jsx';
import { TIMELINE_COLLECTION } from '../managers/TimelineManager.jsx';
import { schemaFor } from '../editors/schemas.js';

/* Structural routing from a section's schema `manager` key to the collection
   it manages — how the on-page editor lets the owner reach "the menu items"
   from the menu block they're looking at, instead of a sidebar scavenger hunt.
   The collection's `table` doubles as the dataVersion invalidation key the
   canvas sections already subscribe to. */
export const MANAGER_CONFIGS = {
  menu: MENU_COLLECTION,
  events: EVENTS_COLLECTION,
  testimonials: TESTIMONIALS_COLLECTION,
  gallery: GALLERY_COLLECTION,
  troublemakers: TROUBLEMAKERS_COLLECTION,
  neighborhood: LOCAL_BUSINESS_COLLECTION,
  timeline: TIMELINE_COLLECTION,
};

/** The embeddable collection behind a section type, or null. */
export function managerFor(type) {
  const key = schemaFor(type).manager;
  return (key && MANAGER_CONFIGS[key]) || null;
}
