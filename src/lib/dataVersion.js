import { useSyncExternalStore } from 'react';

/* Tiny opt-in invalidation registry for collection-backed sections.
   The public site never bumps anything, so this is a strict no-op there; the
   admin editor bumps a key after a save and any mounted section subscribed to
   that key refetches in place — keeping its local UI state (filters, carousel
   position) instead of remounting. */

const versions = new Map();
const listeners = new Set();

/** Signal that data behind `key` (e.g. 'menu_items') changed. */
export function bump(key) {
  versions.set(key, (versions.get(key) || 0) + 1);
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current version for `key`; include it in a fetch effect's deps to refetch on bump. */
export function useDataVersion(key) {
  return useSyncExternalStore(subscribe, () => versions.get(key) || 0);
}
