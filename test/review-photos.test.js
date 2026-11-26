import { describe, it, expect } from 'vitest';
import { isLastingPhoto } from '../src/lib/reviews.js';

describe('isLastingPhoto', () => {
  it('rejects Google Places photo links, which expire and then 403', () => {
    expect(isLastingPhoto('https://lh3.googleusercontent.com/grass-cs/AABkmLet4s5E7O8G')).toBe(false);
    expect(isLastingPhoto('https://lh3.googleusercontent.com/places/ANXAkqF')).toBe(false);
  });
  it('keeps our own Storage copies and hand-attached photos', () => {
    expect(isLastingPhoto('https://x.supabase.co/storage/v1/object/public/media/google-photos/abc.jpg')).toBe(true);
    expect(isLastingPhoto('https://example.com/a.jpg')).toBe(true);
  });
  it('rejects empty values', () => {
    expect(isLastingPhoto('')).toBe(false);
    expect(isLastingPhoto(null)).toBe(false);
  });
});
