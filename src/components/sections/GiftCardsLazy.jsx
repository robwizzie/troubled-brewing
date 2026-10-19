import { lazy, Suspense } from 'react';

/* The gift-card page's section loads as its own chunk: it lives on one page,
   so nobody else pays for it. A cream placeholder of about the hero's height
   holds the space while it arrives. */
const GiftCards = lazy(() => import('./GiftCards.jsx'));

export default function GiftCardsLazy(props) {
  return (
    <Suspense fallback={<section className="section gc gc--loading" aria-busy="true" />}>
      <GiftCards {...props} />
    </Suspense>
  );
}
