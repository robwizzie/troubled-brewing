import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { matchField } from '../src/canvas/fieldMatcher.js';
import { GalleryRedirect } from '../src/admin/AdminApp.jsx';

/* Clicking a piece on the Gallery Wall in the page editor's preview opens
   the wall editor on THAT piece; clicking the wall around it still opens the
   section; /admin/gallery?piece=<id> deep-links straight to a piece. */

afterEach(cleanup);

function wallSection() {
  const section = document.createElement('section');
  section.innerHTML = `
    <h2 class="section-heading">The Gallery Wall</h2>
    <div class="gwr__art">
      <img class="gwr__photo" src="/images/wall/gallery-wall.jpg" alt="">
      <button class="gwr__spot" data-tb-piece="lady-in-red" data-tb-piece-label="The Lady in Red">
        <span class="gwr__plate">The Lady in Red</span>
      </button>
    </div>`;
  document.body.appendChild(section);
  return section;
}
const fields = [
  { name: 'heading', label: 'Heading', type: 'text' },
  { name: 'intro', label: 'Line under the heading', type: 'textarea' },
];

describe('click to edit a piece on the wall', () => {
  it('a click on a frame (or its nameplate) names the piece, for the chip and the editor', () => {
    const section = wallSection();
    const plate = section.querySelector('.gwr__plate');
    const m = matchField({ target: plate, sectionEl: section, fields, data: { heading: 'The Gallery Wall' }, hasManager: false });
    expect(m).toMatchObject({ piece: 'lady-in-red', pieceLabel: 'The Lady in Red' });
    expect(m.el).toBe(section.querySelector('.gwr__spot'));
    section.remove();
  });

  it('a click on the wall around the pieces still opens the section', () => {
    const section = wallSection();
    const m = matchField({ target: section.querySelector('h2'), sectionEl: section, fields, data: { heading: 'The Gallery Wall' }, hasManager: false });
    expect(m?.piece).toBeUndefined();
    expect(m?.field).toBe('heading');
    const bg = matchField({ target: section.querySelector('.gwr__art'), sectionEl: section, fields, data: {}, hasManager: false });
    expect(bg?.piece).toBeUndefined();
    section.remove();
  });

  it('/admin/gallery?piece=<id> opens the wall editor on that piece', () => {
    function Where() {
      const l = useLocation();
      return <p data-testid="where">{l.pathname + l.search}</p>;
    }
    render(
      <MemoryRouter initialEntries={['/admin/gallery?piece=pumpkin']}>
        <Routes>
          <Route path="/admin/gallery" element={<GalleryRedirect />} />
          <Route path="/admin/editor/:slug" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('where').textContent).toBe('/admin/editor/gallery-wall?wall=1&piece=pumpkin');
  });

  it('/admin/gallery on its own opens the wall editor', () => {
    function Where() {
      const l = useLocation();
      return <p data-testid="where">{l.pathname + l.search}</p>;
    }
    render(
      <MemoryRouter initialEntries={['/admin/gallery']}>
        <Routes>
          <Route path="/admin/gallery" element={<GalleryRedirect />} />
          <Route path="/admin/editor/:slug" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('where').textContent).toBe('/admin/editor/gallery-wall?wall=1');
  });
});
