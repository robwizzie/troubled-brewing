import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react';

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
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('pages through every review, 12 at a time (ignoring the old count cap), and keeps the page in the URL', async () => {
    state.profile.reviews = Array.from({ length: 30 }, (_, i) => g(i + 1));
    const { container } = render(<GoogleReviewsFeed data={{ count: 5 }} />);
    await waitFor(() => expect(container.querySelectorAll('.testimonial')).toHaveLength(12));
    expect(screen.getByText(/All 30 reviews from Google/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Showing 1–12 of 30 reviews/);
    const pager = screen.getByRole('navigation', { name: 'Review pages' });
    expect(within(pager).getByRole('button', { name: 'Page 1' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(pager).getByRole('button', { name: 'Page 3' }));
    await waitFor(() => expect(container.querySelectorAll('.testimonial')).toHaveLength(6));
    expect(screen.getByRole('status').textContent).toMatch(/Showing 25–30 of 30/);
    expect(new URLSearchParams(window.location.search).get('page')).toBe('3');
    expect(within(pager).getByRole('button', { name: /Next/ }).disabled).toBe(true);
  });

  it('sorts oldest first and filters to reviews with photos', async () => {
    state.profile.reviews = [
      { ...g(1), published_at: '2026-05-01T00:00:00Z', photos: ['https://x/a.jpg'] },
      { ...g(2), published_at: '2024-01-01T00:00:00Z' },
      { ...g(3), published_at: '2025-01-01T00:00:00Z' },
    ];
    const { container } = render(<GoogleReviewsFeed />);
    await screen.findByText('Reviewer 1');
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'oldest' } });
    const names = () => [...container.querySelectorAll('.testimonial strong')].map((n) => n.textContent);
    expect(names()).toEqual(['Reviewer 2', 'Reviewer 3', 'Reviewer 1']);
    fireEvent.click(screen.getByRole('button', { name: /With photos/ }));
    expect(names()).toEqual(['Reviewer 1']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(names()).toHaveLength(3);
  });

  it('searches the words of every review and highlights the matches', async () => {
    state.profile.reviews = [g(1, { text: 'The matcha latte is unreal.' }), g(2), g(3)];
    const { container } = render(<GoogleReviewsFeed />);
    await screen.findByText('Reviewer 1');
    fireEvent.change(screen.getByLabelText('Search reviews'), { target: { value: 'Matcha' } });
    expect(container.querySelectorAll('.testimonial')).toHaveLength(1);
    expect(container.querySelector('mark').textContent).toBe('matcha');
    fireEvent.change(screen.getByLabelText('Search reviews'), { target: { value: 'nothing-like-this' } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it('shows a testimonial-twin, and says when Google holds more than we cached', async () => {
    state.profile.review_count = 310;
    state.profile.reviews = [g(1), g(2)];
    state.testimonials = [{ id: 1, author: 'Reviewer 1', quote: g(1).text, rating: 5, source: 'Google' }];
    render(<GoogleReviewsFeed />);
    await screen.findByText('Reviewer 1');
    expect(screen.getByText('Reviewer 2')).toBeTruthy();
    expect(screen.getByText(/2 of our 310 Google reviews/)).toBeTruthy();
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

describe('review filters (pure)', async () => {
  const { pageList, availableFilters, selectReviews } = await import('../src/lib/reviewFilters.js');

  it('pageList keeps the ends and a window, with gaps', () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageList(7, 20)).toEqual([1, '…', 6, 7, 8, '…', 20]);
    expect(pageList(3, 20)).toEqual([1, 2, 3, 4, '…', 20]);
  });

  it('offers topic chips only when enough reviews mention them', () => {
    const rows = [
      { quote: 'Great coffee' }, { quote: 'coffee again' }, { quote: 'more coffee' },
      { quote: 'a muffin' }, { quote: 'quiet room' },
    ];
    const ids = availableFilters(rows).map((c) => c.id);
    expect(ids).toContain('coffee');
    expect(ids).not.toContain('food'); // one mention isn't a topic
    expect(selectReviews(rows, { filter: 'coffee' })).toHaveLength(3);
  });

  it('most detailed sorts by length; undated reviews go last when sorting by date', () => {
    const rows = [{ quote: 'a', published_at: null }, { quote: 'abc', published_at: '2025-01-01' }, { quote: 'ab', published_at: '2026-01-01' }];
    expect(selectReviews(rows, { sort: 'detailed' }).map((r) => r.quote)).toEqual(['abc', 'ab', 'a']);
    expect(selectReviews(rows, { sort: 'oldest' }).map((r) => r.quote)).toEqual(['abc', 'ab', 'a']);
    expect(selectReviews(rows, { sort: 'newest' }).map((r) => r.quote)).toEqual(['ab', 'abc', 'a']);
  });
});
