import { useState } from 'react';
import { FaArrowUpRightFromSquare, FaWandMagicSparkles } from 'react-icons/fa6';
import { DrinkPhoto } from './FoxPlay.jsx';
import { orderLabelFor, orderUrlFor } from '../lib/order.js';
import { fmtPrice } from '../lib/foxFun.js';
import { track } from '../lib/analytics.js';
import { articleFor, forgetUsual, loadUsual, saveUsual } from '../lib/yourUsual.js';
import '../styles/fox-outfit.css';

/* "Back for an Iced Latte?" — the visitor's usual (src/lib/yourUsual.js) at
   the top of the fox's card, resolved against today's menu so the price,
   photo and SpotOn section link are current. Lives only in this browser. */

export default function FoxUsual({ menu, onSomethingDifferent }) {
  const [found, setFound] = useState(() => loadUsual(menu));
  if (!found) return null;
  const { item } = found;

  const different = () => {
    forgetUsual();
    setFound(null);
    track('fox_usual_different');
    onSomethingDifferent?.();
  };

  return (
    <div className="fox-usual" data-testid="fox-usual">
      <DrinkPhoto item={item} />
      <div className="fox-usual__info">
        <p className="fox-usual__q">Back for {articleFor(item.name)} {item.name}?</p>
        {Number(item.price) > 0 && <p className="fox-usual__price">{fmtPrice(item.price)}</p>}
      </div>
      <p className="fox-usual__actions">
        <a className="fox-help__link" href={orderUrlFor(item)} target="_blank" rel="noopener noreferrer" aria-label={orderLabelFor(item)}
          onClick={() => { saveUsual(item); track('order_now_click', { location: 'fox_usual', item: item.name }); }}>
          Order <FaArrowUpRightFromSquare aria-hidden="true" />
        </a>
        <button type="button" className="fox-help__link fox-help__link--ghost" onClick={different}>
          <FaWandMagicSparkles aria-hidden="true" /> Something different
        </button>
      </p>
      <p className="fox-usual__note">Saved on this device only.</p>
    </div>
  );
}
