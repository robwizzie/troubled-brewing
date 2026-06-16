/* Vintage scrolling marquee — a little movement and personality, echoing the
   shop's hand-lettered signs. Content is duplicated so the loop is seamless;
   the CSS animation pauses under prefers-reduced-motion (tokens.css). */
const DEFAULT = [
  'Good Coffee',
  'Good Trouble',
  'We Pour La Colombe',
  'Haddon Heights, NJ',
  'Fresh Paninis',
  'Come Cause Trouble',
];

export default function Ticker({ items = DEFAULT }) {
  const run = [...items, ...items];
  return (
    <div className="ticker" role="presentation" aria-hidden="true">
      <div className="ticker__track">
        {run.map((t, i) => (
          <span className="ticker__item" key={i}>
            <span className="ticker__star">✦</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}
