import { ANY, classifyDrink } from './foxFun.js';
import { SITE_URL } from './config.js';

/* Drink personalities: after the fox's quiz, a playful "You're a Matcha
   Mischief-Maker" card to share to an Instagram Story.

   personaFor({ answers, item }) is a pure function of the quiz's answers and
   the drink it matched (a real menu row), so the same quiz result always
   gives the same persona — and the persona always agrees with the drink on
   the card (a Matcha Latte is never called a Chai Charmer). The drink is
   read with the quiz's own classifyDrink (src/lib/foxFun.js); answers break
   the close calls (a cortado for someone who asked for "Creamy" is a Latte
   Loyalist, for "Bold" an Espresso Instigator).

   The card shows the drink's real name and never its price. Every line is
   in the fox's voice: playful, always kind. */

export const SHOP_HANDLE = '@troublebrewingcoffee';
export const SHOP_SITE = 'troublebrewingcoffeehouse.com';
/** Where "Copy link" points: the home page, with the fox's quiz open. */
export const PERSONA_LINK = `${String(SITE_URL).replace(/\/+$/, '')}/?fox=quiz&src=persona`;

/* Colour themes, all from the shop's palette:
     sage #545f33 · gold #d4ad57 / #a87c1c · cream #f7f1e4 · ink #2c2722
     raspberry #b0436e · blush #e98fb0
   bg: the card; fg: its text; accent: eyebrow, rules, chips; chip / chipFg:
   the trait pills; frame: the gilt; dark: light text on a dark ground. */
export const THEMES = {
  sage: { bg: '#545f33', bg2: '#434c27', fg: '#f7f1e4', soft: '#e3dcc4', accent: '#d4ad57', chip: 'rgba(247, 241, 228, 0.14)', chipFg: '#f7f1e4', dark: true },
  ink: { bg: '#2c2722', bg2: '#1d1915', fg: '#f7f1e4', soft: '#d9cfbd', accent: '#d4ad57', chip: 'rgba(212, 173, 87, 0.18)', chipFg: '#f3dfa9', dark: true },
  inkBlush: { bg: '#2c2722', bg2: '#1d1915', fg: '#f7f1e4', soft: '#e4d2d6', accent: '#e98fb0', chip: 'rgba(233, 143, 176, 0.2)', chipFg: '#f7d3e0', dark: true },
  raspberry: { bg: '#b0436e', bg2: '#8e3257', fg: '#fff7f0', soft: '#fbe4ec', accent: '#f3d27e', chip: 'rgba(255, 247, 240, 0.18)', chipFg: '#fff7f0', dark: true },
  blush: { bg: '#e98fb0', bg2: '#dc7499', fg: '#2c2722', soft: '#4a2a36', accent: '#8e2f57', chip: 'rgba(255, 253, 247, 0.55)', chipFg: '#5b1f39', dark: false },
  cream: { bg: '#f7f1e4', bg2: '#ece0c6', fg: '#2c2722', soft: '#5d564b', accent: '#545f33', chip: '#e7ebd6', chipFg: '#3f4826', dark: false },
  creamRasp: { bg: '#f7f1e4', bg2: '#efdcd8', fg: '#2c2722', soft: '#5d564b', accent: '#b0436e', chip: '#fbe4ec', chipFg: '#8e3257', dark: false },
  blushSoft: { bg: '#f8dde7', bg2: '#efc3d3', fg: '#2c2722', soft: '#5b3a46', accent: '#b0436e', chip: 'rgba(255, 253, 247, 0.7)', chipFg: '#8e3257', dark: false },
  sageBlush: { bg: '#545f33', bg2: '#434c27', fg: '#f7f1e4', soft: '#ead9dd', accent: '#e98fb0', chip: 'rgba(233, 143, 176, 0.2)', chipFg: '#fbe4ec', dark: true },
  creamGold: { bg: '#f7f1e4', bg2: '#eadbb9', fg: '#2c2722', soft: '#5d564b', accent: '#a87c1c', chip: '#f7e8bf', chipFg: '#6e5110', dark: false },
  gold: { bg: '#d4ad57', bg2: '#c39639', fg: '#2c2722', soft: '#3f3424', accent: '#7a2c4c', chip: 'rgba(255, 253, 247, 0.5)', chipFg: '#2c2722', dark: false },
  goldSage: { bg: '#d4ad57', bg2: '#c39639', fg: '#2c2722', soft: '#3f3424', accent: '#3f4826', chip: 'rgba(255, 253, 247, 0.5)', chipFg: '#2f3620', dark: false },
};

/* The personas. Names: alliterative, shop-flavoured, warm. `line` is the
   fox talking to you; `traits` are three short, kind labels. */
export const PERSONAS = [
  {
    id: 'matcha', name: 'Matcha Mischief-Maker', theme: 'sage',
    line: 'Bright, green and always up to something good. I’d lend you my top hat.',
    traits: ['Plant parent', 'Whisks with flair', 'Plans the fun'],
  },
  {
    id: 'espresso', name: 'Espresso Instigator', theme: 'ink',
    line: 'Small cup, big plans. You start the fun and the rest of us follow.',
    traits: ['Early riser', 'Straight to the point', 'Starts the party'],
  },
  {
    id: 'cold-brew', name: 'Cold Brew Conspirator', theme: 'inkBlush',
    line: 'Cool, calm and quietly plotting something lovely. Count me in.',
    traits: ['Patient plotter', 'Iced all winter', 'Keeps the secrets'],
  },
  {
    id: 'chai', name: 'Chai Charmer', theme: 'gold',
    line: 'Warm, spiced and impossible not to like. You could charm a fox out of his hat.',
    traits: ['Cozy-sweater pro', 'Spice-rack chief', 'Hugs hello'],
  },
  {
    id: 'latte', name: 'Latte Loyalist', theme: 'cream',
    line: 'You know what you love, and you love it well. A regular at heart.',
    traits: ['Knows their order', 'Loyal to the core', 'Latte-art admirer'],
  },
  {
    id: 'frozen', name: 'Frozen Firecracker', theme: 'raspberry',
    line: 'Cool on the outside, all sparkle on the inside. Brain freeze? Worth it.',
    traits: ['Brain-freeze brave', 'Life of the party', 'Straw-twirler'],
  },
  {
    id: 'refresher', name: 'Refresher Rebel', theme: 'blush',
    line: 'Bright, bubbly and happily off the usual path. Sunshine in a cup, that’s you.',
    traits: ['Sunshine seeker', 'Bubbly texter', 'Fruit first'],
  },
  {
    id: 'cocoa', name: 'Cocoa Cuddler', theme: 'blushSoft',
    line: 'Cozy blankets, warm mugs and kind words. You make every room softer.',
    traits: ['Blanket-fort builder', 'Marshmallow fan', 'Kind to everyone'],
  },
  {
    id: 'tea', name: 'Tea Time Trickster', theme: 'creamRasp',
    line: 'Proper manners, playful heart. You pour the tea, then the jokes.',
    traits: ['Pinky up', 'Pun enthusiast', 'Kettle always on'],
  },
  {
    id: 'breakfast', name: 'Breakfast-All-Day Bandit', theme: 'creamGold',
    line: 'Bagel at 2 PM? Of course. You make your own hours, and I admire it.',
    traits: ['Bagel at 2 PM', 'Rule bender', 'Second-cup club'],
  },
  {
    id: 'cider', name: 'Cider Sidekick', theme: 'sageBlush',
    line: 'Crisp, warm and loyal to the core. Every good adventure needs you along.',
    traits: ['Orchard heart', 'Crisp-day lover', 'Best sidekick'],
  },
  {
    id: 'seasonal', name: 'Seasonal Scallywag', theme: 'goldSage',
    line: 'First in line for anything new. If it’s limited-time, you’re already on it.',
    traits: ['Trend spotter', 'First in line', 'Specials hunter'],
  },
];

const BY_ID = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));

/** "a" or "an" for the persona's name: "an Espresso Instigator". */
export const article = (name) => (/^[aeiou]/i.test(String(name)) ? 'an' : 'a');

/* Which persona a drink (and the answers that found it) belongs to. In
   order, first match wins:
     matcha     — the name says matcha
     seasonal   — a seasonal special (menu category "seasonal")
     frozen     — a frozen drink (frappe, frozen coffee, frozen chai)
     chai       — chai
     cider      — cider / apple
     refresher  — lemonade, refreshers, any fruity drink
     cocoa      — hot chocolate (no coffee in it), a steamer
     tea        — tea, London Fog, Earl Grey, turmeric / golden
     breakfast  — drip coffee, café au lait
     cold-brew  — an iced coffee without milk (cold brew, Americano, tonic…),
                  unless the visitor asked for milk
     espresso   — a bold coffee (espresso, Americano, cortado, macchiato,
                  flat white), unless the visitor asked for creamy
     latte      — every other coffee with milk
   An answer only decides a close call; anything unrecognised is a
   Seasonal Scallywag (a new special the rules haven't met yet). */
export function personaIdFor({ answers = {}, item } = {}) {
  if (!item?.name) return 'seasonal';
  const name = String(item.name);
  const c = classifyDrink(item);
  const said = (k) => (answers?.[k] != null && answers[k] !== ANY ? answers[k] : null);
  const coffee = c.base.includes('coffee');

  if (/matcha/i.test(name)) return 'matcha';
  if (item.category === 'seasonal') return 'seasonal';
  if (c.temp === 'frozen') return 'frozen';
  if (/chai/i.test(name)) return 'chai';
  if (/cider|apple/i.test(name)) return 'cider';
  if (/lemonade|refresher/i.test(name) || (c.base.includes('fruity') && !coffee)) return 'refresher';
  if ((c.base.includes('chocolate') && !coffee) || /steamer/i.test(name)) return 'cocoa';
  if (c.base.includes('tea') || /turmeric|golden/i.test(name)) return 'tea';
  if (coffee) {
    if (/\bdrip\b|au lait/i.test(name)) return 'breakfast';
    if (c.temp !== 'hot' && c.milk !== 'yes' && said('milk') !== 'yes') return 'cold-brew';
    const bold = c.flavour.includes('bold') && !/\blatte\b|cappuccino/i.test(name);
    if (bold && said('flavour') !== 'creamy') return 'espresso';
    if (!bold && said('flavour') === 'bold' && c.milk !== 'yes') return 'espresso';
    return 'latte';
  }
  return 'seasonal';
}

/** The full persona for a quiz result: { id, name, line, traits, theme
    (resolved colours), themeId, title: "You’re a …", drink: the real drink
    name }. No price, ever. */
export function personaFor({ answers = {}, item } = {}) {
  const p = BY_ID[personaIdFor({ answers, item })];
  return {
    ...p,
    themeId: p.theme,
    theme: THEMES[p.theme],
    article: article(p.name),
    title: `You’re ${article(p.name)} ${p.name}`,
    drink: item?.name ? String(item.name) : '',
  };
}

/* Personas are only for drinks with a REAL photo: the card and the Story
   image are built around it, and there is never a drawn stand-in. */

/** The drink's real photo (its menu item's image_url), or '' if it has none. */
export const personaPhoto = (item) => (typeof item?.image_url === 'string' ? item.image_url.trim() : '');

/** Can this drink have a persona card? Only with a real photo. */
export const hasPersonaPhoto = (item) => Boolean(personaPhoto(item));

/** A filename for the downloaded story image. */
export const storyFileName = (persona) => `trouble-brewing-${persona?.id || 'persona'}.png`;
