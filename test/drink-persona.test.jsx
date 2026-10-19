import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* Drink personalities: the mapping (src/lib/drinkPersona.js), the button on
   the quiz result and its dialog (src/components/PersonaCard.jsx), and the
   share / download path (src/lib/storyShare.js). The Story image itself is
   tested in story-image.test.js; here it is stubbed. */

vi.mock('../src/lib/storyImage.js', () => ({
  storyBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));
vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn(), useAnalytics: () => {} }));

const { track } = await import('../src/lib/analytics.js');
const { default: FoxGuide } = await import('../src/components/FoxGuide.jsx');
const { QuizPane } = await import('../src/components/FoxPlay.jsx');
const { storyBlob } = await import('../src/lib/storyImage.js');
const { ANY, QUIZ, drinkCandidates, matchDrink, quizPlan } = await import('../src/lib/foxFun.js');
const { PERSONAS, THEMES, PERSONA_LINK, personaFor, personaIdFor, article, hasPersonaPhoto } = await import('../src/lib/drinkPersona.js');
const { canShareFiles, shareStoryImage } = await import('../src/lib/storyShare.js');
const { MENU_ITEMS } = await import('../src/lib/seed.js');

const by = (n) => MENU_ITEMS.find((i) => i.name === n);
/** A seeded random sequence, so ties in the quiz break different ways. */
const lcg = (seed) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };

/** Every way through the quiz (each offered answer, and "No preference"). */
function allPaths(menu) {
  const out = [];
  const walk = (ans) => {
    const next = quizPlan(menu, ans).find((q) => !(q.id in ans));
    if (!next) { out.push(ans); return; }
    for (const v of [...next.options.map((o) => o.value), ANY]) walk({ ...ans, [next.id]: v });
  };
  walk({});
  return out;
}

describe('personas', () => {
  it('are a dozen distinct, kind, complete personas in varied palette colours', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(10);
    expect(PERSONAS.length).toBeLessThanOrEqual(12);
    expect(new Set(PERSONAS.map((p) => p.name)).size).toBe(PERSONAS.length);
    for (const p of PERSONAS) {
      expect(p.line.length).toBeGreaterThan(20);
      expect(p.line.length).toBeLessThan(110);
      expect(p.traits).toHaveLength(3);
      p.traits.forEach((t) => expect(t.length).toBeLessThanOrEqual(22));
      expect(THEMES[p.theme]).toBeTruthy();
      expect(`${p.name} ${p.line} ${p.traits.join(' ')}`).not.toMatch(/\$|glasses|spectacles/i);
    }
    // the cards look different: at least six different grounds
    expect(new Set(PERSONAS.map((p) => THEMES[p.theme].bg)).size).toBeGreaterThanOrEqual(6);
    // and only the shop's palette (plus soft tints of it)
    const PALETTE = ['#545f33', '#2c2722', '#b0436e', '#e98fb0', '#f7f1e4', '#d4ad57', '#f8dde7'];
    Object.values(THEMES).forEach((t) => expect(PALETTE).toContain(t.bg));
  });

  it('maps real drinks to the persona they obviously are', () => {
    const want = {
      'Iced Matcha Latte': 'matcha', 'Hot Matcha Latte': 'matcha',
      Espresso: 'espresso', Cortado: 'espresso', 'Hot Americano': 'espresso',
      'Cold Brew': 'cold-brew', 'Iced Americano': 'cold-brew', 'Espresso Tonic': 'cold-brew',
      'Hot Chai Latte': 'chai', 'Iced Chai Latte': 'chai',
      'Hot Latte': 'latte', Cappuccino: 'latte', 'Iced Latte': 'latte',
      'Frozen Coffee': 'frozen', 'Frappe - 16oz': 'frozen', 'Frozen Chai': 'frozen',
      Refreshers: 'refresher', Lemonade: 'refresher',
      'Hot Chocolate': 'cocoa', 'Milk Steamer': 'cocoa',
      'Hot London Fog': 'tea', 'Iced Tea': 'tea', 'Hot Turmeric Latte': 'tea',
      'Drip Coffee': 'breakfast', 'Cafe Au Lait': 'breakfast',
      'Hot Apple Cider': 'cider', 'Iced Apple Cider': 'cider',
    };
    for (const [name, id] of Object.entries(want)) expect([name, personaIdFor({ item: by(name) })]).toEqual([name, id]);
    // a seasonal special, and something the rules have never met
    expect(personaIdFor({ item: { name: 'Pumpkin Spice Thing', category: 'seasonal', price: 6 } })).toBe('seasonal');
    expect(personaIdFor({ item: { name: 'Mystery Elixir', category: 'specialty', price: 6 } })).toBe('seasonal');
    expect(personaIdFor({})).toBe('seasonal');
  });

  it('lets an answer decide a close call', () => {
    // a cortado is bold… unless you asked for creamy
    expect(personaIdFor({ item: by('Cortado'), answers: { flavour: 'bold' } })).toBe('espresso');
    expect(personaIdFor({ item: by('Cortado'), answers: { flavour: 'creamy' } })).toBe('latte');
    // a shaken espresso (milk unknown) is a conspirator, unless you asked for milk
    expect(personaIdFor({ item: by('Shaken Espresso - 20oz'), answers: {} })).toBe('cold-brew');
    expect(personaIdFor({ item: by('Shaken Espresso - 20oz'), answers: { milk: 'yes' } })).toBe('espresso');
    expect(personaIdFor({ item: by('Shaken Espresso - 20oz'), answers: { milk: 'yes', flavour: 'creamy' } })).toBe('latte');
  });

  it('covers every quiz path: a real persona, the real drink, never a price, and deterministic', () => {
    const paths = allPaths(MENU_ITEMS);
    expect(paths.length).toBeGreaterThan(50);
    const seen = new Set();
    const ids = new Set(PERSONAS.map((p) => p.id));
    for (const answers of paths) {
      for (const seed of [1, 7, 42, 2017]) {
        const m = matchDrink(MENU_ITEMS, answers, { rand: lcg(seed) });
        const p = personaFor({ answers, item: m.item });
        expect(ids.has(p.id)).toBe(true);
        expect(p.drink).toBe(m.item.name);
        expect(p.title).toBe(`You’re ${article(p.name)} ${p.name}`);
        expect(JSON.stringify({ ...p, theme: null })).not.toMatch(/\$\d|price/i);
        // the same answers and match always give the same persona
        expect(personaFor({ answers: { ...answers }, item: { ...m.item } })).toEqual(p);
        seen.add(p.id);
      }
    }
    // every persona but the seasonal one is reachable from today's menu
    expect([...ids].filter((id) => !seen.has(id))).toEqual(['seasonal']);
  });

  it('reaches a persona for every drink the quiz can ever land on', () => {
    for (const d of drinkCandidates(MENU_ITEMS)) {
      const p = personaFor({ answers: {}, item: d });
      expect(p.name).toBeTruthy();
      expect(QUIZ.length).toBe(5);
    }
  });

  it('says "an" before a vowel', () => {
    expect(personaFor({ item: by('Espresso') }).title).toBe('You’re an Espresso Instigator');
    expect(personaFor({ item: by('Iced Matcha Latte') }).title).toBe('You’re a Matcha Mischief-Maker');
  });
});

/* ---- sharing ----------------------------------------------------------------- */

describe('sharing the Story image', () => {
  const persona = personaFor({ item: by('Iced Matcha Latte') });
  const blob = new Blob(['png'], { type: 'image/png' });
  let clicks;
  beforeEach(() => {
    clicks = [];
    URL.createObjectURL = vi.fn(() => 'blob:story');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { clicks.push({ href: this.href, download: this.download }); });
  });

  it('uses the share sheet with the PNG when the browser can share files', async () => {
    const nav = { canShare: vi.fn(() => true), share: vi.fn(async () => {}) };
    expect(canShareFiles(nav)).toBe(true);
    await expect(shareStoryImage(blob, persona, { nav })).resolves.toBe('share');
    const arg = nav.share.mock.calls[0][0];
    expect(arg.files).toHaveLength(1);
    expect(arg.files[0].name).toBe('trouble-brewing-matcha.png');
    expect(arg.files[0].type).toBe('image/png');
    expect(arg.text).toContain('@troublebrewingcoffee');
    expect(clicks).toHaveLength(0);
  });

  it('downloads instead when files can’t be shared, or there is no Web Share', async () => {
    for (const nav of [{ canShare: () => false, share: vi.fn() }, {}, null]) {
      clicks = [];
      await expect(shareStoryImage(blob, persona, { nav })).resolves.toBe('download');
      expect(clicks).toEqual([{ href: 'blob:story', download: 'trouble-brewing-matcha.png' }]);
    }
    expect(canShareFiles({})).toBe(false);
  });

  it('treats a closed share sheet as a cancel, and a refused share as a download', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    await expect(shareStoryImage(blob, persona, { nav: { canShare: () => true, share: () => Promise.reject(abort) } })).resolves.toBe('cancel');
    const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' });
    await expect(shareStoryImage(blob, persona, { nav: { canShare: () => true, share: () => Promise.reject(denied) } })).resolves.toBe('download');
    expect(clicks).toHaveLength(1);
  });

  it('links back to the quiz', () => {
    expect(PERSONA_LINK).toBe('https://troublebrewingcoffeehouse.com/?fox=quiz&src=persona');
  });
});

/* ---- in the fox's card: real photos only --------------------------------------
   Image is stubbed so a preload "loads" unless its URL is in BROKEN. */

const PHOTO = 'https://x.supabase.co/storage/v1/object/public/menu/1729-iced-matcha-latte.jpg';
const withPhoto = (n, url = PHOTO) => ({ ...by(n), image_url: url });
const BROKEN = new Set();
class FakeImage {
  set src(v) { this._src = v; setTimeout(() => (BROKEN.has(v) ? this.onerror?.() : this.onload?.()), 0); }
  get src() { return this._src; }
}

/** A one-drink menu: the quiz has nothing to ask and shows the match at once. */
const renderMatch = (item) => render(
  <section className="fox-help" tabIndex={-1} data-testid="panel"><QuizPane menu={[item]} hours={[]} overrides={[]} /></section>,
);
const launcher = () => screen.queryByRole('button', { name: 'Get my drink personality' });
const settle = () => act(() => new Promise((r) => setTimeout(r, 5)));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tb-fox-met', '1');
  track.mockClear();
  storyBlob.mockClear();
  storyBlob.mockImplementation(async () => new Blob(['png'], { type: 'image/png' }));
  BROKEN.clear();
  vi.stubGlobal('Image', FakeImage);
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete navigator.canShare;
  delete navigator.share;
});

describe('Get my drink personality: only for a drink with a real photo', () => {
  it('knows which drinks have one', () => {
    expect(hasPersonaPhoto(by('Cold Brew'))).toBe(false); // the seed menu has no photos
    expect(hasPersonaPhoto({ ...by('Cold Brew'), image_url: '  ' })).toBe(false);
    expect(hasPersonaPhoto(withPhoto('Cold Brew'))).toBe(true);
  });

  it('no photo: no button, and the quiz result is exactly as before', async () => {
    renderMatch(by('Cold Brew'));
    await settle();
    const result = screen.getByTestId('fox-quiz-result');
    expect(launcher()).toBeNull();
    expect(result.querySelector('.persona-launch')).toBeNull();
    expect(within(result).getByRole('link', { name: /^Order Cold Brew/ })).toBeTruthy();
    // and through the whole fox card with today's (photo-less) menu
    cleanup();
    render(<MemoryRouter><FoxGuide /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ask the fox/i }));
    const card = screen.getByRole('dialog', { name: /Ask the fox/ });
    fireEvent.click(await within(card).findByRole('button', { name: 'Pick my drink' }));
    while (within(card).queryByTestId('fox-quiz')) fireEvent.click(within(card).getByRole('button', { name: 'No preference' }));
    await settle();
    expect(within(card).getByTestId('fox-quiz-result')).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'Get my drink personality' })).toBeNull();
  });

  it('a photo that fails to preload never gives a button', async () => {
    BROKEN.add(PHOTO);
    renderMatch(withPhoto('Iced Matcha Latte'));
    expect(launcher()).toBeNull(); // not while it's still loading either
    await settle();
    expect(launcher()).toBeNull();
  });

  it('the photo loads: the button appears after "Your match", and the card shows that real photo, never the drawn cup', async () => {
    renderMatch(withPhoto('Iced Matcha Latte'));
    expect(launcher()).toBeNull();
    const btn = await screen.findByRole('button', { name: 'Get my drink personality' });
    const result = screen.getByTestId('fox-quiz-result');
    expect(result.querySelector('.fox-match').compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(btn);

    const dialog = await screen.findByRole('dialog', { name: 'You’re a Matcha Mischief-Maker' });
    const persona = personaFor({ answers: {}, item: by('Iced Matcha Latte') });
    expect(screen.getByTestId('panel').contains(dialog)).toBe(true); // a portal into the panel
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    const photo = within(dialog).getByRole('img', { name: 'Iced Matcha Latte' });
    expect(photo.getAttribute('src')).toBe(PHOTO);
    expect(dialog.querySelector('.fox-pour__cup, .fox-photo__art')).toBeNull();
    expect(dialog.querySelector('.persona-card__drink').textContent).toBe('Iced Matcha Latte');
    expect(dialog.textContent).not.toMatch(/\$\d/);
    expect(dialog.textContent).toContain('@troublebrewingcoffee');
    expect(dialog.textContent).toContain('troublebrewingcoffeehouse.com');
    expect(dialog.textContent).toContain('Share to your Story and tag @troublebrewingcoffee');
    expect(within(dialog).getByRole('img', { name: 'Trouble Brewing' })).toBeTruthy();
    persona.traits.forEach((t) => expect(within(dialog).getByText(t)).toBeTruthy());
    expect(track).toHaveBeenCalledWith('persona_view', { persona: 'matcha' });
    await waitFor(() => expect(storyBlob).toHaveBeenCalledTimes(1));
    expect(Object.keys(storyBlob.mock.calls[0][0]).sort()).toEqual(['item', 'persona']);
    expect(storyBlob.mock.calls[0][0].item.image_url).toBe(PHOTO);

    // Tab stays inside; Esc closes only this card and focus returns to the button
    const close = within(dialog).getByRole('button', { name: 'Close drink personality' });
    const back = within(dialog).getByRole('button', { name: 'Back to my match' });
    back.focus();
    fireEvent.keyDown(back, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(launcher()));
  });

  it('if the card’s photo fails after all, the card closes and the button goes away', async () => {
    renderMatch(withPhoto('Iced Matcha Latte'));
    fireEvent.click(await screen.findByRole('button', { name: 'Get my drink personality' }));
    const dialog = await screen.findByRole('dialog', { name: /^You’re/ });
    fireEvent.error(within(dialog).getByRole('img', { name: 'Iced Matcha Latte' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcher()).toBeNull();
    expect(screen.getByTestId('fox-quiz-result')).toBeTruthy();
  });

  it('says the card is getting ready on the button itself until the PNG exists', async () => {
    let finish;
    storyBlob.mockImplementation(() => new Promise((r) => { finish = r; }));
    renderMatch(withPhoto('Iced Matcha Latte'));
    fireEvent.click(await screen.findByRole('button', { name: 'Get my drink personality' }));
    const dialog = await screen.findByRole('dialog', { name: /^You’re/ });
    const waiting = within(dialog).getByRole('button', { name: 'Getting your card ready…' });
    expect(waiting.disabled).toBe(true);
    expect(dialog.querySelector('.persona-actions').getAttribute('aria-busy')).toBe('true');
    await act(async () => { finish(new Blob(['png'], { type: 'image/png' })); });
    expect(within(dialog).getByRole('button', { name: 'Download image' }).disabled).toBe(false);
  });

  it('only if every way to the photo fails: a friendly "try again", Copy link — and the retry can succeed', async () => {
    storyBlob.mockImplementationOnce(async () => { throw Object.assign(new Error('no drawable photo'), { name: 'NoPhotoError' }); });
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn(async () => {});
    renderMatch(withPhoto('Iced Matcha Latte'));
    fireEvent.click(await screen.findByRole('button', { name: 'Get my drink personality' }));
    const dialog = await screen.findByRole('dialog', { name: /^You’re/ });
    const oops = await within(dialog).findByRole('alert');
    expect(oops.textContent).toMatch(/Couldn’t grab the photo/);
    expect(within(dialog).queryByRole('button', { name: /Share image/ })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /Download image/ })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Copy link' })).toBeTruthy();
    // the card itself still shows the real photo, never a cup
    expect(within(dialog).getByRole('img', { name: 'Iced Matcha Latte' }).getAttribute('src')).toBe(PHOTO);
    expect(dialog.querySelector('.fox-pour__cup')).toBeNull();
    // Try again: the second attempt works, and sharing is back
    await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'Try again' })); });
    expect(storyBlob).toHaveBeenCalledTimes(2);
    expect(await within(dialog).findByRole('button', { name: 'Share image' })).toBeTruthy();
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });

  it('shares the generated PNG with navigator.share when it can share files', async () => {
    const made = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], { type: 'image/png' });
    storyBlob.mockImplementation(async () => made);
    const share = vi.fn(async () => {});
    navigator.canShare = vi.fn(() => true);
    navigator.share = share;
    renderMatch(withPhoto('Iced Matcha Latte'));
    fireEvent.click(await screen.findByRole('button', { name: 'Get my drink personality' }));
    const dialog = await screen.findByRole('dialog', { name: /^You’re/ });
    const btn = await within(dialog).findByRole('button', { name: 'Share image' });
    await waitFor(() => expect(btn.disabled).toBe(false));
    await act(async () => { fireEvent.click(btn); });
    expect(share).toHaveBeenCalledTimes(1);
    // the real PNG the generator made, as an image/png File
    const [file] = share.mock.calls[0][0].files;
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('trouble-brewing-matcha.png');
    expect(file.size).toBe(made.size);
    expect(storyBlob.mock.calls[0][0].item.image_url).toBe(PHOTO);
    expect(track).toHaveBeenCalledWith('persona_share', { method: 'share' });
    expect(within(dialog).getByRole('button', { name: 'Download image' })).toBeTruthy();
  });

  it('downloads the PNG when files can’t be shared, and copies the link', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:story');
    URL.revokeObjectURL = vi.fn();
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderMatch(withPhoto('Iced Matcha Latte'));
    fireEvent.click(await screen.findByRole('button', { name: 'Get my drink personality' }));
    const dialog = await screen.findByRole('dialog', { name: /^You’re/ });
    expect(within(dialog).queryByRole('button', { name: 'Share image' })).toBeNull();
    const btn = within(dialog).getByRole('button', { name: /Download image|Getting your image ready/ });
    await waitFor(() => expect(btn.disabled).toBe(false));
    fireEvent.click(btn);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('persona_download');
    await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'Copy link' })); });
    expect(writeText).toHaveBeenCalledWith(PERSONA_LINK);
    expect(track).toHaveBeenCalledWith('persona_share', { method: 'copy_link' });
    expect(within(dialog).getByRole('status').textContent).toBe('Link copied!');
  });
});
