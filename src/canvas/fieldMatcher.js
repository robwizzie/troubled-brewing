/* Maps a clicked/hovered DOM element inside a section to the schema FIELD it
   renders — so the editor can open exactly the thing the owner pointed at,
   without per-renderer wiring. Pure functions, no imports.

   Strategies, in confidence order (nearest element outward):
   1. Image match — an <img> src or CSS background-image equals a field value
      (or an item of a frames/images composite → field + index).
   2. Text match — the element's normalized text equals a string field value
      (or a composite item's label/alt → field + index).
   3. BEM class match — `ceh__title` → field `ceh_title` (the concept heroes'
      namespaced keys literally mirror their class names) or `title`.
   4. Collection-item hint — inside a manager-backed section, the nearest
      li/article/figure is a collection item; extract its label so the panel
      can open THAT record.
   5. Tag heuristics — h1–h3 → the heading-ish field, p/blockquote → the
      body-ish field, img → the first image field. */

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[“”"'‘’]/g, '')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') // strip decorative ✦, dashes, quotes at the edges
    .replace(/\s+/g, ' ')
    .trim();

const urlTail = (u) => String(u || '').split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, '');

function urlMatches(a, b) {
  const ta = urlTail(a);
  const tb = urlTail(b);
  if (!ta || !tb || ta.length < 6 || tb.length < 6) return false;
  return ta === tb || ta.endsWith(tb) || tb.endsWith(ta);
}

function elementImageUrl(el) {
  if (el.tagName === 'IMG') return el.getAttribute('src') || '';
  const bg = el.style?.backgroundImage || (el.ownerDocument.defaultView?.getComputedStyle(el).backgroundImage ?? '');
  const m = /url\(["']?([^"')]+)["']?\)/.exec(bg);
  return m ? m[1] : '';
}

const isStringField = (f) => !['image', 'images', 'frames', 'funfacts', 'checkbox', 'select', 'number', 'price', 'date'].includes(f.type || 'text');

/** Match ONE element against the fields/data. Returns { field, index } or null. */
function matchElement(el, fields, data) {
  // 1) image
  const url = elementImageUrl(el);
  if (url) {
    for (const f of fields) {
      const v = data[f.name];
      if (f.type === 'image' && typeof v === 'string' && urlMatches(url, v)) return { field: f.name };
      if (f.type === 'frames' && Array.isArray(v)) {
        const i = v.findIndex((fr) => urlMatches(url, fr?.image_url));
        if (i !== -1) return { field: f.name, index: i };
      }
      if (f.type === 'images' && Array.isArray(v)) {
        const i = v.findIndex((im) => urlMatches(url, im?.url));
        if (i !== -1) return { field: f.name, index: i };
      }
    }
  }
  // 2) text (skip huge containers — value fields render in small elements)
  const text = el.textContent || '';
  if (text && text.length <= 400) {
    const t = norm(text);
    if (t.length >= 3) {
      for (const f of fields) {
        const v = data[f.name];
        if (isStringField(f) && typeof v === 'string' && norm(v) === t) return { field: f.name };
        if (f.type === 'tags' && Array.isArray(v) && v.some((x) => norm(x) === t)) return { field: f.name };
        if (f.type === 'frames' && Array.isArray(v)) {
          const i = v.findIndex((fr) => norm(fr?.label) === t && t);
          if (i !== -1) return { field: f.name, index: i };
        }
        if (f.type === 'images' && Array.isArray(v)) {
          const i = v.findIndex((im) => norm(im?.alt) === t && t);
          if (i !== -1) return { field: f.name, index: i };
        }
      }
    }
  }
  // 3) BEM class → field name (ceh__title → ceh_title; gw-hero__eyebrow → eyebrow)
  for (const cls of el.classList || []) {
    const m = /^([a-z0-9-]+)__([a-z0-9-]+)$/.exec(cls);
    if (!m) continue;
    const elem = m[2].replace(/-/g, '_');
    const candidates = [`${m[1].replace(/-/g, '_')}_${elem}`, elem];
    for (const name of candidates) {
      const f = fields.find((x) => x.name === name);
      if (f) return { field: f.name };
    }
    // Prefix-abbreviated namespaces (ig-hero__eyebrow ↔ igh_eyebrow): accept a
    // suffix match when it's unambiguous.
    const suffixHits = fields.filter((x) => x.name.endsWith(`_${elem}`));
    if (suffixHits.length === 1) return { field: suffixHits[0].name };
  }
  return null;
}

/** Walk from `target` up to (and including) `sectionEl`, nearest first. */
function chain(target, sectionEl) {
  const out = [];
  let el = target instanceof Element ? target : target?.parentElement;
  while (el && el !== sectionEl.parentElement) {
    out.push(el);
    if (el === sectionEl) break;
    el = el.parentElement;
  }
  return out;
}

const ITEM_LABEL_SELECTOR = '.menu-item__name, h3, h4, cite, strong, b, figcaption, .gw-frame__plaque';

/** For manager-backed sections: the nearest repeating item + its display label. */
export function collectionItemFrom(target, sectionEl) {
  const item = (target instanceof Element ? target : target?.parentElement)?.closest('li, article, figure');
  if (!item || item === sectionEl || !sectionEl.contains(item)) return null;
  const labelEl = item.matches(ITEM_LABEL_SELECTOR) ? item : item.querySelector(ITEM_LABEL_SELECTOR);
  const label = (labelEl?.textContent || '').replace(/\s+/g, ' ').trim();
  return label ? { el: item, label } : null;
}

const HEADING_RE = /heading|title|word|name/;
const BODY_RE = /sub|lead|body|desc|blurb|quote|story|sig|label|brand|eyebrow/;

/** Main entry: what field does this element render?
    Returns { field, index, el } | { itemLabel, el } | null. */
export function matchField({ target, sectionEl, fields, data, hasManager }) {
  const els = chain(target, sectionEl);
  // value + BEM matches, nearest element wins
  for (const el of els) {
    const hit = matchElement(el, fields, data || {});
    if (hit) return { ...hit, el };
  }
  // collection item?
  if (hasManager) {
    const item = collectionItemFrom(target, sectionEl);
    if (item) return { itemLabel: item.label, el: item.el };
  }
  // tag heuristics on the nearest few elements
  for (const el of els.slice(0, 4)) {
    const tag = el.tagName;
    if (/^H[1-3]$/.test(tag)) {
      const f = fields.find((x) => isStringField(x) && HEADING_RE.test(x.name));
      if (f) return { field: f.name, el };
    }
    if (tag === 'P' || tag === 'BLOCKQUOTE') {
      const f = fields.find((x) => isStringField(x) && BODY_RE.test(x.name) && !HEADING_RE.test(x.name));
      if (f) return { field: f.name, el };
    }
    if (tag === 'IMG') {
      const f = fields.find((x) => x.type === 'image');
      if (f) return { field: f.name, el };
    }
  }
  return null;
}

/** Re-locate the element rendering `field` (+index) after a re-render —
    smallest matching element wins so we ring the text, not the section. */
export function locateFieldElement(sectionEl, fields, data, field, index) {
  let best = null;
  let bestArea = Infinity;
  for (const el of sectionEl.querySelectorAll('*')) {
    const hit = matchElement(el, fields, data || {});
    if (!hit || hit.field !== field || (hit.index ?? null) !== (index ?? null)) continue;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > 0 && area < bestArea) {
      best = el;
      bestArea = area;
    }
  }
  return best;
}
