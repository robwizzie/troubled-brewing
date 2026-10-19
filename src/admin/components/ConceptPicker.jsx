import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LuCheck, LuChevronLeft, LuChevronRight, LuExternalLink, LuEye, LuMonitor, LuSmartphone, LuX } from 'react-icons/lu';
import { CONCEPTS } from '../../lib/concepts.js';
import { conceptPreviewUrl, conceptThumb } from '../lib/conceptPreview.js';
import { Icon } from './Icon.jsx';

/* The homepage-look picker: Pick → Preview → Publish.

   Every look is a card with a real screenshot of its homepage hero
   (see lib/conceptPreview.js),
   its name and one line about it. The live look says "Live"; the one you've
   chosen is highlighted. "Preview" opens the real homepage in that look, full
   size, at desktop or phone width — before anything is saved. "Use this one"
   only stages the choice; the screen's Publish bar is what puts it live. */

const labelOf = (v) => CONCEPTS.find((c) => c.value === v)?.label || v;

export default function ConceptPicker({ value, live, onChoose, compact = false }) {
  const [previewing, setPreviewing] = useState(null);
  return (
    <>
      <ul className={`conceptgrid ${compact ? 'conceptgrid--compact' : ''}`} aria-label="Homepage looks">
        {CONCEPTS.map((c) => {
          const chosen = c.value === value;
          const isLive = c.value === live;
          return (
            <li key={c.value} className={`conceptcard ${chosen ? 'is-selected' : ''} ${isLive ? 'is-live' : ''}`} data-concept={c.value}>
              <button
                type="button"
                className="conceptcard__thumb"
                onClick={() => setPreviewing(c.value)}
                aria-label={`Open a full preview of ${c.label}`}
              >
                <img src={conceptThumb(c.value)} alt="" width="640" height="400" loading="lazy" decoding="async" />
                <span className="conceptcard__badges">
                  {isLive && <span className="statuschip statuschip--live"><Icon icon={LuCheck} size={13} />Live</span>}
                  {chosen && !isLive && <span className="statuschip statuschip--unpublished">Chosen — not live yet</span>}
                </span>
              </button>
              <div className="conceptcard__body">
                <h3 className="conceptcard__name">{c.label}</h3>
                <p className="conceptcard__desc">{c.short || c.desc}</p>
                <div className="conceptcard__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreviewing(c.value)} aria-label={`Preview ${c.label}`}>
                    <Icon icon={LuEye} size={16} />
                    Preview
                  </button>
                  {chosen ? (
                    <span className="conceptcard__chosen" aria-label={`${c.label} is chosen`}>
                      <Icon icon={LuCheck} size={16} />
                      {isLive ? 'In use' : 'Chosen'}
                    </span>
                  ) : (
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChoose(c.value)} aria-label={`Use ${c.label}`}>
                      Use this one
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {previewing && (
        <ConceptPreview
          value={previewing}
          chosen={value}
          live={live}
          onMove={setPreviewing}
          onChoose={(v) => { onChoose(v); setPreviewing(null); }}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  );
}

const WIDTHS = { desktop: 1280, phone: 390 };

/** Full-screen live preview of the homepage in one look, before saving. */
export function ConceptPreview({ value, chosen, live, onChoose, onClose, onMove }) {
  const [device, setDevice] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 700 ? 'phone' : 'desktop'));
  const stageRef = useRef(null);
  const closeRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const i = CONCEPTS.findIndex((c) => c.value === value);
  const c = CONCEPTS[i];

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const frameW = WIDTHS[device];
  const pad = device === 'phone' ? 72 : 0; // room for the phone's bezel
  const scale = box.w ? Math.min(1, (box.w - pad) / frameW) : 1;
  const frameH = box.h ? Math.max(480, (box.h - pad) / scale) : 800;
  const step = (d) => onMove(CONCEPTS[(i + d + CONCEPTS.length) % CONCEPTS.length].value);

  return (
    <div className="cpreview" role="dialog" aria-modal="true" aria-label={`Preview: ${c?.label}`}>
      <div className="cpreview__banner" role="status">
        <Icon icon={LuEye} size={16} />
        <span><strong>Preview, not live.</strong> Only you can see this. Nothing changes on the website until you press Publish.</span>
      </div>
      <header className="cpreview__bar">
        <div className="cpreview__nav">
          <button type="button" className="iconbtn" onClick={() => step(-1)} aria-label="Previous look"><Icon icon={LuChevronLeft} /></button>
          <div className="cpreview__title">
            <strong>{c?.label}</strong>
            {value === live ? <span className="statuschip statuschip--live"><Icon icon={LuCheck} size={13} />Live</span> : null}
            <span className="cpreview__count">{i + 1} of {CONCEPTS.length}</span>
          </div>
          <button type="button" className="iconbtn" onClick={() => step(1)} aria-label="Next look"><Icon icon={LuChevronRight} /></button>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Preview width">
          {[['desktop', 'Desktop', LuMonitor], ['phone', 'Phone', LuSmartphone]].map(([k, label, ic]) => (
            <button key={k} type="button" role="radio" aria-checked={device === k} className={device === k ? 'is-on' : ''} onClick={() => setDevice(k)}>
              <Icon icon={ic} size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="cpreview__actions">
          <a className="btn btn--ghost btn--sm cpreview__newtab" href={conceptPreviewUrl(value)} target="_blank" rel="noreferrer">
            <Icon icon={LuExternalLink} size={16} />
            New tab
          </a>
          {value === chosen ? (
            <span className="conceptcard__chosen"><Icon icon={LuCheck} size={16} />{value === live ? 'In use' : 'Chosen'}</span>
          ) : (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onChoose(value)}>
              <Icon icon={LuCheck} size={16} />
              Use this one
            </button>
          )}
          <button ref={closeRef} type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            <Icon icon={LuX} size={16} />
            Close
          </button>
        </div>
      </header>
      <div className={`cpreview__stage is-${device}`} ref={stageRef}>
        <div
          className="cpreview__device"
          style={{ width: frameW * scale, height: frameH * scale }}
        >
          <iframe
            key={`${value}-${device}`}
            title={`Homepage preview: ${labelOf(value)}`}
            src={conceptPreviewUrl(value)}
            style={{ width: frameW, height: frameH, transform: `scale(${scale})` }}
          />
        </div>
      </div>
    </div>
  );
}
