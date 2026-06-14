import imageCompression from 'browser-image-compression';
import { supabase } from '../../lib/supabase.js';

/* Client-side image pipeline (build plan §5.9). Owners upload big phone photos;
   we compress/resize BEFORE upload to protect performance and the 1GB Storage
   cap. Strips EXIF, prefers WebP, enforces a friendly max size. */

const MAX_INPUT_MB = 15;

export const PRESETS = {
  hero: { maxWidthOrHeight: 2000, maxSizeMB: 0.4 },
  card: { maxWidthOrHeight: 1200, maxSizeMB: 0.28 },
  avatar: { maxWidthOrHeight: 600, maxSizeMB: 0.15 },
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
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`That image is large (${formatBytes(file.size)}). Please pick one under ${MAX_INPUT_MB} MB.`);
  }

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
    compressed = file; // fall back to original if compression fails
  }

  const safeName = (file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const path = `${folder}/${Date.now()}-${safeName}.webp`;

  const { error } = await supabase.storage.from('media').upload(path, compressed, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/webp',
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
