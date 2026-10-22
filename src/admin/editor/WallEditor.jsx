import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  LuArrowDown, LuArrowLeft, LuArrowUp, LuChevronLeft, LuChevronRight, LuMinus, LuPlus, LuRotateCw, LuTrash2, LuZoomIn,
} from 'react-icons/lu';
import { getGalleryPieces } from '../../lib/dataService.js';
import { wallZoomPhoto } from '../../lib/wallPhoto.js';
import {
  WALL_FOCUS, WALL_IMAGE, MAX_TILT, boxCorners, clampBox, clampTilt, ownWallPieces, piecesAt, seedWallPieces, normalizeWallPiece, stageRatioFor,
} from '../../lib/galleryWall.js';
import {
  HANDLES, angleAt, dragBox, moveItem, newBoxAt, newPieceId, nudgeBox, pointInPhoto, pxToPercent, rotateDrag,
} from '../lib/hotspotMath.js';
import ImageField from '../components/ImageField.jsx';
import { ConfirmModal, Hint } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import './wall-editor.css';

/* THE GALLERY WALL, EDITED WHERE IT HANGS.

   The wall photograph with every piece's box drawn on it. Pick a box (tap it,
   or pick the piece from the list) and its details open beside the photo:
   its name, who made it, a link for them, its story, a close-up photo, and
   the box itself — drag it to move, drag a corner or edge to resize, or use
   the arrow keys (Shift for bigger steps, Alt / Option to resize).

   Everything here is part of the page: it updates the Gallery Wall room
   section's data and goes live with the editor's Publish, like any other
   change; Discard puts the wall back. The section only carries its own list
   of pieces once something is changed: the first edit copies the wall as it
   hangs today (built-in frames plus any catalogued piece pinned to one), so
   nothing on it moves or goes missing. */

const ZOOMS = [1, 1.6, 2.4];

function NumberInput({ label, value, onChange, min = 0, max = 100, step = 0.1, className = '' }) {
  const id = useId();
  return (
    <div className={`wed-num ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}

function TextField({ label, value, onChange, hint, multiline = false, rows = 4, placeholder }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {hint && <Hint>{hint}</Hint>}
      </label>
      {multiline ? (
        <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function WallEditor({ section, onChangeData, onClose, initialPiece = null }) {
  const data = useMemo(() => section.data || {}, [section.data]);
  const own = useMemo(() => ownWallPieces(data), [data]);
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    getGalleryPieces().then((r) => alive && setRows(r || []), () => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  /* What's on screen: the owner's list, or the wall as it hangs today. */
  const pieces = useMemo(() => own || seedWallPieces(rows || []), [own, rows]);
  const [selectedId, setSelectedId] = useState(initialPiece);
  const selIndex = pieces.findIndex((p) => p.id === selectedId);
  const selected = selIndex >= 0 ? pieces[selIndex] : null;
  const [zoom, setZoom] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const photoRef = useRef(null);
  const viewRef = useRef(null);
  const drag = useRef(null);
  const ratioFor = useRef(null); // the newly chosen photo whose shape we still need

  const imageOverride = data.image_url || '';
  const imageRatio = imageOverride && Number(data.image_ratio) > 0 ? Number(data.image_ratio) : WALL_IMAGE.w / WALL_IMAGE.h;
  const stageRatio = stageRatioFor(imageRatio);
  const aspect = imageRatio;
  const photo = imageOverride || wallZoomPhoto(false);

  /* Every change writes the WHOLE list, so the first one also copies the
     wall in. Still local to the editor until Publish. */
  const latest = useRef({ data, pieces });
  latest.current = { data, pieces };
  const writeAll = useCallback((nextPieces, extra = {}) => {
    const { data: d } = latest.current;
    onChangeData(section.id, { ...d, ...extra, pieces: nextPieces.map(normalizeWallPiece) });
  }, [onChangeData, section.id]);
  const update = useCallback((id, patch) => {
    const list = latest.current.pieces;
    writeAll(list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, [writeAll]);

  /* ---- picking and dragging ------------------------------------------------
     One pointer handler for the whole photo: it works out which pieces are
     under the pointer (tilt and oval shape included, smallest first), so a
     little frame hung over a big one can always be picked. Pressing on the
     chosen piece drags it; a tap that doesn't move, where pieces overlap,
     steps to the next one under the pointer. Handles start their own drags. */
  function beginDrag(e, piece, handle, el) {
    const rect = photoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const d = {
      id: piece.id, handle, sx: e.clientX, sy: e.clientY, rect, moved: false,
      start: { x: piece.x, y: piece.y, w: piece.w, h: piece.h, r: piece.r || 0 },
    };
    if (handle === 'rotate') {
      d.cx = rect.left + ((piece.x + piece.w / 2) / 100) * rect.width;
      d.cy = rect.top + ((piece.y + piece.h / 2) / 100) * rect.height;
      d.a0 = angleAt(d.cx, d.cy, e.clientX, e.clientY);
    }
    drag.current = d;
    try { el.setPointerCapture(e.pointerId); } catch { /* old browsers: still works while over it */ }
  }

  function onPhotoDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const rect = photoRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(e.clientX)) return;
    const pt = pointInPhoto(e.clientX, e.clientY, rect);
    const hits = piecesAt(pieces, pt.x, pt.y, aspect);
    if (!hits.length) return;
    e.preventDefault();
    const current = hits.find((h) => h.id === selectedId);
    const target = current || hits[0];
    if (!current) setSelectedId(target.id);
    beginDrag(e, target, 'move', e.currentTarget);
    drag.current.hits = hits.map((h) => h.id);
    drag.current.wasSelected = Boolean(current);
  }

  function onHandleDown(e, piece, handle) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(piece.id);
    beginDrag(e, piece, handle, e.currentTarget);
  }

  function onDragMove(e) {
    const d = drag.current;
    if (!d || !Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
    if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 3) return;
    d.moved = true;
    if (d.handle === 'rotate') {
      update(d.id, { r: rotateDrag(d.start.r, d.a0, angleAt(d.cx, d.cy, e.clientX, e.clientY), { shift: e.shiftKey }) });
      return;
    }
    const { dx, dy } = pxToPercent(e.clientX - d.sx, e.clientY - d.sy, d.rect);
    update(d.id, dragBox(d.start, d.handle, dx, dy, undefined, aspect));
  }

  function endDrag() {
    const d = drag.current;
    drag.current = null;
    // a still tap on the chosen piece where several overlap: the next one down
    if (d && !d.moved && d.wasSelected && d.hits && d.hits.length > 1) {
      const i = d.hits.indexOf(d.id);
      setSelectedId(d.hits[(i + 1) % d.hits.length]);
    }
  }

  function onBoxKey(e, piece) {
    if (e.key === 'Escape') { setSelectedId(null); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(piece.id); return; }
    const next = nudgeBox(piece, e.key, { shift: e.shiftKey, alt: e.altKey, aspect });
    if (!next) return;
    e.preventDefault();
    setSelectedId(piece.id);
    update(piece.id, next);
  }

  /* keep the chosen box in sight when zoomed in */
  useEffect(() => {
    if (!selectedId || !viewRef.current) return;
    const safe = window.CSS?.escape ? window.CSS.escape(selectedId) : selectedId;
    const el = viewRef.current.querySelector(`[data-id="${safe}"]`);
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selectedId, zoom]);

  /* ---- the list -------------------------------------------------------- */
  function addPiece() {
    const view = viewRef.current;
    let cx = 50;
    let cy = WALL_FOCUS.y + WALL_FOCUS.h / 2;
    if (view && view.scrollWidth > view.clientWidth) {
      cx = ((view.scrollLeft + view.clientWidth / 2) / view.scrollWidth) * 100;
      cy = WALL_FOCUS.y + ((view.scrollTop + view.clientHeight / 2) / view.scrollHeight) * WALL_FOCUS.h;
    }
    const id = newPieceId(pieces);
    writeAll([...pieces, normalizeWallPiece({ id, title: 'New piece', ...newBoxAt(cx, cy) })]);
    setSelectedId(id);
  }
  function removeSelected() {
    setConfirmRemove(false);
    if (!selected) return;
    writeAll(pieces.filter((p) => p.id !== selected.id));
    setSelectedId(null);
  }
  function move(index, dir) {
    const next = moveItem(pieces, index, dir);
    if (next !== pieces) writeAll(next);
  }

  /* ---- the wall photo -------------------------------------------------- */
  function onPhotoLoad(e) {
    const img = e.currentTarget;
    if (!ratioFor.current || ratioFor.current !== imageOverride || !img.naturalWidth) return;
    ratioFor.current = null;
    const r = Math.round((img.naturalWidth / img.naturalHeight) * 10000) / 10000;
    if (Math.abs(r - (Number(data.image_ratio) || 0)) > 0.0001) writeAll(pieces, { image_ratio: r });
  }
  function setWallPhoto(url) {
    if (url) {
      ratioFor.current = url;
      writeAll(pieces, { image_url: url });
    } else {
      ratioFor.current = null;
      const { image_ratio: _r, ...rest } = latest.current.data;
      onChangeData(section.id, { ...rest, image_url: '', pieces: pieces.map(normalizeWallPiece) });
    }
  }

  const scale = ZOOMS[zoom];
  /* bigger boxes underneath, so a small frame over a big one shows on top */
  const stacked = useMemo(() => [...pieces].sort((a, b) => b.w * b.h - a.w * a.h), [pieces]);
  const photoTop = `${(-WALL_FOCUS.y / WALL_FOCUS.h) * 100}%`;
  const photoHeight = `${(100 / WALL_FOCUS.h) * 100}%`;

  return (
    <div className="wed">
      <section className="wed__stage" aria-label="The wall photo">
        <div className="wed__bar">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            <Icon icon={LuArrowLeft} size={16} />
            Back to the page
          </button>
          <h2 className="wed__title">Gallery Wall</h2>
          <div className="wed__zoom" role="group" aria-label="Zoom">
            <button type="button" className="iconbtn" aria-label="Zoom out" disabled={zoom === 0} onClick={() => setZoom((z) => Math.max(0, z - 1))}><Icon icon={LuMinus} size={16} /></button>
            <span className="wed__zoomlabel" aria-live="polite"><Icon icon={LuZoomIn} size={14} />{Math.round(scale * 100)}%</span>
            <button type="button" className="iconbtn" aria-label="Zoom in" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}><Icon icon={LuPlus} size={16} /></button>
          </div>
        </div>

        <div className="wed__view" ref={viewRef} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <div className="wed__canvas" style={{ width: `calc(min(100cqw, 100cqh * ${stageRatio}) * ${scale})`, aspectRatio: stageRatio }}>
            <div
              className="wed__photo"
              ref={photoRef}
              style={{ top: photoTop, height: photoHeight }}
              onPointerDown={onPhotoDown}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img src={photo} alt="" draggable="false" onLoad={onPhotoLoad} />
              {/* the rest of the wall dims around the chosen piece, as it does
                  on the site when a visitor opens one */}
              {selected && (
                <span
                  className="wed__dim"
                  aria-hidden="true"
                  style={{
                    clipPath: `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${[...boxCorners(selected, aspect), boxCorners(selected, aspect)[0]].map((c) => `${c.x}% ${c.y}%`).join(', ')})`,
                  }}
                />
              )}
              {stacked.map((p) => {
                const isSel = p.id === selectedId;
                return (
                  <div
                    key={p.id}
                    data-id={p.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSel}
                    aria-label={`${p.title || 'Untitled'}: ${isSel ? 'selected. Drag to move, or use the arrow keys' : 'select'}`}
                    className={`wed-box${isSel ? ' is-selected' : ''}${p.shape === 'oval' ? ' wed-box--oval' : ''}`}
                    style={{
                      left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`,
                      transform: p.r ? `rotate(${p.r}deg)` : undefined,
                      zIndex: isSel ? 50 : undefined,
                    }}
                    onKeyDown={(e) => onBoxKey(e, p)}
                    onFocus={() => setSelectedId(p.id)}
                  >
                    {isSel && HANDLES.map((h) => (
                      <span
                        key={h}
                        className={`wed-handle wed-handle--${h}`}
                        aria-hidden="true"
                        onPointerDown={(e) => onHandleDown(e, p, h)}
                      />
                    ))}
                    {isSel && (
                      <span
                        className="wed-rotate"
                        aria-hidden="true"
                        title="Drag to tilt. Shift: 5 degree steps"
                        onPointerDown={(e) => onHandleDown(e, p, 'rotate')}
                      >
                        <Icon icon={LuRotateCw} size={12} />
                      </span>
                    )}
                    <span className={`wed-plate${p.y + p.h > 56 ? ' wed-plate--above' : ''}${p.x + p.w / 2 > 82 ? ' wed-plate--right' : ''}${p.x + p.w / 2 < 14 ? ' wed-plate--left' : ''}`}>{p.title || 'Untitled'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="wed__keys">
          Drag a box to move it, a corner to resize it, or the round handle to tilt it. Keyboard: arrows move, Alt (Option) + arrows resize, [ and ] tilt, Shift for bigger steps.
        </p>
      </section>

      <aside className="wed__side" aria-label={selected ? `Edit ${selected.title || 'piece'}` : 'Pieces on the wall'}>
        {selected ? (
          <div className="wed-fields" key={selected.id}>
            <div className="wed-side__bar">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedId(null)}>
                <Icon icon={LuArrowLeft} size={16} />
                All pieces
              </button>
              <div className="wed-side__step">
                <button type="button" className="iconbtn" aria-label="Previous piece" onClick={() => setSelectedId(pieces[(selIndex - 1 + pieces.length) % pieces.length].id)}><Icon icon={LuChevronLeft} size={16} /></button>
                <span className="wed-side__count">{selIndex + 1} of {pieces.length}</span>
                <button type="button" className="iconbtn" aria-label="Next piece" onClick={() => setSelectedId(pieces[(selIndex + 1) % pieces.length].id)}><Icon icon={LuChevronRight} size={16} /></button>
              </div>
            </div>

            <TextField label="Name on the label" value={selected.title} onChange={(v) => update(selected.id, { title: v })} hint="Shown on the gold plate and as the heading when someone opens this piece." />
            <TextField label="Who made it" value={selected.artist} onChange={(v) => update(selected.id, { artist: v })} placeholder="Artist’s name" />
            <TextField label="Link for the artist" value={selected.artist_url} onChange={(v) => update(selected.id, { artist_url: v })} placeholder="Website or Instagram" hint="Their name becomes a link to it." />
            <TextField label="The story" multiline rows={5} value={selected.story} onChange={(v) => update(selected.id, { story: v })} hint="Where it came from, why it’s on the wall. Blank shows “ask a Troublemaker”." />
            <TextField label="What’s in the frame" multiline rows={3} value={selected.blurb} onChange={(v) => update(selected.id, { blurb: v })} hint="A plain description of the picture, shown above the story." />
            <ImageField label="Close-up photo" value={selected.photo} preset="card" folder="gallery" onChange={(url) => update(selected.id, { photo: url })} />
            <p className="field__hint wed-hint">Blank uses a close-up cut from the wall photo.</p>

            <fieldset className="wed-boxctl">
              <legend>The box on the photo</legend>
              <div className="wed-shape" role="radiogroup" aria-label="Box shape">
                {[['rect', 'Rectangle'], ['oval', 'Oval']].map(([v, l]) => (
                  <label key={v} className={`chip ${selected.shape === v ? 'chip--on' : ''}`}>
                    <input type="radio" name={`shape-${selected.id}`} value={v} checked={selected.shape === v} onChange={() => update(selected.id, { shape: v })} className="sr-only" />
                    {l}
                  </label>
                ))}
              </div>
              <div className="wed-tilt">
                <NumberInput
                  label="Tilt (degrees)"
                  className="wed-num--tilt"
                  value={selected.r || 0}
                  min={-MAX_TILT}
                  max={MAX_TILT}
                  step={0.5}
                  onChange={(n) => update(selected.id, { r: clampTilt(n) })}
                />
                <button type="button" className="btn btn--ghost btn--sm" disabled={!selected.r} onClick={() => update(selected.id, { r: 0 })}>
                  Straighten
                </button>
              </div>
            </fieldset>

            <details className="advanced wed-more">
              <summary>More details</summary>
              <TextField label="What it is" value={selected.medium} onChange={(v) => update(selected.id, { medium: v })} placeholder="e.g. Oil on canvas" />
              <TextField label="When it’s from" value={selected.year_label} onChange={(v) => update(selected.id, { year_label: v })} placeholder="e.g. 1970s" />
              <label className="checkfield">
                <input type="checkbox" checked={selected.for_sale} onChange={(e) => update(selected.id, { for_sale: e.target.checked })} />
                <span>This one is for sale</span>
              </label>
              <label className="checkfield">
                <input type="checkbox" checked={selected.kind === 'object'} onChange={(e) => update(selected.id, { kind: e.target.checked ? 'object' : '' })} />
                <span>It’s a sculpture, not a picture</span>
              </label>
              <p className="wed-more__label">Exact position, in % of the photo</p>
              <div className="wed-nums">
                <NumberInput label="Left" value={selected.x} onChange={(n) => update(selected.id, clampBox({ ...selected, x: n }))} />
                <NumberInput label="Top" value={selected.y} onChange={(n) => update(selected.id, clampBox({ ...selected, y: n }))} />
                <NumberInput label="Width" value={selected.w} onChange={(n) => update(selected.id, clampBox({ ...selected, w: n }))} />
                <NumberInput label="Height" value={selected.h} onChange={(n) => update(selected.id, clampBox({ ...selected, h: n }))} />
              </div>
            </details>

            <div className="wed-side__foot">
              <button type="button" className="btn btn--ghost btn--sm wed-remove" onClick={() => setConfirmRemove(true)}>
                <Icon icon={LuTrash2} size={16} />
                Remove from the wall
              </button>
            </div>
          </div>
        ) : (
          <div className="wed-list">
            <p className="wed-list__intro">
              Tap a box on the photo, or a name below, to edit that piece. Changes show here straight away and go on the
              site when you press <strong>Publish</strong>.
            </p>
            <ol className="wed-list__items" aria-label="Pieces, in the order visitors walk the wall">
              {pieces.map((p, i) => (
                <li key={p.id} className="wed-list__row">
                  <button type="button" className="wed-list__name" onClick={() => setSelectedId(p.id)}>
                    <span className="wed-list__num" aria-hidden="true">{i + 1}</span>
                    <span className="wed-list__text">
                      <strong>{p.title || 'Untitled'}</strong>
                      <span>{p.artist ? `by ${p.artist}` : p.story ? 'Story written' : 'No artist or story yet'}</span>
                    </span>
                  </button>
                  <span className="wed-list__order">
                    <button type="button" className="iconbtn" aria-label={`Move ${p.title || 'piece'} earlier`} disabled={i === 0} onClick={() => move(i, -1)}><Icon icon={LuArrowUp} size={16} /></button>
                    <button type="button" className="iconbtn" aria-label={`Move ${p.title || 'piece'} later`} disabled={i === pieces.length - 1} onClick={() => move(i, 1)}><Icon icon={LuArrowDown} size={16} /></button>
                  </span>
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addPiece}>
              <Icon icon={LuPlus} size={16} />
              Add a piece
            </button>
            <p className="field__hint">The order here is the order Prev and Next walk the wall on the site.</p>

            <div className="wed-photo-field">
              <ImageField label="The wall photo" value={imageOverride} preset="hero" folder="wall" onChange={setWallPhoto} />
              <p className="field__hint">
                Boxes are stored as positions on the photo, so a new shot taken from the same spot keeps them in place.
                From a different angle, drag each box back onto its frame. Remove the photo to go back to ours.
              </p>
            </div>
          </div>
        )}
      </aside>

      <ConfirmModal
        open={confirmRemove}
        title={`Remove “${selected?.title || 'this piece'}” from the wall?`}
        body="Its box and details come off the wall when you press Publish. Discard brings it back until then."
        confirmLabel="Remove"
        onConfirm={removeSelected}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}
