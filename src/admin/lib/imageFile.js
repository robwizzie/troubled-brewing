/* Checks on a photo the owner picked, before anything is uploaded — so the
   problems people actually hit (an iPhone HEIC on a laptop, a 30 MB camera
   original, a PDF picked by mistake) are explained in plain words on the spot.

   browser-image-compression decodes through the browser's own <img>/canvas,
   so a HEIC only works where the browser can open HEIC itself (Safari on
   iPhone/iPad/Mac). The iPhone camera button (`capture`) and the iOS photo
   picker hand the page a JPEG anyway; HEIC mostly arrives from a Mac's Photos
   export or AirDrop into Chrome/Edge/Firefox, which can't open it. We detect
   that up front and say exactly what to do instead of uploading a file the
   site can't show. */

export const MAX_INPUT_MB = 15;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;

export function isHeic(file) {
  if (!file) return false;
  return /image\/hei[cf]/i.test(file.type || '') || HEIC_EXT.test(file.name || '');
}

/** Some systems (Windows + HEIC especially) report an empty type; fall back to the extension. */
export function isImageFile(file) {
  if (!file) return false;
  if ((file.type || '').startsWith('image/')) return true;
  return !file.type && IMAGE_EXT.test(file.name || '');
}

export const tooBig = (file) => Boolean(file) && file.size > MAX_INPUT_MB * 1024 * 1024;

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const IMAGE_MESSAGES = {
  notImage: 'That file isn’t a photo. Pick a picture (a JPG or PNG from your camera roll works best).',
  tooBig: (file) =>
    `That photo is too big (${mb(file.size)}). Pick one under ${MAX_INPUT_MB} MB — taking it with the “Take a photo” button on your phone always fits.`,
  heic:
    'This photo is in Apple’s HEIC format, which this browser can’t open. Easiest fix: do this on your iPhone with the “Take a photo” button. Or open the admin in Safari, or set iPhone Settings → Camera → Formats → “Most Compatible” and take it again.',
  unreadable: 'We couldn’t open that photo. Try taking it again, or pick a different one.',
};

/** A plain-words problem with the picked file, or '' when it looks fine. */
export function checkPickedImage(file) {
  if (!file) return IMAGE_MESSAGES.notImage;
  if (!isImageFile(file)) return IMAGE_MESSAGES.notImage;
  if (tooBig(file)) return IMAGE_MESSAGES.tooBig(file);
  return '';
}

/** Resolve true if this browser can draw the image at `url`. Without a real
    image decoder (tests, very old browsers) it gives up waiting and says yes —
    the upload step still refuses anything it can't convert. */
export function canDisplay(url, { timeout = 4000 } = {}) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(true); return; }
    const img = new Image();
    const t = setTimeout(() => resolve(true), timeout);
    img.onload = () => { clearTimeout(t); resolve(true); };
    img.onerror = () => { clearTimeout(t); resolve(false); };
    img.src = url;
  });
}
