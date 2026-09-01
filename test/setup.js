/* jsdom implements neither of the two browser APIs this site's presentation
   layer reaches for. Both are feature-detected in app code, but the immersive
   hero calls matchMedia directly, so stub them here rather than weakening the
   component.

   matchMedia reports prefers-reduced-motion, which makes every entrance
   animation take its skip path: the tests then assert on rendered content
   rather than racing GSAP's lazy chunk. */
window.matchMedia = (query) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

/* jsdom has no layout, so scrollTo is unimplemented and <ScrollToTop> logs a
   stack on every route change. Stub it to keep real failures visible in the
   output. */
window.scrollTo = () => {};

/* Reveal falls back to "just show it" when IntersectionObserver is missing, but
   stubbing it as immediately-intersecting keeps the tested DOM identical to
   what a visitor scrolls to. */
class IntersectionObserverStub {
  constructor(callback) { this.callback = callback; }
  observe(el) { this.callback([{ isIntersecting: true, target: el }], this); }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
window.IntersectionObserver = IntersectionObserverStub;
global.IntersectionObserver = IntersectionObserverStub;
