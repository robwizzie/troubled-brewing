import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('../src/lib/dataService.js', async (orig) => {
  const real = await orig();
  return { ...real, getEvents: vi.fn(real.getEvents), getTeamMembers: vi.fn(real.getTeamMembers), getTimelineEvents: vi.fn(real.getTimelineEvents) };
});

const ds = await import('../src/lib/dataService.js');
const { photoSources } = await import('../src/lib/pagePhotos.js');
const SIZES = (await import('../src/lib/pagePhotos.data.json')).default;
const { SECTIONS } = await import('../src/lib/seed.js');
const { SECTION_RENDERERS, SECTION_LABELS, ADDABLE_SECTION_TYPES } = await import('../src/components/sections/registry.js');
const { SECTION_EDITOR_SCHEMAS } = await import('../src/admin/editors/schemas.js');
const { shopNow } = await import('../src/lib/hours.js');
const PhotoHero = (await import('../src/components/sections/PhotoHero.jsx')).default;
const PhotoStory = (await import('../src/components/sections/PhotoStory.jsx')).default;
const PullQuote = (await import('../src/components/sections/PullQuote.jsx')).default;
const PhotoMosaic = (await import('../src/components/sections/PhotoMosaic.jsx')).default;
const VisitPanel = (await import('../src/components/sections/VisitPanel.jsx')).default;
const CTA = (await import('../src/components/sections/CTA.jsx')).default;
const RichText = (await import('../src/components/sections/RichText.jsx')).default;
const EventsList = (await import('../src/components/sections/EventsList.jsx')).default;
const TroublemakersGrid = (await import('../src/components/sections/TroublemakersGrid.jsx')).default;
const TimelineGrid = (await import('../src/components/sections/TimelineGrid.jsx')).default;

const BASE = import.meta.env.BASE_URL;
const NEW_TYPES = ['photo_hero', 'photo_story', 'pull_quote', 'photo_mosaic', 'visit_panel'];
const GLOWUP_PAGES = ['about', 'timeline', 'location', 'events', 'troublemakers'];
const ui = (el) => render(<MemoryRouter>{el}</MemoryRouter>);

afterEach(() => cleanup());

/* every image url in a section's data, with the alt text that goes with it */
function imagesIn(data) {
  const out = [];
  for (const [k, v] of Object.entries(data)) {
    if (/(^|_)url$/.test(k) && typeof v === 'string' && v.startsWith('/images/pages/')) {
      const altKey = k === 'image_url' ? 'image_alt' : k === 'inset_url' ? 'inset_alt' : k === 'empty_image_url' ? 'empty_image_alt' : `${k}_alt`;
      out.push({ url: v, alt: data[altKey] });
    }
    if (Array.isArray(v)) v.forEach((i) => i && typeof i === 'object' && i.url && out.push({ url: i.url, alt: i.alt }));
  }
  return out;
}

describe('shop photos', () => {
  it('gives the shipped photos a WebP srcset and passes other urls through', () => {
    const p = photoSources('/images/pages/latte-art.jpg');
    expect(p.src).toBe(`${BASE}images/pages/latte-art.jpg`);
    expect(p.srcSet).toContain(`${BASE}images/pages/latte-art-800.webp 800w`);
    expect(p.ratio).toBeGreaterThan(0);
    expect(photoSources('https://cdn.example/x.jpg')).toEqual({ src: 'https://cdn.example/x.jpg', srcSet: null, ratio: null });
    expect(photoSources('/images/pages/not-a-photo.jpg').srcSet).toBeNull();
    expect(photoSources('')).toBeNull();
  });

  it('every photo the seed uses exists on disk in every listed width, with alt text', () => {
    const used = GLOWUP_PAGES.flatMap((slug) => SECTIONS[slug].flatMap((s) => imagesIn(s.data)));
    expect(used.length).toBeGreaterThan(15);
    for (const { url, alt } of used) {
      const name = url.match(/\/images\/pages\/(.+)\.jpg$/)[1];
      expect(SIZES[name], name).toBeTruthy();
      expect(existsSync(resolve('public', url.slice(1))), url).toBe(true);
      for (const w of SIZES[name].widths) expect(existsSync(resolve('public/images/pages', `${name}-${w}.webp`)), `${name}-${w}`).toBe(true);
      expect(String(alt || '').length, `alt for ${url}`).toBeGreaterThan(15);
    }
  });
});

describe('registration', () => {
  it('registers every new section type with a renderer, a label, the add-list and an editor schema', () => {
    for (const t of NEW_TYPES) {
      expect(SECTION_RENDERERS[t], t).toBeTruthy();
      expect(SECTION_LABELS[t], t).toBeTruthy();
      expect(ADDABLE_SECTION_TYPES, t).toContain(t);
      expect(SECTION_EDITOR_SCHEMAS[t]?.fields?.length, t).toBeGreaterThan(1);
    }
  });

  it('every section the glow-up pages seed has a renderer, and every data key an editor field', () => {
    for (const slug of GLOWUP_PAGES) {
      for (const s of SECTIONS[slug]) {
        expect(SECTION_RENDERERS[s.type], `${slug}:${s.type}`).toBeTruthy();
        const fields = new Set((SECTION_EDITOR_SCHEMAS[s.type]?.fields || []).map((f) => f.name));
        for (const k of Object.keys(s.data)) expect(fields.has(k), `${slug}:${s.type}.${k} is editable`).toBe(true);
      }
    }
  });

  it('keeps the rows the fox reads: a Parking rich_text on Location and a host cta on Events', () => {
    expect(SECTIONS.location.find((s) => s.type === 'rich_text' && /parking/i.test(s.data.heading))).toBeTruthy();
    expect(SECTIONS.events.find((s) => s.type === 'cta' && /contact/.test(s.data.button_url))).toBeTruthy();
  });
});

describe('photo sections render from data', () => {
  it('photo hero: framed and full layouts, and a finished banner with no photo', () => {
    const data = { eyebrow: 'Since 2017', heading: 'Our Story', subheading: 'Sub', image_url: '/images/pages/room-fox-sign.jpg', image_alt: 'The room', caption: 'Inside', cta_label: 'See the Menu', cta_url: '/menu' };
    const { container, unmount } = ui(<PhotoHero data={data} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Our Story' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'The room' })).toBeTruthy();
    expect(container.querySelector('source[type="image/webp"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See the Menu' }).getAttribute('href')).toBe('/menu');
    expect(screen.getByText('Inside')).toBeTruthy();
    unmount();
    const full = ui(<PhotoHero data={{ ...data, layout: 'full' }} />);
    expect(full.container.querySelector('.pg-hero--full')).toBeTruthy();
    full.unmount();
    const bare = ui(<PhotoHero data={{ heading: 'Plain' }} />);
    expect(bare.container.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Plain' })).toBeTruthy();
  });

  it('story chapter: heading, markdown, framed photo, inset and a link', () => {
    ui(<PhotoStory data={{ heading: 'On Station Ave', body_markdown: 'We are at **514**.', image_url: '/images/pages/station-ave-street.jpg', image_alt: 'The street', inset_url: '/images/pages/storefront-door.jpg', inset_alt: 'The door', link_label: 'Walk the block', link_url: '/neighborhood' }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'On Station Ave' })).toBeTruthy();
    expect(screen.getByText('514').tagName).toBe('STRONG');
    expect(screen.getByRole('img', { name: 'The street' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'The door' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Walk the block' }).getAttribute('href')).toBe('/neighborhood');
  });

  it('pull quote: shows a real quote with its source, and nothing without one', () => {
    ui(<PullQuote data={{ quote: 'Their staff are fantastic.', attribution: 'Heather Roth', source: 'Google review' }} />);
    expect(screen.getByText('Their staff are fantastic.')).toBeTruthy();
    expect(screen.getByText('Heather Roth')).toBeTruthy();
    cleanup();
    const { container } = ui(<PullQuote data={{ quote: '  ' }} />);
    expect(container.innerHTML).toBe('');
  });

  it('photo mosaic: brass badges, every photo with its alt and plate; nothing when empty', () => {
    ui(<PhotoMosaic data={{ heading: "What's in the cup", badges: 'La Colombe coffee, Metolius tea', layout: 'strip', images: [{ url: '/images/pages/latte-art.jpg', alt: 'A latte', caption: 'Latte art' }, { url: '', alt: 'skipped' }, { url: '/images/pages/iced-matcha.jpg', alt: 'Matcha' }] }} />);
    expect(screen.getByText('La Colombe coffee')).toBeTruthy();
    expect(screen.getByText('Metolius tea')).toBeTruthy();
    expect(screen.getAllByRole('img').map((i) => i.getAttribute('alt'))).toEqual(['A latte', 'Matcha']);
    expect(screen.getByText('Latte art')).toBeTruthy();
    cleanup();
    const { container } = ui(<PhotoMosaic data={{ images: [] }} />);
    expect(container.innerHTML).toBe('');
  });

  it('cta with a photo becomes the photo panel, keeping the order/tel/page routing', () => {
    ui(<CTA data={{ heading: 'Skip the line', body: 'Order ahead.', button_label: 'Order ahead', button_url: '', secondary_label: 'Call us', secondary_url: 'tel:+18566176638', image_url: '/images/pages/latte-art.jpg', image_alt: 'A latte' }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Skip the line' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Order ahead/ }).getAttribute('href')).toMatch(/spoton/);
    expect(screen.getByRole('link', { name: 'Call us' }).getAttribute('href')).toBe('tel:+18566176638');
    expect(screen.getByRole('img', { name: 'A latte' })).toBeTruthy();
    cleanup();
    const { container } = ui(<CTA data={{ heading: 'Plain', button_label: 'Contact', button_url: '/contact' }} />);
    expect(container.querySelector('.cta-band')).toBeTruthy();
  });

  it('visit panel: map, address, directions and the live hours sign', async () => {
    ui(<VisitPanel data={{ address: '514 Station Ave, Haddon Heights, NJ 08035', phone_label: 'Call', phone_url: 'tel:+18566176638', hours_heading: "When we're open" }} />);
    expect(screen.getByTitle('Map to Trouble Brewing Coffee House')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Get directions' }).getAttribute('href')).toContain('514%20Station%20Ave');
    expect(screen.getByRole('heading', { level: 3, name: "When we're open" })).toBeTruthy();
    expect(await screen.findByText('Monday')).toBeTruthy();
  });

  it('rich text "note" variant: a taped note with its heading and markdown', () => {
    const { container } = ui(<RichText data={{ variant: 'note', heading: 'Parking', body_markdown: 'A **lot behind** us.' }} />);
    expect(container.querySelector('.pg-note')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Parking' })).toBeTruthy();
    expect(screen.getByText('lot behind').tagName).toBe('STRONG');
  });
});

describe('events', () => {
  beforeEach(() => ds.getEvents.mockReset());

  it('empty: a friendly note with a photo and the Instagram nudge', async () => {
    ds.getEvents.mockResolvedValue([]);
    ui(<EventsList data={{ heading: 'Upcoming', empty_heading: 'Nothing yet', empty_image_url: '/images/pages/wall-and-bar.jpg', empty_image_alt: 'The wall', instagram_handle: 'troublebrewingcoffee' }} />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Nothing yet' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'The wall' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Follow @troublebrewingcoffee/ }).getAttribute('href')).toBe('https://instagram.com/troublebrewingcoffee');
  });

  it('upcoming events become posters with a date block; past ones with photos go on the wall', async () => {
    const today = shopNow().isoDate;
    const y = Number(today.slice(0, 4));
    ds.getEvents.mockResolvedValue([
      { id: 'a', title: 'Trivia', event_date: `${y + 1}-03-06`, event_time: '6 PM', description: 'Bring friends.', image_url: '' },
      { id: 'b', title: 'Old raffle', event_date: `${y - 1}-10-13`, image_url: '/images/pages/table-spread.jpg' },
      { id: 'c', title: 'Old no photo', event_date: `${y - 1}-09-01`, image_url: '' },
    ]);
    const { container } = ui(<EventsList data={{ heading: 'Upcoming', show_past: true, past_heading: 'Lately' }} />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Trivia' })).toBeTruthy();
    expect(ds.getEvents).toHaveBeenCalledWith({ upcomingOnly: false });
    const date = container.querySelector('.ev-poster__date');
    expect(date.getAttribute('aria-label')).toMatch(/March 6/);
    expect(within(date).getByText('6')).toBeTruthy();
    expect(screen.getByText('6 PM')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Lately' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Old raffle' })).toBeTruthy();
    expect(screen.queryByText('Old no photo')).toBeNull();
  });

  it('without show_past it only asks for upcoming events', async () => {
    ds.getEvents.mockResolvedValue([]);
    ui(<EventsList data={{}} />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Nothing on the calendar just yet' })).toBeTruthy();
    expect(ds.getEvents).toHaveBeenCalledWith({ upcomingOnly: true });
  });
});

describe('troublemakers', () => {
  it('polaroids: photo, role, drink linked to the menu, real fun facts only; a placeholder without a photo', async () => {
    ds.getTeamMembers.mockResolvedValueOnce([
      { id: '1', name: 'Katie', role: 'General Manager', photo_url: '', bio: 'Runs the place.', fun_facts: { favorite_book: '—' } },
      { id: '2', name: 'Sam', role: 'Barista', drink: 'Iced Matcha Latte', photo_url: '/images/pages/latte-art.jpg', fun_facts: { favorite_movie: 'Paddington', favorite_book: '' } },
      { id: '3', name: 'Alex', drink: 'Something off-menu' },
    ]);
    const { container } = ui(<TroublemakersGrid data={{ heading: 'Meet the team' }} />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Katie' })).toBeTruthy();
    expect(screen.getAllByText('photo coming soon')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Sam, Barista' })).toBeTruthy();
    const link = await screen.findByRole('link', { name: 'Iced Matcha Latte' });
    expect(link.getAttribute('href')).toBe('/menu#item-iced-matcha-latte');
    expect(screen.getByText('Something off-menu').tagName).toBe('SPAN');
    expect(screen.getByText('Paddington')).toBeTruthy();
    expect(container.textContent).not.toContain('—');
    expect(container.textContent).not.toContain('Favorite book');
  });

  it('an empty team shows a note instead of an empty board', async () => {
    ds.getTeamMembers.mockResolvedValueOnce([]);
    ui(<TroublemakersGrid data={{ empty_message: 'Photos coming.' }} />);
    expect(await screen.findByText('Photos coming.')).toBeTruthy();
  });
});

describe('timeline', () => {
  it('a milestone shows its own photo untagged; the rest borrow "shop today" photos, labelled; year tags mark each new year', async () => {
    ds.getTimelineEvents.mockResolvedValueOnce([
      { id: 'a', date_label: 'Oct 2017', sort_date: '2017-10-13', title: 'Opening', image_url: '/images/pages/storefront-door.jpg', image_alt: 'Opening day' },
      { id: 'b', date_label: 'Dec 2019', sort_date: '2019-12-07', title: 'Write-up' },
      { id: 'c', date_label: 'Dec 2019', sort_date: '2019-12-20', title: 'Another' },
    ]);
    const { container } = ui(<TimelineGrid data={{ fill_caption: 'The shop today', fill_images: [{ url: '/images/pages/fox-planter.jpg', alt: 'The fox planter' }] }} />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Opening' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Opening day' })).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'The fox planter' })).toHaveLength(2);
    expect(screen.getAllByText('The shop today')).toHaveLength(2);
    expect([...container.querySelectorAll('.tl-item__year')].map((n) => n.textContent)).toEqual(['2017', '2019']);
    expect(screen.getByText('…and counting')).toBeTruthy();
  });

  it('empty timeline keeps its friendly line', async () => {
    ds.getTimelineEvents.mockResolvedValueOnce([]);
    ui(<TimelineGrid data={{}} />);
    expect(await screen.findByText(/just getting started/)).toBeTruthy();
  });
});
