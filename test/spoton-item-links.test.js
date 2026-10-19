import { describe, it, expect } from 'vitest';

const { SPOTON_ORDER_URL } = await import('../src/lib/config.js');
const { orderUrlFor } = await import('../src/lib/order.js');
const sync = await import('../scripts/sync-spoton-menu.mjs');

const STORE = 'https://order.spoton.com/so-trouble-brewing-coffee-house-26471/haddon-heights-nj/BL-BBE4-95CF-80CD';
const ID = '9f1c2d3e-0000-4abc-8def-1234567890ab';
const opts = (extra = {}) => ({ orderUrl: STORE, template: null, ...extra });

describe('orderUrlFor — item link first, store page as the safety net', () => {
  it('returns the item’s own SpotOn URL when it has one', () => {
    expect(orderUrlFor({ name: 'Iced Latte', order_url: `${STORE}/item/${ID}` })).toBe(`${STORE}/item/${ID}`);
    expect(orderUrlFor({ name: 'Iced Latte', order_url: `  ${STORE}?itemId=${ID}  ` })).toBe(`${STORE}?itemId=${ID}`);
  });

  it('falls back to the store page with no item, no link, or a link it can’t trust', () => {
    expect(orderUrlFor(null)).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(orderUrlFor({ name: 'Scone' })).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(orderUrlFor({ name: 'Scone', order_url: '' })).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(orderUrlFor({ name: 'Scone', order_url: 'scone-slug' })).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(orderUrlFor({ name: 'Scone', order_url: 'javascript:alert(1)' })).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
  });
});

describe('sync: SpotOn ids and link evidence', () => {
  it('reads SpotOn’s own id under whatever key it ships', () => {
    expect(sync.spotonIdOf({ id: ID })).toBe(ID);
    expect(sync.spotonIdOf({ itemId: 42 })).toBe('42');
    expect(sync.spotonIdOf({ name: 'x' })).toBeNull();
    expect(sync.spotonIdOf({ id: 'has spaces / slashes' })).toBeNull();
  });

  it('only trusts same-site, non-asset URLs that are not the bare store page', () => {
    expect(sync.asItemLink(`${STORE}/item/${ID}`, STORE)).toBe(`${STORE}/item/${ID}`);
    expect(sync.asItemLink('/so-trouble/x/item/1', STORE)).toBe('https://order.spoton.com/so-trouble/x/item/1');
    expect(sync.asItemLink('https://evil.example/item/1', STORE)).toBeNull();
    expect(sync.asItemLink('https://order.spoton.com/media/latte.png', STORE)).toBeNull();
    expect(sync.asItemLink(STORE, STORE)).toBeNull();
    expect(sync.asItemLink(`${STORE}/`, STORE)).toBeNull();
  });

  it('takes an explicit URL/path field from SpotOn’s payload, never a bare slug', () => {
    expect(sync.explicitItemUrl({ name: 'A', path: `/x/item/${ID}` }, STORE)).toBe(`https://order.spoton.com/x/item/${ID}`);
    expect(sync.explicitItemUrl({ name: 'A', slug: 'iced-latte', url: 'iced-latte' }, STORE)).toBeNull();
    expect(sync.explicitItemUrl({ name: 'A', imageUrl: 'https://order.spoton.com/i.jpg' }, STORE)).toBeNull();
  });

  it('learns a template only when the clicked URL names that item’s id', () => {
    expect(sync.learnItemTemplate(`${STORE}/item/${ID}`, ID, STORE)).toBe('{store}/item/{id}');
    expect(sync.learnItemTemplate(`${STORE}?itemId=${ID}&x=1`, ID, STORE)).toBe('{store}?itemId={id}&x=1');
    expect(sync.learnItemTemplate(`${STORE}#category-coffee`, ID, STORE)).toBeNull();
    expect(sync.learnItemTemplate(`${STORE}/item/${ID}`, null, STORE)).toBeNull();
  });

  it('an observed URL counts only when it names the item (id or name slug)', () => {
    expect(sync.urlNamesItem(`${STORE}#item-${ID}`, { id: ID, name: 'Iced Latte' })).toBe(true);
    expect(sync.urlNamesItem(`${STORE}/p/iced-latte`, { id: null, name: 'Iced Latte' })).toBe(true);
    expect(sync.urlNamesItem(`${STORE}#coffee-espresso-drinks`, { id: ID, name: 'Iced Latte' })).toBe(false);
  });

  it('itemOrderUrl: explicit > observed > confirmed template > learned > nothing', () => {
    const explicit = `${STORE}/explicit/${ID}`;
    const observed = `${STORE}/seen/${ID}`;
    expect(sync.itemOrderUrl({ explicit, observed, id: ID }, opts())).toBe(explicit);
    expect(sync.itemOrderUrl({ observed, id: ID }, opts())).toBe(observed);
    expect(sync.itemOrderUrl({ id: ID }, opts({ template: '{store}?itemId={id}', learned: '{store}/l/{id}' }))).toBe(`${STORE}?itemId=${ID}`);
    expect(sync.itemOrderUrl({ id: ID }, opts({ learned: '{store}/l/{id}' }))).toBe(`${STORE}/l/${ID}`);
    // no evidence → no guessed URL (the site uses the store page)
    expect(sync.itemOrderUrl({ id: ID }, opts())).toBeNull();
    expect(sync.itemOrderUrl({ id: null }, opts({ template: '{store}/item/{id}' }))).toBeNull();
  });
});

describe('sync mapping: scraped → merge → snapshot', () => {
  const cats = [
    {
      category: 'Iced Coffee & Espresso Drinks',
      items: [
        { id: 'aaa-1', name: 'Iced Latte', price: 5 },
        { id: 'bbb-2', name: 'Cold Brew', price: 4.5 },
        { id: 'ccc-3', name: 'Aircano', price: 4, shareUrl: `${STORE}/share/ccc-3` },
      ],
    },
  ];

  it('without evidence, items carry their SpotOn id but no link', () => {
    const { scraped, learned } = sync.flattenMenu([{ ...cats[0], items: cats[0].items.slice(0, 2) }], null, opts());
    expect(learned).toBeNull();
    expect(scraped.map((s) => [s.name, s.spoton_id, s.order_url])).toEqual([
      ['Iced Latte', 'aaa-1', null],
      ['Cold Brew', 'bbb-2', null],
    ]);
  });

  it('one clicked card that names its id teaches the pattern to every item; explicit links still win', () => {
    const details = { urlByName: new Map([['iced latte', `${STORE}/item/aaa-1`]]) };
    const { scraped, learned } = sync.flattenMenu(cats, details, opts());
    expect(learned).toBe('{store}/item/{id}');
    expect(Object.fromEntries(scraped.map((s) => [s.name, s.order_url]))).toEqual({
      'Iced Latte': `${STORE}/item/aaa-1`,
      'Cold Brew': `${STORE}/item/bbb-2`,
      Aircano: `${STORE}/share/ccc-3`,
    });
  });

  it('a confirmed template links every item with an id', () => {
    const { scraped } = sync.flattenMenu(cats, null, opts({ template: '{store}?item={id}' }));
    expect(scraped[1].order_url).toBe(`${STORE}?item=bbb-2`);
  });

  it('merge writes order_url only when the column exists, and never blanks a known link', () => {
    const existing = [
      { id: 'r1', name: 'Iced Latte', price: 5, category: 'espresso', available: true, display_order: 10, order_url: null },
      { id: 'r2', name: 'Cold Brew', price: 4.5, category: 'espresso', available: true, display_order: 20, order_url: `${STORE}/old/bbb-2` },
    ];
    const scraped = [
      { name: 'Iced Latte', price: 5, category: 'espresso', available: true, order_url: `${STORE}/item/aaa-1` },
      { name: 'Cold Brew', price: 4.5, category: 'espresso', available: true, order_url: null },
      { name: 'Aircano', price: 4, category: 'espresso', available: true, order_url: `${STORE}/item/ccc-3` },
    ];
    const on = sync.planMerge(existing, scraped, { withOrderUrl: true });
    expect(on.update).toEqual([{ id: 'r1', name: 'Iced Latte', patch: { order_url: `${STORE}/item/aaa-1` } }]);
    expect(on.insert[0].order_url).toBe(`${STORE}/item/ccc-3`);

    const off = sync.planMerge(existing, scraped, { withOrderUrl: false });
    expect(off.update).toEqual([]);
    expect(off.insert[0]).not.toHaveProperty('order_url');
  });

  it('snapshot items carry spoton_id + order_url (from the row, else this run’s scrape)', () => {
    const rows = [
      { id: 'r1', name: 'Iced Latte', price: 5, category: 'espresso', available: true, display_order: 10 },
      { id: 'r2', name: 'Cold Brew', price: 4.5, category: 'espresso', available: true, display_order: 20, order_url: `${STORE}/x/bbb-2` },
      { id: 'r3', name: 'Banana Split Coffee', price: 6.5, category: 'specialty', available: false, display_order: 30 },
    ];
    const scraped = [
      { name: 'Iced Latte', spoton_id: 'aaa-1', spoton_category: 'Iced', order_url: `${STORE}/item/aaa-1` },
      { name: 'Cold Brew', spoton_id: 'bbb-2', spoton_category: 'Iced', order_url: null },
    ];
    const items = sync.snapshotItems(rows, scraped);
    expect(items.map((i) => [i.id, i.spoton_id, i.order_url])).toEqual([
      ['r1', 'aaa-1', `${STORE}/item/aaa-1`],
      ['r2', 'bbb-2', `${STORE}/x/bbb-2`],
      ['r3', null, null],
    ]);
    // …and the site follows the snapshot's link, or the store page without one
    expect(orderUrlFor(items[0])).toBe(`${STORE}/item/aaa-1`);
    expect(orderUrlFor(items[2])).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
  });
});

describe('SpotOn section links (SpotOn has no per-item links)', () => {
  it('sends an item to its SpotOn menu section by category', async () => {
    const { orderUrlFor } = await import('../src/lib/order.js');
    expect(orderUrlFor({ name: 'X', spoton_category: 'Iced Coffee & Espresso Drinks' })).toMatch(/#group-menu-a1hzjzus43fplawznaz2gwrpie$/);
  });
  it('finds the section by name when the row has no category', async () => {
    const { orderUrlFor } = await import('../src/lib/order.js');
    expect(orderUrlFor({ name: 'Iced Chai Latte' })).toMatch(/#group-menu-gstagdpalvdk1gy4252s3qsuwq$/);
  });
  it('falls back to the store page for unknown items, and keeps a proven item URL', async () => {
    const { orderUrlFor } = await import('../src/lib/order.js');
    const { SPOTON_ORDER_URL } = await import('../src/lib/config.js');
    expect(orderUrlFor({ name: 'Nope' })).toSatisfy((u) => String(u).startsWith(SPOTON_ORDER_URL));
    expect(orderUrlFor({ name: 'Iced Chai Latte', order_url: 'https://order.spoton.com/x/item/1' })).toBe('https://order.spoton.com/x/item/1');
  });
});
