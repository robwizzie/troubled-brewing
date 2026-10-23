import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('../src/lib/dataService.js', async (orig) => {
  const real = await orig();
  return { ...real, getEvents: vi.fn(real.getEvents) };
});

const ds = await import('../src/lib/dataService.js');
const cal = await import('../src/lib/calendar.js');
const { shopNow } = await import('../src/lib/hours.js');
const EventsList = (await import('../src/components/sections/EventsList.jsx')).default;

/* "Add to calendar" / "Text a friend" on event posters: the .ics builder
   (RFC 5545 escaping + folding, New York time zone, all-day, the default two
   hours), the Google / Outlook links, the sms text, and the menu itself. */

const NOV = { id: 'ev1', title: 'Trivia Night', event_date: '2026-11-07', event_time: '7–9 PM', description: 'Teams of 4; bring friends, bring snacks.' };
const URL_ = 'https://troublebrewingcoffeehouse.com/events#event-ev1';
const NOW = new Date('2026-10-19T12:00:00Z');
const unfold = (ics) => ics.replace(/\r\n /g, '');
/** A property line inside the VEVENT (the VTIMEZONE has DTSTARTs of its own). */
const lineOf = (ics, name) => unfold(ics).split('BEGIN:VEVENT')[1].split('\r\n').find((l) => l.startsWith(name));
const blobText = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(b); });

afterEach(cleanup);

describe('reading the owner’s time text', () => {
  it.each([
    ['7 PM', 19 * 60, null],
    ['7:30pm', 19 * 60 + 30, null],
    ['6:00–8:00 PM', 18 * 60, 20 * 60],
    ['6-8pm', 18 * 60, 20 * 60],
    ['11–1 PM', 11 * 60, 13 * 60],
    ['10:30 AM - 12:30 PM', 10 * 60 + 30, 12 * 60 + 30],
    ['7 p.m. to 9', 19 * 60, 21 * 60],
    ['9 PM – 1 AM', 21 * 60, 60],
    ['Noon to 2pm', 12 * 60, 14 * 60],
    ['19:00-21:00', 19 * 60, 21 * 60],
  ])('%s', (text, start, end) => {
    expect(cal.parseEventTime(text)).toEqual({ start, end });
  });

  it.each(['', 'All day', 'all-day', '7', 'TBA'])('“%s” has no usable time', (text) => {
    expect(cal.parseEventTime(text)).toBeNull();
  });

  it('end defaults to two hours; past-midnight ends roll to the next day; no time = all day', () => {
    expect(cal.eventWindow({ event_date: '2026-11-07', event_time: '7 PM' })).toEqual({ allDay: false, startDate: '2026-11-07', startTime: '19:00', endDate: '2026-11-07', endTime: '21:00' });
    expect(cal.eventWindow({ event_date: '2026-12-31', event_time: '11 PM' })).toEqual({ allDay: false, startDate: '2026-12-31', startTime: '23:00', endDate: '2027-01-01', endTime: '01:00' });
    expect(cal.eventWindow({ event_date: '2026-11-07', event_time: '' })).toEqual({ allDay: true, startDate: '2026-11-07', endDate: '2026-11-08' });
    expect(cal.eventWindow({ event_date: 'soon' })).toBeNull();
  });
});

describe('time zone math (America/New_York)', () => {
  it('turns shop wall time into the right instant either side of DST', () => {
    expect(cal.zonedToUtc('2026-11-07', '19:00').toISOString()).toBe('2026-11-08T00:00:00.000Z'); // EST, −5
    expect(cal.zonedToUtc('2026-07-11', '19:00').toISOString()).toBe('2026-07-11T23:00:00.000Z'); // EDT, −4
    expect(cal.zonedToUtc('2026-03-08', '12:00').toISOString()).toBe('2026-03-08T16:00:00.000Z'); // DST day
  });
});

describe('.ics builder', () => {
  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(cal.escapeIcsText('a, b; c\\d\nnext\r\nline')).toBe('a\\, b\\; c\\\\d\\nnext\\nline');
  });

  it('folds lines at 75 octets without splitting a character', () => {
    const long = `DESCRIPTION:${'Café crème ☕ '.repeat(20)}`;
    const folded = cal.foldIcsLine(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    const enc = new TextEncoder();
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    for (const l of lines.slice(1)) expect(l.startsWith(' ')).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    expect(folded).not.toContain('�');
    expect(cal.foldIcsLine('SUMMARY:short')).toBe('SUMMARY:short');
  });

  it('a timed event: TZID’d start/end, a VTIMEZONE, UID, DTSTAMP, summary, location and URL', () => {
    const ics = cal.buildIcs(NOV, { url: URL_, now: NOW });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/); // CRLF only
    for (const l of ics.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:America/New_York');
    expect(ics).toContain('RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU');
    expect(lineOf(ics, 'UID:')).toBe('UID:event-ev1@troublebrewingcoffeehouse.com');
    expect(lineOf(ics, 'DTSTAMP:')).toBe('DTSTAMP:20261019T120000Z');
    expect(lineOf(ics, 'DTSTART')).toBe('DTSTART;TZID=America/New_York:20261107T190000');
    expect(lineOf(ics, 'DTEND')).toBe('DTEND;TZID=America/New_York:20261107T210000');
    expect(lineOf(ics, 'SUMMARY:')).toBe('SUMMARY:Trivia Night');
    expect(lineOf(ics, 'LOCATION:')).toBe('LOCATION:Trouble Brewing Coffee House\\, 514 Station Ave\\, Haddon Heights\\, NJ 08035');
    expect(lineOf(ics, 'DESCRIPTION:')).toBe(`DESCRIPTION:Teams of 4\\; bring friends\\, bring snacks.\\n\\nWhen: 7–9 PM\\n\\n${URL_}`);
    expect(lineOf(ics, 'URL:')).toBe(`URL:${URL_}`);
  });

  it('only a start time → two hours long', () => {
    const ics = cal.buildIcs({ ...NOV, event_time: '7:30 PM' }, { now: NOW });
    expect(lineOf(ics, 'DTSTART')).toBe('DTSTART;TZID=America/New_York:20261107T193000');
    expect(lineOf(ics, 'DTEND')).toBe('DTEND;TZID=America/New_York:20261107T213000');
    expect(lineOf(ics, 'URL:')).toBeUndefined();
  });

  it('all-day → DATE values (end exclusive) and no time zone block', () => {
    const ics = cal.buildIcs({ ...NOV, event_time: 'All day' }, { now: NOW });
    expect(lineOf(ics, 'DTSTART')).toBe('DTSTART;VALUE=DATE:20261107');
    expect(lineOf(ics, 'DTEND')).toBe('DTEND;VALUE=DATE:20261108');
    expect(ics).not.toContain('VTIMEZONE');
  });

  it('no date, no file', () => {
    expect(cal.buildIcs({ title: 'Someday' })).toBe('');
    expect(cal.icsFilename(NOV)).toBe('trouble-brewing-trivia-night-2026-11-07.ics');
  });
});

describe('Google / Outlook links', () => {
  it('Google: TEMPLATE with wall-clock dates and ctz', () => {
    const u = new URL(cal.googleCalendarUrl(NOV, { url: URL_ }));
    expect(`${u.origin}${u.pathname}`).toBe('https://calendar.google.com/calendar/render');
    const q = u.searchParams;
    expect(q.get('action')).toBe('TEMPLATE');
    expect(q.get('text')).toBe('Trivia Night');
    expect(q.get('dates')).toBe('20261107T190000/20261107T210000');
    expect(q.get('ctz')).toBe('America/New_York');
    expect(q.get('location')).toBe('Trouble Brewing Coffee House, 514 Station Ave, Haddon Heights, NJ 08035');
    expect(q.get('details')).toContain('Teams of 4; bring friends, bring snacks.');
    expect(q.get('details')).toContain(URL_);
  });

  it('Google: all-day uses DATE pairs, default duration applies', () => {
    expect(new URL(cal.googleCalendarUrl({ ...NOV, event_time: '' })).searchParams.get('dates')).toBe('20261107/20261108');
    expect(new URL(cal.googleCalendarUrl({ ...NOV, event_time: '8 AM' })).searchParams.get('dates')).toBe('20261107T080000/20261107T100000');
  });

  it('Outlook: times carry the New York offset in force that day', () => {
    const nov = new URL(cal.outlookCalendarUrl(NOV)).searchParams;
    expect(nov.get('startdt')).toBe('2026-11-07T19:00:00-05:00');
    expect(nov.get('enddt')).toBe('2026-11-07T21:00:00-05:00');
    const jul = new URL(cal.outlookCalendarUrl({ ...NOV, event_date: '2026-07-11' })).searchParams;
    expect(jul.get('startdt')).toBe('2026-07-11T19:00:00-04:00');
    expect(new URL(cal.outlookCalendarUrl({ ...NOV, event_time: '' })).searchParams.get('allday')).toBe('true');
  });
});

describe('Text a friend', () => {
  it('a short invite in an sms:?&body= link', () => {
    const href = cal.smsHref(NOV, { url: URL_ });
    expect(href.startsWith('sms:?&body=')).toBe(true);
    expect(decodeURIComponent(href.slice('sms:?&body='.length))).toBe(`Want to go to Trivia Night at Trouble Brewing on Sat, Nov 7 at 7 PM? ${URL_}`);
    expect(cal.inviteText({ ...NOV, event_time: '7:30 PM' })).toBe('Want to go to Trivia Night at Trouble Brewing on Sat, Nov 7 at 7:30 PM?');
    expect(cal.inviteText({ ...NOV, event_time: '' })).toBe('Want to go to Trivia Night at Trouble Brewing on Sat, Nov 7?');
  });
});

describe('on the posters', () => {
  beforeEach(() => ds.getEvents.mockReset());

  function setup() {
    const y = Number(shopNow().isoDate.slice(0, 4));
    ds.getEvents.mockResolvedValue([
      { id: 'up', title: 'Open Mic', event_date: `${y + 1}-03-06`, event_time: '6 PM', description: '', image_url: '' },
      { id: 'old', title: 'Old raffle', event_date: `${y - 1}-10-13`, image_url: '/images/pages/table-spread.jpg' },
    ]);
    return render(<MemoryRouter><EventsList data={{ show_past: true }} /></MemoryRouter>);
  }

  it('upcoming posters get both buttons; past events do not', async () => {
    setup();
    await screen.findByRole('heading', { level: 3, name: 'Open Mic' });
    expect(await screen.findAllByRole('button', { name: /add to calendar/i })).toHaveLength(1);
    const sms = screen.getByRole('link', { name: /text a friend/i });
    expect(sms.getAttribute('href')).toMatch(/^sms:\?&body=Want%20to%20go%20to%20Open%20Mic/);
    expect(decodeURIComponent(sms.getAttribute('href'))).toContain('/events#event-up');
    expect(document.getElementById('event-up')).toBeTruthy();
  });

  it('the menu: aria-expanded, Escape closes and refocuses, outside click closes', async () => {
    setup();
    const btn = await screen.findByRole('button', { name: /add to calendar/i });
    const menuId = btn.getAttribute('aria-controls');
    const menu = document.getElementById(menuId);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(true);

    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hidden).toBe(false);
    expect(within(menu).getByRole('button', { name: /apple/i })).toBeTruthy();
    const g = within(menu).getByRole('link', { name: /google calendar/i });
    expect(g.getAttribute('href')).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
    expect(g.getAttribute('target')).toBe('_blank');
    expect(within(menu).getByRole('link', { name: /outlook/i })).toBeTruthy();

    within(menu).getByRole('link', { name: /google calendar/i }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(btn);

    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    fireEvent.pointerDown(document.body);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('Apple / iCal downloads a generated .ics through a Blob URL', async () => {
    setup();
    const created = [];
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((b) => { created.push(b); return 'blob:test'; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { this.dataset.clicked = this.download; });
    try {
      fireEvent.click(await screen.findByRole('button', { name: /add to calendar/i }));
      fireEvent.click(screen.getByRole('button', { name: /apple/i }));
      expect(created).toHaveLength(1);
      expect(created[0].type).toBe('text/calendar;charset=utf-8');
      const text = await blobText(created[0]);
      expect(text).toContain('SUMMARY:Open Mic');
      expect(text).toContain('DTSTART;TZID=America/New_York:');
      expect(click).toHaveBeenCalledTimes(1);
      expect(click.mock.contexts[0].download).toMatch(/^trouble-brewing-open-mic-\d{4}-03-06\.ics$/);
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('Text a friend prefers the native share sheet when there is one', async () => {
    setup();
    const share = vi.fn().mockResolvedValue(undefined);
    navigator.share = share;
    try {
      const link = await screen.findByRole('link', { name: /text a friend/i });
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Open Mic', url: expect.stringContaining('#event-up') }));
      expect(share.mock.calls[0][0].text).toMatch(/^Want to go to Open Mic at Trouble Brewing on .+ at 6 PM\?$/);
    } finally {
      delete navigator.share;
    }
  });
});

/* Multi-day events: an optional end_date (the last day, inclusive). */
describe('multi-day events (end_date)', () => {
  const FEST = { id: 'fest', title: 'Art Walk Fall Fest', event_date: '2026-10-24', end_date: '2026-10-26', event_time: '10am-4pm' };

  it('timed: starts on the first day, ends on the last', () => {
    expect(cal.eventWindow(FEST)).toEqual({ allDay: false, startDate: '2026-10-24', startTime: '10:00', endDate: '2026-10-26', endTime: '16:00' });
  });

  it('all-day: covers every day (end exclusive)', () => {
    expect(cal.eventWindow({ ...FEST, event_time: '' })).toEqual({ allDay: true, startDate: '2026-10-24', endDate: '2026-10-27' });
  });

  it('a blank, malformed or earlier end date is a one-day event', () => {
    for (const end_date of ['', null, 'soon', '2026-10-20', '2026-10-24']) {
      expect(cal.eventWindow({ ...FEST, end_date }).endDate).toBe('2026-10-24');
    }
  });

  it('the invite and the calendar description name the span', () => {
    expect(cal.friendlyWhen(FEST)).toBe('Sat, Oct 24 – Mon, Oct 26');
    expect(unfold(cal.buildIcs(FEST, { now: NOW }))).toContain('When: Saturday\\, October 24 – Monday\\, October 26\\, 10am-4pm');
  });

  it('stays upcoming until its last day has passed', async () => {
    const { isUpcoming } = await import('../src/lib/eventDates.js');
    expect(isUpcoming(FEST, '2026-10-26')).toBe(true);
    expect(isUpcoming(FEST, '2026-10-27')).toBe(false);
    expect(isUpcoming({ ...FEST, end_date: '' }, '2026-10-25')).toBe(false);
  });

  it('the poster’s date block shows the span', async () => {
    ds.getEvents.mockReset();
    const y = Number(shopNow().isoDate.slice(0, 4)) + 1;
    ds.getEvents.mockResolvedValue([{ ...FEST, event_date: `${y}-10-30`, end_date: `${y}-11-02` }]);
    render(<MemoryRouter><EventsList data={{}} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 3, name: 'Art Walk Fall Fest' });
    const block = document.querySelector('.ev-poster__date');
    expect(block.classList.contains('ev-poster__date--span')).toBe(true);
    expect(block.textContent).toContain('Oct–Nov');
    expect(block.textContent).toContain('30–2');
  });
});
