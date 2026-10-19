import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

/* The data layer is mocked so each test can hand loadReviews exactly the
   cache, testimonials and owner settings it needs. */
const state = { profile: null, testimonials: [], settings: {} };
vi.mock('../src/lib/dataService.js', async (orig) => ({
  ...(await orig()),
  getGoogleProfile: () => Promise.resolve(state.profile),
  getTestimonials: () => Promise.resolve(state.testimonials),
  getContentBlock: () => Promise.resolve(state.settings),
}));

const { loadReviews } = await import('../src/lib/reviews.js');
const { reviewKey } = await import('../src/lib/dataService.js');
const GoogleReviewsFeed = (await import('../src/components/sections/GoogleReviewsFeed.jsx')).default;

const g = (i, extra = {}) => ({
  author: `Reviewer ${i}`,
  text: `Review number ${i} — lovely coffee and a lovely room.`,
  rating: 5,
  published_at: `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}T12:00:00Z`,
  ...extra,
});

beforeEach(() => {
  state.profile = { rating: 4.6, review_count: 0, maps_url: 'https://maps.google.com/?cid=1', reviews: [] };
  state.testimonials = [];
  state.settings = {};
});

describe('loadReviews — the Google feed is the complete list', () => {
  it('keeps a review that was also imported as a testimonial', async () => {
    state.profile.reviews = [g(1), g(2)];
    state.testimonials = [{ id: 1, author: 'Reviewer 1', quote: g(1).text, rating: 5, source: 'Google' }];
    const feed = await loadReviews({ only: 'google' });
    expect(feed.reviews.map((r) => r.author).sort()).toEqual(['Reviewer 1', 'Reviewer 2']);
    // …while the mixed list (homepage) still shows that quote once, as the testimonial
    const mixed = await loadReviews({ only: 'all' });
    expect(mixed.reviews.filter((r) => r.author === 'Reviewer 1')).toHaveLength(1);
    expect(mixed.reviews.find((r) => r.author === 'Reviewer 1').curated).toBe(true);
  });

  it('collapses Google-vs-Google duplicates', async () => {
    state.profile.reviews = [g(1), { ...g(1), review_id: 'dupe' }, g(2)];
    const feed = await loadReviews({ only: 'google' });
    expect(feed.reviews).toHaveLength(2);
  });

  it('still respects the hidden list and the star floor', async () => {
    state.profile.reviews = [g(1), g(2), g(3, { rating: 3 }), g(4, { rating: 4 })];
    state.settings = { min_rating: 4, hidden: { [reviewKey('Reviewer 2', g(2).text)]: true } };
    const feed = await loadReviews({ only: 'google' });
    expect(feed.reviews.map((r) => r.author).sort()).toEqual(['Reviewer 1', 'Reviewer 4']);
  });

  it("order: 'newest' sorts by date even when an older review has a photo", async () => {
    state.profile.reviews = [
      { ...g(1), published_at: '2025-01-01T00:00:00Z', photos: ['https://x/p.jpg'] },
      { ...g(2), published_at: '2026-06-01T00:00:00Z' },
    ];
    const feed = await loadReviews({ only: 'google', order: 'newest' });
    expect(feed.reviews.map((r) => r.author)).toEqual(['Reviewer 2', 'Reviewer 1']);
  });
});

describe('the Reviews page Google feed', () => {
  let savedIO;
  afterEach(() => {
    cleanup();
    if (savedIO) { window.IntersectionObserver = savedIO; global.IntersectionObserver = savedIO; savedIO = null; }
  });

  it('renders all 30 reviews (no IntersectionObserver → render everything), ignoring the old count cap', async () => {
    savedIO = window.IntersectionObserver;
    delete window.IntersectionObserver;
    delete global.IntersectionObserver;
    state.profile.reviews = Array.from({ length: 30 }, (_, i) => g(i + 1));
    const { container } = render(<GoogleReviewsFeed data={{ count: 5 }} />);
    await waitFor(() => expect(container.querySelectorAll('.testimonial')).toHaveLength(30));
    expect(screen.getByText(/All 30 reviews from Google/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it('starts with a batch of at least 12 and offers a "Show all" button when scrolling has not loaded the rest', async () => {
    // an observer that never reports an intersection: the visitor hasn't scrolled
    savedIO = window.IntersectionObserver;
    const Idle = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    window.IntersectionObserver = Idle;
    global.IntersectionObserver = Idle;
    state.profile.reviews = Array.from({ length: 30 }, (_, i) => g(i + 1));
    const { container } = render(<GoogleReviewsFeed data={{ count: 5 }} />);
    await waitFor(() => expect(container.querySelectorAll('.testimonial')).toHaveLength(12));
    fireEvent.click(screen.getByRole('button', { name: 'Show all 30 reviews' }));
    await waitFor(() => expect(container.querySelectorAll('.testimonial')).toHaveLength(30));
  });

  it('shows a testimonial-twin, and says when Google holds more than we cached', async () => {
    state.profile.review_count = 310;
    state.profile.reviews = [g(1), g(2)];
    state.testimonials = [{ id: 1, author: 'Reviewer 1', quote: g(1).text, rating: 5, source: 'Google' }];
    render(<GoogleReviewsFeed />);
    await screen.findByText('Reviewer 1');
    expect(screen.getByText('Reviewer 2')).toBeTruthy();
    expect(screen.getByText(/The latest 2 of our 310 Google reviews/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'read them all on Google' }).getAttribute('href')).toBe('https://maps.google.com/?cid=1');
  });

  it('respects hidden reviews and the star floor', async () => {
    state.profile.reviews = [g(1), g(2), g(3, { rating: 2 })];
    state.settings = { hidden: { [reviewKey('Reviewer 1', g(1).text)]: true } };
    const { container } = render(<GoogleReviewsFeed />);
    await screen.findByText('Reviewer 2');
    expect(container.querySelectorAll('.testimonial')).toHaveLength(1);
    expect(screen.getByText(/1 review from Google/)).toBeTruthy();
  });
});
