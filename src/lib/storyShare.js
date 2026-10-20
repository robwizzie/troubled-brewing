import { SHOP_HANDLE, storyFileName } from './drinkPersona.js';

/* Getting the drink-personality Story image off the page: the phone's share
   sheet when the browser can share image files (Web Share API Level 2 —
   from there Instagram Stories is one tap), else a plain download. */

/** Can this browser share an image file? */
export function canShareFiles(nav = typeof navigator !== 'undefined' ? navigator : null) {
  try {
    if (!nav?.canShare || !nav?.share || typeof File !== 'function') return false;
    return Boolean(nav.canShare({ files: [new File([new Uint8Array([137, 80, 78, 71])], 'probe.png', { type: 'image/png' })] }));
  } catch {
    return false;
  }
}

/** Save a Blob as a file: an <a download> on a blob: URL. */
export function downloadBlob(blob, name, doc = document) {
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Share the story PNG: the share sheet when the browser can share files,
 * else a download. Resolves to the method used: 'share' | 'download' |
 * 'cancel' (the visitor closed the share sheet).
 */
export async function shareStoryImage(blob, persona, { nav = typeof navigator !== 'undefined' ? navigator : null, doc = document } = {}) {
  const name = storyFileName(persona);
  if (typeof File === 'function' && nav?.share && nav?.canShare) {
    const file = new File([blob], name, { type: 'image/png' });
    let ok = false;
    try { ok = nav.canShare({ files: [file] }); } catch { ok = false; }
    if (ok) {
      try {
        await nav.share({ files: [file], title: persona.title, text: `${persona.title}! ${SHOP_HANDLE}` });
        return 'share';
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancel';
        // not allowed after all (say the tap's activation ran out): save it instead
      }
    }
  }
  downloadBlob(blob, name, doc);
  return 'download';
}

/** Copy text: the async clipboard, else a hidden textarea + execCommand. */
export async function copyText(text, { nav = typeof navigator !== 'undefined' ? navigator : null, doc = document } = {}) {
  try {
    if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const t = doc.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    doc.body.appendChild(t);
    t.select();
    const ok = typeof doc.execCommand === 'function' && doc.execCommand('copy');
    t.remove();
    return Boolean(ok);
  } catch {
    return false;
  }
}
