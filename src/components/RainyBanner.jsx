import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaArrowUpRightFromSquare, FaSnowflake, FaUmbrella, FaXmark } from 'react-icons/fa6';
import { SPOTON_ORDER_URL } from '../lib/config.js';
import { track } from '../lib/analytics.js';
import { useShopStatus } from '../lib/useShopStatus.js';
import { useShopWeather } from '../lib/useFoxOutfit.js';
import { RAINY_COPY, bannerKind, dismiss, isDismissed, previewKind } from '../lib/rainyBanner.js';

/* A slim "order ahead" bar while it's raining or snowing at the shop and the
   shop is open (rules + copy: src/lib/rainyBanner.js). It only ever appears
   after the hours and weather are in, so it slides down gently (no motion
   with prefers-reduced-motion) instead of jolting the page. Rendered by
   <AnnouncementBanner fallback> so it never sits under the owner's own
   announcement. */
export default function RainyBanner() {
  const { pathname } = useLocation();
  const [preview] = useState(() => previewKind());
  const [closed, setClosed] = useState(false);
  const weather = useShopWeather({ skip: Boolean(preview) });
  const status = useShopStatus();

  const kind = closed ? null : bannerKind({
    preview,
    weather,
    open: status ? status.open : null,
    dismissed: !preview && isDismissed(),
    admin: /^\/admin(\/|$)/.test(pathname),
  });
  if (!kind) return null;

  const copy = RAINY_COPY[kind];
  const Icon = kind === 'snow' ? FaSnowflake : FaUmbrella;

  return (
    <div className="rainy" data-kind={kind}>
      <div className="rainy__clip">
        <div className="rainy__bar" role="status" aria-label={copy.label}>
          <Icon className="rainy__icon" aria-hidden="true" />
          <p className="rainy__msg">{copy.message}</p>
          <a
            className="rainy__cta"
            href={SPOTON_ORDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('rainy_order', { kind })}
          >
            {copy.cta}
            <FaArrowUpRightFromSquare aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button
            type="button"
            className="rainy__close"
            aria-label={`Dismiss ${copy.label.toLowerCase()} for today`}
            onClick={() => { dismiss(); setClosed(true); }}
          >
            <FaXmark aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
