import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FoxGuide from '../src/components/FoxGuide.jsx';
import { foxAnswers, hoursAnswer } from '../src/lib/foxHelp.js';
import { nextOpening } from '../src/lib/hours.js';
import { HOURS, MENU_ITEMS, SECTIONS, SITE } from '../src/lib/seed.js';
import { SPOTON_ORDER_URL } from '../src/lib/config.js';

// Monday 19 Oct 2026, 10:15 AM in Haddon Heights (EDT, UTC-4)
const MON_MORNING = new Date('2026-10-19T14:15:00Z');
// Friday 23 Oct 2026, 6:00 PM — after Friday's 5 PM close
const FRI_EVENING = new Date('2026-10-23T22:00:00Z');
// Saturday 24 Oct 2026, 6:30 PM — Sunday opens later (8 AM)
const SAT_EVENING = new Date('2026-10-24T22:30:00Z');

const renderFox = () => render(<MemoryRouter><FoxGuide /></MemoryRouter>);
const fox = () => screen.getByRole('button', { name: /ask the fox/i });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('the fox’s answers come from real site data', () => {
  it('knows when the shop next opens, on the shop’s clock', () => {
    expect(nextOpening(HOURS, [], MON_MORNING)).toMatchObject({ inDays: 1, dow: 2, time: '7:30 AM' });
    expect(nextOpening(HOURS, [], SAT_EVENING)).toMatchObject({ inDays: 1, dow: 0, time: '8:00 AM' });
    expect(hoursAnswer(HOURS, [], MON_MORNING).text).toMatch(/open until 7:00 PM today/);
    expect(hoursAnswer(HOURS, [], FRI_EVENING).text).toMatch(/closed right now\. Back tomorrow at 7:30 AM/);
    expect(hoursAnswer(HOURS, [], SAT_EVENING).text).toMatch(/Back tomorrow at 8:00 AM/);
    // a holiday override wins, and is named
    const xmas = [{ override_date: '2026-10-19', open_time: null, close_time: null, label: 'Closed for a staff day' }];
    expect(hoursAnswer(HOURS, xmas, MON_MORNING).text).toMatch(/^Closed for a staff day: We’re closed right now\. Back tomorrow/);
  });

  it('offers only questions it has a source for', () => {
    const none = foxAnswers({});
    expect(none).toEqual([]);
    const menuOnly = foxAnswers({ menu: [{ name: 'Latte', category: 'espresso' }] });
    expect(menuOnly.map((a) => a.id)).toEqual(['menu']); // no GF tag, no Pup Cup → not offered
  });

  it('only names dietary items the menu flags and has available', () => {
    const a = foxAnswers({ menu: MENU_ITEMS }).find((x) => x.id === 'dietary');
    const gfNow = MENU_ITEMS.filter((i) => i.available !== false && i.dietary_flags.includes('gluten-free'));
    expect(a.a).toMatch(new RegExp(`${gfNow.length} gluten-free picks right now`));
    // every item it names really is flagged + available
    const named = a.a.match(/like the (.+?) and (.+?)\./).slice(1);
    named.forEach((n) => expect(gfNow.some((i) => i.name.startsWith(n))).toBe(true));
    expect(a.a).toMatch(/Jewish Apple Cake|Oatmeal Creme Pie|Pretzel Sticks/);
    // the only vegan-flagged item (Vegan Cookie) is unavailable, so vegan isn't claimed
    expect(a.q).toBe('Anything gluten-free?');
    expect(a.a).not.toMatch(/vegan/i);
  });

  it('describes the menu from what is actually on it', () => {
    const a = foxAnswers({ menu: MENU_ITEMS }).find((x) => x.id === 'menu');
    const n = MENU_ITEMS.filter((i) => i.available !== false).length;
    expect(a.a).toMatch(new RegExp(`: ${n} items on the menu right now`));
    expect(a.links[0].href).toBe('/menu');
  });

  it('never says anything about glasses', () => {
    const all = foxAnswers({ hours: HOURS, menu: MENU_ITEMS, address: SITE.address, orderUrl: SPOTON_ORDER_URL, parking: 'x', phone: SITE.phone, phoneHref: SITE.phoneHref, hostCopy: 'x', quip: 'x' });
    all.forEach((q) => expect(`${q.q} ${q.a}`).not.toMatch(/glasses|spectacles|monocle/i));
  });
});

describe('the fox’s help card', () => {
  it('opens from the fox, answers from live data, and closes on Escape', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MON_MORNING);
    renderFox();
    const btn = fox();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const card = screen.getByRole('dialog', { name: 'Ask the fox' });
    expect(btn.getAttribute('aria-controls')).toBe(card.id);

    // hours: same rows the site shows, on the shop's clock
    fireEvent.click(await within(card).findByRole('button', { name: 'Are you open?' }));
    expect(within(card).getByText(/We’re open until 7:00 PM today/)).toBeTruthy();

    // parking: the Location page's own Parking block
    const parkingMd = SECTIONS.location.find((s) => /parking/i.test(s.data.heading)).data.body_markdown;
    fireEvent.click(within(card).getByRole('button', { name: 'Where do I park?' }));
    expect(within(card).getByText(parkingMd.replace(/\*\*/g, ''))).toBeTruthy();

    // ordering: the real SpotOn link
    fireEvent.click(within(card).getByRole('button', { name: 'Can I order ahead?' }));
    expect(within(card).getByRole('link', { name: /Order on SpotOn/ }).getAttribute('href')).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));

    // and a way out to Contact
    expect(within(card).getByRole('link', { name: /Contact us/ }).getAttribute('href')).toBe('/contact');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the answer outside the scrolling chip list, so it is never scrolled away', async () => {
    renderFox();
    fireEvent.click(fox());
    const card = screen.getByRole('dialog', { name: 'Ask the fox' });
    const park = await within(card).findByRole('button', { name: 'Where do I park?' });
    fireEvent.click(park);
    const say = card.querySelector('.fox-help__say');
    expect(say.textContent).toMatch(/Where do I park/);
    expect(say.closest('.fox-help__body')).toBeNull();
    // the answer box comes before the chips, straight under the header
    expect(say.previousElementSibling.tagName).toBe('HEADER');
    expect(say.nextElementSibling.classList.contains('fox-help__body')).toBe(true);
  });

  it('closes on an outside tap', async () => {
    renderFox();
    fireEvent.click(fox());
    await screen.findByRole('button', { name: 'Are you open?' });
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides, stays hidden across visits, and comes back from the paw tab', async () => {
    const first = renderFox();
    fireEvent.click(fox());
    fireEvent.click(screen.getByRole('button', { name: /^Hide the fox$/ }));
    expect(screen.queryByRole('button', { name: /ask the fox/i })).toBeNull();
    expect(localStorage.getItem('tb-fox-hidden')).toBe('1');
    first.unmount();

    renderFox(); // a later page view
    expect(screen.queryByRole('button', { name: /ask the fox/i })).toBeNull();
    // the tab is his own head peeking in, not an icon
    expect(screen.getByRole('button', { name: 'Bring back the fox' }).querySelector('.fox-guide__peek')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bring back the fox' }));
    expect(fox()).toBeTruthy();
    // he comes back with the slide-in-from-the-edge entrance, not the page-load rise
    expect(document.querySelector('.fox-guide').classList.contains('is-back')).toBe(true);
    expect(localStorage.getItem('tb-fox-hidden')).toBeNull();
  });

  // a phone-sized screen: matchMedia answers the fox's phone query
  const asPhone = () => {
    const real = window.matchMedia;
    window.matchMedia = (q) => ({ ...real(q), matches: q.includes('max-width: 600px') || real(q).matches });
    return () => { window.matchMedia = real; };
  };

  it('on a phone he lives as a tab at the edge, with nothing to close or hide', async () => {
    const restore = asPhone();
    try {
      renderFox();
      expect(fox().querySelector('.fox-guide__mini .fox-guide__bust')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Hide the fox' })).toBeNull(); // no × on him
      fireEvent.click(fox());
      await screen.findByRole('button', { name: 'Are you open?' });
      expect(screen.queryByRole('button', { name: /Hide the fox/ })).toBeNull(); // nor in the card
    } finally {
      restore();
    }
  });

  it('on a phone, a fox hidden on a bigger screen still shows as the edge tab', () => {
    localStorage.setItem('tb-fox-hidden', '1');
    const restore = asPhone();
    try {
      renderFox();
      expect(fox()).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Bring back the fox' })).toBeNull();
    } finally {
      restore();
    }
  });

  it('the × on the fox hides him too', () => {
    renderFox();
    const xs = screen.getAllByRole('button', { name: 'Hide the fox' });
    fireEvent.click(xs[0]);
    expect(screen.getByRole('button', { name: 'Bring back the fox' })).toBeTruthy();
  });
});

describe('computeStatus closed label', () => {
  it('names tomorrow after closing, today before opening', async () => {
    const { computeStatus } = await import('../src/lib/hours.js');
    const hours = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, open_time: '7:30 AM', close_time: '7:00 PM' }));
    // 23:30 shop time (03:30Z next day in EDT) on a Monday in Oct 2026
    expect(computeStatus(hours, [], new Date('2026-10-20T03:30:00Z')).label).toBe('Closed — opens tomorrow 7:30 AM');
    // 06:00 shop time
    expect(computeStatus(hours, [], new Date('2026-10-19T10:00:00Z')).label).toBe('Closed — opens 7:30 AM');
  });
});
