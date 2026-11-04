import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useCutout } from '../src/lib/chalkboard.js';

/* useCutout on a row with no recorded `cutout`: it loads the photo and reads
   its corners. The answer it gets must stick — the safety timer that stops a
   slow check from holding the board back must not overwrite it later (it did:
   the cut-out board went back into its frame ~6 s after the page loaded). */

function Probe({ block }) {
  const cutout = useCutout(block);
  return <div data-cutout={String(cutout)} />;
}

const realImage = window.Image;
const realGetContext = HTMLCanvasElement.prototype.getContext;
afterEach(() => {
  cleanup();
  window.Image = realImage;
  HTMLCanvasElement.prototype.getContext = realGetContext;
  vi.useRealTimers();
});

// a photo that loads at once; its pixels read as `alpha` everywhere
function fakePhoto(alpha) {
  window.Image = class { set src(_) { setTimeout(() => this.onload?.(), 10); } };
  HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 3 ? alpha : 0)) }),
  });
}

describe('useCutout', () => {
  it('a cut-out stays a cut-out after the safety timer runs out', () => {
    vi.useFakeTimers();
    fakePhoto(0); // transparent corners: a cut-out
    const { container } = render(<Probe block={{ url: 'https://cdn.test/board.webp' }} />);
    expect(container.firstChild.dataset.cutout).toBe('null'); // checking
    act(() => { vi.advanceTimersByTime(50); });
    expect(container.firstChild.dataset.cutout).toBe('true');
    act(() => { vi.advanceTimersByTime(7000); }); // past the 6 s give-up
    expect(container.firstChild.dataset.cutout).toBe('true');
  });

  it('an ordinary photo reads as not a cut-out', () => {
    vi.useFakeTimers();
    fakePhoto(255);
    const { container } = render(<Probe block={{ url: 'https://cdn.test/photo.webp' }} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(container.firstChild.dataset.cutout).toBe('false');
  });

  it('gives up (not a cut-out) when the photo never answers', () => {
    vi.useFakeTimers();
    window.Image = class { set src(_) {} }; // never loads, never errors
    const { container } = render(<Probe block={{ url: 'https://cdn.test/slow.webp' }} />);
    act(() => { vi.advanceTimersByTime(6100); });
    expect(container.firstChild.dataset.cutout).toBe('false');
  });

  it('a recorded flag wins without loading anything', () => {
    window.Image = class { set src(_) { throw new Error('should not load'); } };
    const { container } = render(<Probe block={{ url: 'https://cdn.test/board.webp', cutout: true }} />);
    expect(container.firstChild.dataset.cutout).toBe('true');
  });
});
