import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';

/* The wish, beyond the fox's card: the /wish page, the Menu page's "Don't
   see your favorite?", the 404's hat, the footer link and the "Wish list"
   CMS section — all the one shared flow (src/components/FoxWish.jsx), with
   the same one-wish-a-day limit. And the fox's card while the wish is open:
   it owns the card, with one way back. Runs on the seed path (no Supabase). */

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn(), useAnalytics: () => {} }));
const App = (await import('../src/App.jsx')).default;
const FoxGuide = (await import('../src/components/FoxGuide.jsx')).default;
const { SECTION_RENDERERS, SECTION_LABELS, ADDABLE_SECTION_TYPES } = await import('../src/components/sections/registry.js');
const { SECTION_EDITOR_SCHEMAS } = await import('../src/admin/editors/schemas.js');
const { routeForPath } = await import('../src/lib/seo.js');
const { markWished } = await import('../src/lib/wishes.js');

const at = (path, el = <App />) => render(<MemoryRouter initialEntries={[path]}>{el}</MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
});
afterEach(() => { cleanup(); window.history.pushState({}, '', '/'); });

describe('/wish', () => {
  it('is a page of its own with the shared form, and in the SEO routes', async () => {
    at('/wish');
    expect(await screen.findByRole('heading', { level: 1, name: 'Make a wish for the menu' })).toBeTruthy();
    const flow = screen.getByTestId('fox-wish');
    expect(flow.dataset.stage).toBe('form');
    expect(within(flow).getByLabelText('Your wish')).toBeTruthy();
    expect(within(flow).getByRole('button', { name: 'Drop it in the hat' })).toBeTruthy();
    // the page doesn't grab focus (no keyboard popping up on a phone)
    expect(document.activeElement).not.toBe(within(flow).getByLabelText('Your wish'));
    const r = routeForPath('/wish');
    expect(r).toMatchObject({ path: '/wish', slug: 'wish' });
    expect(r.title).toMatch(/Trouble Brewing/);
  });

  it('shares the one-wish-a-day limit with every other place', async () => {
    markWished();
    at('/wish');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByTestId('fox-wish').dataset.stage).toBe('already');
    expect(screen.getByText('You can wish again tomorrow.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /See today’s menu/ }).getAttribute('href')).toBe('/menu');
  });

  it('?fox=wish still opens the fox’s card straight to the wish, on /wish too', async () => {
    window.history.pushState({}, '', '/wish?fox=wish&src=table');
    at('/wish?fox=wish&src=table');
    const card = await screen.findByRole('dialog');
    expect(within(card).getByTestId('fox-wish').dataset.stage).toBe('form');
  });
});

describe('the Menu page', () => {
  it('ends with "Don’t see your favorite?" and the wish form, right there', async () => {
    at('/menu');
    const h = await screen.findByRole('heading', { name: /Don’t see your favorite/ });
    const block = h.closest('section');
    expect(within(block).getByLabelText('Your wish')).toBeTruthy();
    expect(within(block).getAllByRole('radio')).toHaveLength(4);
  });
});

describe('small hat moments', () => {
  it('the 404 page has the hat and a way to /wish', async () => {
    at('/no-such-page');
    const link = await screen.findByRole('link', { name: 'Make a wish for the menu' });
    expect(link.getAttribute('href')).toBe('/wish');
    expect(link.closest('.wish-nudge').querySelector('.fox-wish__hat--front')).toBeTruthy();
  });

  it('the footer links to /wish', async () => {
    at('/about');
    const nav = await screen.findByRole('navigation', { name: 'Footer navigation' });
    expect(within(nav).getByRole('link', { name: 'Make a Wish' }).getAttribute('href')).toBe('/wish');
  });
});

describe('the fox stays off the wish on phones', () => {
  it('on /wish he steps aside like on Step Inside, and the menu block leaves room under its button', () => {
    const fox = readFileSync('src/styles/fox-guide.css', 'utf8');
    const phone = fox.slice(fox.indexOf('@media (max-width: 600px) {\n  body:has(.sih) .fox-guide'));
    expect(phone).toMatch(/body:has\(\.wish-page\) \.fox-guide \{ right: auto; left: 12px; bottom: auto; top: 86px;/);
    const wish = readFileSync('src/styles/fox-wish.css', 'utf8');
    expect(wish).toMatch(/@media \(max-width: 600px\) \{\s*\.wish-page \{ padding-top: 84px; \}/);
    expect(wish).toMatch(/@media \(max-width: 600px\) \{\s*\.section\.wish-section \{ padding-bottom:/);
  });
});

describe('the "Wish list" CMS section', () => {
  it('is registered, addable from the admin, labelled, and has an editor schema', () => {
    expect(SECTION_RENDERERS.wish_list).toBeTruthy();
    expect(ADDABLE_SECTION_TYPES).toContain('wish_list');
    expect(SECTION_LABELS.wish_list).toMatch(/Wish list/);
    expect(SECTION_EDITOR_SCHEMAS.wish_list.fields.map((f) => f.name)).toEqual(['heading', 'intro']);
  });

  it('renders the shared flow with its defaults, or the owner’s words', () => {
    const S = SECTION_RENDERERS.wish_list;
    const { unmount } = at('/', <S data={{}} />);
    expect(screen.getByRole('heading', { name: 'Make a wish for the menu' })).toBeTruthy();
    expect(screen.getByTestId('fox-wish').dataset.stage).toBe('form');
    unmount();
    at('/', <S data={{ heading: 'What should we bake next?', intro: 'Tell us.' }} />);
    expect(screen.getByRole('heading', { name: 'What should we bake next?' })).toBeTruthy();
    expect(screen.getByText('Tell us.')).toBeTruthy();
  });

  it('on a page with its own Wish list block, the Menu page doesn’t add a second one', async () => {
    const data = await import('../src/lib/dataService.js');
    const real = data.getSections;
    const spy = vi.spyOn(data, 'getSections').mockImplementation(async (slug, o) => (slug === 'menu'
      ? [{ id: 'w', type: 'wish_list', data: { heading: 'Your wish list' } }] : real(slug, o)));
    try {
      at('/menu');
      expect(await screen.findByRole('heading', { name: 'Your wish list' })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: /Don’t see your favorite/ })).toBeNull();
      expect(screen.getAllByTestId('fox-wish')).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('the fox’s card while the wish is open', () => {
  const card = () => screen.getByRole('dialog');

  it('owns the card: its own title, a back button, no tiles, chips or footer', async () => {
    window.history.pushState({}, '', '/?fox=wish');
    at('/?fox=wish', <FoxGuide />);
    expect(within(card()).getByRole('heading', { name: 'Make a wish' })).toBeTruthy();
    expect(card().className).toMatch(/is-wish/);
    expect(card().querySelector('.fox-help__play, .fox-help__chips, .fox-help__foot')).toBeNull();
    expect(within(card()).queryByRole('button', { name: /Hide the fox/ })).toBeNull();
    // the optional fields are folded away until asked for
    expect(within(card()).queryByLabelText(/First name/)).toBeNull();
    fireEvent.click(within(card()).getByRole('button', { name: 'Sign it' }));
    expect(within(card()).getByLabelText(/First name/)).toBeTruthy();
    // one clear way back, and it says where it goes
    fireEvent.click(within(card()).getByRole('button', { name: 'Back to Ask the fox' }));
    expect(within(card()).getByRole('heading', { name: 'Ask the fox' })).toBeTruthy();
    expect(within(card()).queryByTestId('fox-wish')).toBeNull();
    await waitFor(() => expect(card().querySelector('.fox-help__foot')).toBeTruthy());
  });
});
