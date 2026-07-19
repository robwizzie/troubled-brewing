import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { MSG, postToCanvas, listen } from '../../lib/canvasBridge.js';
import { publicUrl } from '../../lib/config.js';

/* The editor's viewport onto the real site: an iframe booting the app at
   ?canvas=1 (its own document, so vw units, media queries, scroll and
   position:fixed all resolve against the CANVAS viewport, not the admin's).
   State goes down over postMessage; select/navigate events come back up.
   ref exposes { invalidate(key) } for collection saves (Phase 4+). */
const Canvas = forwardRef(function Canvas(
  { slug, sections, selectedId, concept, viewport, onSelect, onNavigate, onLocked },
  ref
) {
  const iframeRef = useRef(null);
  const readyRef = useRef(false);

  // Latest state/callbacks in refs so the message listener never goes stale.
  const stateRef = useRef(null);
  stateRef.current = { slug, sections, selectedId, concept };
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const onLockedRef = useRef(onLocked);
  onLockedRef.current = onLocked;

  const push = useCallback(() => {
    if (!readyRef.current) return;
    postToCanvas(iframeRef.current, MSG.STATE, stateRef.current);
  }, []);

  useEffect(() => { push(); }, [slug, sections, selectedId, concept, push]);

  useEffect(
    () =>
      listen(
        () => iframeRef.current?.contentWindow,
        (type, payload) => {
          if (type === MSG.READY) {
            readyRef.current = true;
            push();
          } else if (type === MSG.SELECT) {
            // payload: { id, field?, index?, itemLabel? } — element-level precision
            onSelectRef.current?.(payload);
          } else if (type === MSG.NAVIGATE) {
            onNavigateRef.current?.(payload?.slug);
          } else if (type === MSG.LOCKED) {
            onLockedRef.current?.(payload?.message);
          }
        }
      ),
    [push]
  );

  useImperativeHandle(ref, () => ({
    invalidate: (key) => postToCanvas(iframeRef.current, MSG.INVALIDATE, { key }),
  }), []);

  return (
    <div className={`tb-canvas tb-canvas--${viewport}`}>
      <iframe
        ref={iframeRef}
        className="tb-canvas__frame"
        src={`${publicUrl()}?canvas=1`}
        title="Page preview"
        // Keeps keyboard users out of the rendered page's tab order — the
        // panel's section outline is the accessible way to select sections.
        tabIndex={-1}
      />
    </div>
  );
});

export default Canvas;
