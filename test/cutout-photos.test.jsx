import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProductCard from '../src/components/ProductCard.jsx';
import { isCutout } from '../src/lib/productImage.js';

describe('cutout menu photos', () => {
  it('recognises a cutout by its file name, wherever Menu Manager stored it', () => {
    expect(isCutout('https://x.supabase.co/storage/v1/object/public/media/uploads/1729-iced-latte-cutout.webp')).toBe(true);
    expect(isCutout('/images/drinks/cutout/latte.png')).toBe(true);
    expect(isCutout('https://x/media/latte-cutout.webp?v=2')).toBe(true);
    expect(isCutout('https://x/media/latte.jpg')).toBe(false);
    expect(isCutout('https://x/media/shortcutouts.jpg')).toBe(false);
    expect(isCutout(null)).toBe(false);
  });

  it('stages a cutout whole in a full-bleed frame, and leaves ordinary photos as they were', () => {
    const { container: cut } = render(
      <ProductCard item={{ id: 'a', name: 'Iced Latte', price: 4.5, image_url: 'https://x/media/1-iced-latte-cutout.webp' }} index={3} plate={false} />
    );
    const card = cut.querySelector('.product');
    expect(card.classList.contains('product--cutout')).toBe(true);
    expect(cut.querySelector('img').classList.contains('product__cutout')).toBe(true);
    // index 3 would be the matted "gold-botanical" style for a photo — never for a cutout
    expect(cut.querySelector('.product__frame').className).not.toMatch(/gold-botanical|black-mat/);

    const { container: photo } = render(
      <ProductCard item={{ id: 'b', name: 'Latte', price: 4, image_url: 'https://x/media/latte.jpg' }} index={3} plate={false} />
    );
    expect(photo.querySelector('.product').classList.contains('product--cutout')).toBe(false);
    expect(photo.querySelector('img').classList.contains('product__cutout')).toBe(false);
    expect(photo.querySelector('.product__frame').className).toMatch(/gold-botanical/);
  });
});
