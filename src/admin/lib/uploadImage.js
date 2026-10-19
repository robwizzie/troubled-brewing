import imageCompression from 'browser-image-compression';
import { supabase } from '../../lib/supabase.js';
import { IMAGE_MESSAGES, isHeic, isImageFile, tooBig } from './imageFile.js';

/* Client-side image pipeline (build plan §5.9). Owners upload big phone photos;
   we compress/resize BEFORE upload to protect performance and the 1GB Storage
   cap. Strips EXIF, prefers WebP, enforces a friendly max size. */

const SAFE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export const PRESETS = {
  hero: { maxWidthOrHeight: 2000, maxSizeMB: 0.4 },
  card: { maxWidthOrHeight: 1200, maxSizeMB: 0.28 },
  avatar: { maxWidthOrHeight: 600, maxSizeMB: 0.15 },
  // a phone shot of the shop's chalkboard: big enough to read the chalk
  // full-screen, small enough that a daily photo costs ~300 KB
  chalkboard: { maxWidthOrHeight: 1600, maxSizeMB: 0.45 },
};

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Compress + upload to the public `media` bucket.
 * @returns { url, path, before, after }
 */
export async function uploadImage(file, { preset = 'card', folder = 'uploads' } = {}) {
  if (!file) throw new Error('No file selected.');
  if (!isImageFile(file)) throw new Error(IMAGE_MESSAGES.notImage);
  if (tooBig(file)) throw new Error(IMAGE_MESSAGES.tooBig(file));

  const opts = {
    ...(PRESETS[preset] || PRESETS.card),
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.82,
  };

  const before = file.size;
  let compressed;
  try {
    compressed = await imageCompression(file, opts);
  } catch {
    // The browser couldn't decode it. A JPEG/PNG can still go up as-is (just
    // bigger); anything else — usually an iPhone HEIC on a non-Safari browser —
    // would upload but never show on the site, so say so instead.
    if (!SAFE_TYPES.has(file.type)) throw new Error(isHeic(file) ? IMAGE_MESSAGES.heic : IMAGE_MESSAGES.unreadable);
    compressed = file;
  }

  const type = compressed === file ? file.type : 'image/webp';
  const safeName = (file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const path = `${folder}/${Date.now()}-${safeName}.${EXT[type] || 'webp'}`;

  const { error } = await supabase.storage.from('media').upload(path, compressed, {
    cacheControl: '31536000',
    upsert: false,
    contentType: type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl, path, before, after: compressed.size };
}

export async function listMedia(folder = 'uploads') {
  const { data, error } = await supabase.storage.from('media').list(folder, {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;
  return (data || []).map((f) => {
    const path = `${folder}/${f.name}`;
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    return { name: f.name, path, url: pub.publicUrl, size: f.metadata?.size };
  });
}

export async function deleteMedia(path) {
  const { error } = await supabase.storage.from('media').remove([path]);
  if (error) throw error;
}
