/* The Gallery Wall frame vocabulary — shared by the public hero and the admin
   editor so the two never drift. Each value is a distinct vintage molding
   recipe in sections.css (`.gw-frame__art--<value>`), modeled on a real frame
   from the shop's wall (see docs/DESIGN.md). Legacy names from before the
   revamp may still live in saved CMS rows; normalizeFrameStyle() maps them
   onto the new set so old content keeps rendering without a migration. */

export const FRAME_STYLE_OPTIONS = [
  { value: 'gilt-grand', label: 'Grand gold (ornate)' },
  { value: 'gilt-thin', label: 'Thin gold fillet' },
  { value: 'gold-botanical', label: 'Gold + cream mat (botanical)' },
  { value: 'gold-tapestry', label: 'Gold tapestry (woven)' },
  { value: 'bronze-carved', label: 'Antique carved bronze' },
  { value: 'brass-chain', label: 'Thin brass on a chain' },
  { value: 'black-flat', label: 'Wide flat black' },
  { value: 'black-mat', label: 'Black + wide white mat' },
  { value: 'black-stacked', label: 'Black, layered frames' },
  { value: 'oval-gilt', label: 'Gold oval (specimen)' },
  { value: 'oval-black', label: 'Black oval (portrait)' },
];

const LEGACY = {
  gold: 'gilt-thin',
  ornate: 'gilt-grand',
  black: 'black-flat',
  wood: 'bronze-carved',
  green: 'bronze-carved',
  pink: 'gold-botanical',
  'oval-gold': 'oval-gilt',
  'oval-pink': 'oval-gilt',
  'oval-green': 'oval-black',
};

export function normalizeFrameStyle(style) {
  if (!style) return 'gilt-thin';
  if (LEGACY[style]) return LEGACY[style];
  return FRAME_STYLE_OPTIONS.some((o) => o.value === style) ? style : 'gilt-thin';
}
