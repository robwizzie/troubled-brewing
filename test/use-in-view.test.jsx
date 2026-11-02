import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useRef } from 'react';
import useInView from '../src/lib/useInView.js';

/* useInView with a controllable IntersectionObserver: the setup file's stub
   reports everything as fully in view, which can't catch the tall-element
   case — a team board ~8,000px tall on an 844px phone never shows 10% of
   itself at once, so a plain ratio check left its cards hidden forever. */

let observers = [];
class FakeIO {
  constructor(cb, opts) { this.cb = cb; this.opts = opts; observers.push(this); }
  observe() {}
  disconnect() { this.done = true; }
  fire(entry) { if (!this.done) this.cb([{ isIntersecting: true, rootBounds: { height: 844 }, ...entry }], this); }
}

function Probe({ threshold }) {
  const ref = useRef(null);
  const shown = useInView(ref, { threshold });
  return <div ref={ref} data-shown={String(shown)} />;
}

const real = window.IntersectionObserver;
afterEach(() => { cleanup(); window.IntersectionObserver = real; observers = []; });

describe('useInView', () => {
  it('shows a very tall element once it fills a good part of the screen, though it never reaches its ratio', () => {
    window.IntersectionObserver = FakeIO;
    const { container } = render(<Probe threshold={0.1} />);
    const io = observers[0];
    // asks for callbacks in small steps up to its threshold, so a slow scroll keeps reporting
    expect(io.opts.threshold.length).toBeGreaterThan(2);
    act(() => io.fire({ intersectionRatio: 0.01, intersectionRect: { height: 80 } })); // just peeking in
    expect(container.firstChild.dataset.shown).toBe('false');
    act(() => io.fire({ intersectionRatio: 0.098, intersectionRect: { height: 776 } })); // the whole screen, still < 10%
    expect(container.firstChild.dataset.shown).toBe('true');
  });

  it('a small element still waits for its ratio', () => {
    window.IntersectionObserver = FakeIO;
    const { container } = render(<Probe threshold={0.15} />);
    act(() => observers[0].fire({ intersectionRatio: 0.05, intersectionRect: { height: 20 } }));
    expect(container.firstChild.dataset.shown).toBe('false');
    act(() => observers[0].fire({ intersectionRatio: 0.2, intersectionRect: { height: 80 } }));
    expect(container.firstChild.dataset.shown).toBe('true');
  });
});
