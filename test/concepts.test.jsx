import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { CONCEPTS, CONCEPT_TO_TYPE } from '../src/lib/concepts.js';
import { SECTION_RENDERERS } from '../src/components/sections/registry.js';
import { isStarterRow, realRows } from '../src/lib/starterRows.js';

/* Every homepage look is previewable with /?concept=…, so every one of them
   has to mount on the seed data — and the preview carries the switcher bar
   that links to all of them. */

afterEach(cleanup);

describe('homepage concepts', () => {
  it('every concept in the picker has a renderer', () => {
    CONCEPTS.forEach((c) => expect(SECTION_RENDERERS[CONCEPT_TO_TYPE[c.value]]).toBeTruthy());
  });

  it.each(CONCEPTS.map((c) => c.value))('/?concept=%s renders with the switcher', async (concept) => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/?concept=${concept}`]}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
    expect(container.textContent).not.toMatch(/Something went sideways/i);
    const bar = screen.getByRole('navigation', { name: /compare homepage looks/i });
    expect(bar.querySelectorAll('a')).toHaveLength(CONCEPTS.length);
    expect(bar.querySelector('[aria-current="page"]').getAttribute('href')).toContain(concept);
  });

  it('/?previewConcept= (the admin\'s Preview) shows that look with a "not live" banner, no switcher, and saves nothing', async () => {
    window.localStorage.removeItem('tb_home_concept');
    const { container } = render(
      <MemoryRouter initialEntries={['/?previewConcept=warm_storefront']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
    expect(screen.getByText(/preview, not live/i).textContent).toMatch(/Warm Storefront/);
    expect(screen.queryByRole('navigation', { name: /compare homepage looks/i })).toBeNull();
    expect(container.querySelector('.wsh')).toBeTruthy(); // the Warm Storefront hero
    expect(window.localStorage.getItem('tb_home_concept')).toBeNull();
  });

  it('an unknown ?previewConcept= is ignored', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/?previewConcept=<script>']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
    expect(screen.queryByText(/preview, not live/i)).toBeNull();
  });

  it('ordinary visitors never see the switcher', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
    expect(screen.queryByRole('navigation', { name: /compare homepage looks/i })).toBeNull();
  });
});

describe('starter rows', () => {
  it('drops the placeholder rows the live database still carries', () => {
    expect(isStarterRow('local_businesses', { name: "Anthony's", blurb: 'A neighborhood favorite. (Owner: confirm details + add a link.)' })).toBe(true);
    expect(isStarterRow('team_members', { name: 'A Troublemaker', bio: 'Pulls shots' })).toBe(true);
    expect(isStarterRow('timeline_events', { title: 'Our first anniversary', sort_date: '2022-01-01' })).toBe(true);
    expect(isStarterRow('gallery_pieces', { title: 'Tiny Oval Mystery', story: 'A flea-market find from a rainy Saturday.' })).toBe(true);
  });

  it('keeps anything an owner has made their own', () => {
    expect(isStarterRow('local_businesses', { name: "Anthony's", blurb: 'Get the vodka rigatoni.' })).toBe(false);
    expect(isStarterRow('team_members', { name: 'Katie', bio: 'Keeps the whole operation running.' })).toBe(false);
    // same title, real date: the owner fixed it
    expect(isStarterRow('timeline_events', { title: 'Our first anniversary', sort_date: '2018-10-13' })).toBe(false);
  });

  it('falls back to the bundled content when only starter rows are left', () => {
    const fallback = [{ name: 'real' }];
    expect(realRows('local_businesses', [{ name: 'x', blurb: '(Owner: confirm)' }], fallback)).toBe(fallback);
    const kept = [{ name: 'Lula', blurb: 'Empanadas.' }];
    expect(realRows('local_businesses', kept, fallback)).toEqual(kept);
  });
});

describe('the "Set homepage look" workflow', () => {
  it('offers every concept the site can render', async () => {
    const fs = await import('node:fs');
    const yml = fs.readFileSync('.github/workflows/set-homepage-concept.yml', 'utf8');
    const script = fs.readFileSync('scripts/set-homepage-concept.mjs', 'utf8');
    CONCEPTS.forEach((c) => {
      expect(yml).toContain(`- ${c.value}`);
      expect(script).toContain(`'${c.value}'`);
    });
  });
});
