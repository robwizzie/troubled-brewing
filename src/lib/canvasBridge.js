/* postMessage protocol between the admin editor (parent window) and the page
   canvas (iframe at `?canvas=1`). Imported by BOTH frames — it must stay
   dependency-free so pulling it into the public bundle costs nothing and never
   drags admin-only code along. */

export const MSG = {
  READY: 'tb:ready', //         canvas → parent: canvas booted, send me state
  STATE: 'tb:state', //         parent → canvas: { slug, sections, selectedId, concept }
  INVALIDATE: 'tb:invalidate', // parent → canvas: { key } — collection data changed, refetch
  SELECT: 'tb:select', //       canvas → parent: { id, field?, index?, itemLabel? }
  NAVIGATE: 'tb:navigate', //   canvas → parent: { slug } — owner clicked an internal link
  LOCKED: 'tb:locked', //       canvas → parent: { message } — owner clicked a developer-managed area
};

export function postToParent(type, payload) {
  window.parent.postMessage({ type, payload }, window.location.origin);
}

export function postToCanvas(iframe, type, payload) {
  iframe?.contentWindow?.postMessage({ type, payload }, window.location.origin);
}

/** Origin- and source-checked receive. `expectedSource` is a function returning
    the only window we accept messages from (lazy so the iframe can attach
    after mount). Returns an unlisten fn. */
export function listen(expectedSource, handler) {
  function onMessage(e) {
    if (e.origin !== window.location.origin) return;
    const source = expectedSource();
    if (!source || e.source !== source) return;
    const { type, payload } = e.data || {};
    if (typeof type === 'string' && type.startsWith('tb:')) handler(type, payload);
  }
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
