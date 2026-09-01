import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';

/* Smoke tests for every public route.

   The point isn't coverage of behaviour — it's that this site's data layer is
   almost entirely fallback-and-recover: every read in dataService.js catches
   and returns seed content, so a section that throws on the seed shape fails
   silently in review and loudly in production. These tests run with no
   Supabase env at all, which is exactly the seed path, and assert each route
   mounts, renders its chrome, and puts something on the page.

   A render error would otherwise be swallowed by <ErrorBoundary>, so the
   boundary's fallback copy is asserted against too — a route that crashes
   fails here instead of quietly shipping an apology screen. */

const ROUTES = [
  '/', '/menu', '/about', '/events', '/location', '/contact', '/community',
  '/timeline', '/reviews', '/gallery-wall', '/troublemakers', '/neighborhood',
  '/privacy', '/accessibility',
];

function renderRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('public routes', () => {
  it.each(ROUTES)('%s renders without crashing', async (path) => {
    const { container } = renderRoute(path);

    // the shell is present: nav landmark + the main region pages render into
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeTruthy();
    const main = container.querySelector('main#main');
    expect(main).toBeTruthy();

    // sections resolve asynchronously off the seed fallback
    await waitFor(() => expect(main.textContent.trim().length).toBeGreaterThan(0));

    // ErrorBoundary's fallback means something below it threw
    expect(container.textContent).not.toMatch(/Something went sideways/i);
  });

  it('tags <main> with the page slug so CSS can scope to one page', async () => {
    const { container } = renderRoute('/');
    expect(container.querySelector('main#main').className).toContain('page-home');
    cleanup();

    const location = renderRoute('/location');
    expect(location.container.querySelector('main#main').className).toContain('page-location');
  });

  it('serves the 404 page for an unknown path', async () => {
    renderRoute('/no-such-page');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeTruthy());
  });
});
