import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CanvasEditingContext } from '../lib/canvasContext.jsx';
import { getPage, getSections, getContentBlock } from '../lib/dataService.js';
import SectionRenderer from '../components/SectionRenderer.jsx';
import SEO from '../components/SEO.jsx';
import Ticker from '../components/Ticker.jsx';
import { localBusinessJsonLd } from '../lib/jsonld.js';
import * as seed from '../lib/seed.js';

/* Home is concept-swappable: the hero renders as Gallery Wall (lead), Warm
   Storefront, or Cozy Editorial based on content_blocks.homepage_concept, so the
   client can review all three and lock one in. The chosen concept reuses the
   seeded hero section's data; the rest of the page renders normally. */
import { CONCEPT_TO_TYPE, HERO_TYPES } from '../lib/concepts.js';

/* The hero's content ships in the bundle (seed), so the top of the page can paint
   — and run its entrance animation — immediately, instead of behind a loading
   skeleton. Any owner edits from Supabase reconcile in once the fetch resolves. */
const SEED_HERO = (seed.SECTIONS.home || []).find((s) => HERO_TYPES.has(s.type)) || null;

export default function Home() {
  const [params] = useSearchParams();
  // ?preview=1 — admin draft preview, same contract as SitePage.
  const preview = params.get('preview') === '1';
  // Inside the editor canvas, sections + concept are pushed by the parent frame.
  const canvas = useContext(CanvasEditingContext);
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState(null);
  // Preview override: visit /?concept=warm_storefront or ?concept=cozy_editorial
  // to see a concept without changing the saved choice (admin → Quick Blocks).
  const previewConcept = new URLSearchParams(window.location.search).get('concept');
  const isPreview = !!CONCEPT_TO_TYPE[previewConcept];
  const [concept, setConcept] = useState(isPreview ? previewConcept : 'gallery_wall');

  useEffect(() => {
    if (canvas) return undefined;
    let alive = true;
    Promise.all([getPage('home'), getSections('home', { preview }), getContentBlock('homepage_concept')]).then(
      ([p, s, c]) => {
        if (!alive) return;
        setPage(p);
        setSections(s);
        if (!isPreview && c?.concept && CONCEPT_TO_TYPE[c.concept]) setConcept(c.concept);
      }
    );
    return () => { alive = false; };
  }, [isPreview, preview, canvas]);

  const effSections = canvas && canvas.slug === 'home' ? canvas.sections : sections;
  const effConcept = canvas?.concept && CONCEPT_TO_TYPE[canvas.concept] ? canvas.concept : concept;

  // Pull the seeded hero (any concept type) out and render the CHOSEN concept in
  // its place. Going through SectionRenderer keeps the public output identical
  // while letting the editor canvas tag the hero with its real row id — the
  // stored row keeps its own type; only the renderer swaps (see docs/CMS.md).
  // Before the fetch lands the hero renders from seed and stays mounted across
  // the swap (same renderer + position), so its GSAP entrance plays exactly
  // once — no skeleton; the rest of the page fills in below once sections land.
  const heroSection = effSections?.find((s) => HERO_TYPES.has(s.type)) || SEED_HERO;
  const rest = effSections ? effSections.filter((s) => s !== heroSection) : [];
  const conceptType = CONCEPT_TO_TYPE[effConcept];

  return (
    <>
      <SEO title={page?.title} description={page?.meta_description} path="/" jsonLd={localBusinessJsonLd()} />
      {preview && (
        <div className="announce" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
          Preview mode — showing unpublished drafts. This banner isn't visible to the public.
        </div>
      )}
      {conceptType && (
        <SectionRenderer section={{ id: 'home-hero', data: {}, ...heroSection, type: conceptType }} />
      )}
      {(() => {
        // The scrolling marquee is owner-editable through the hero's data
        // (ticker_items) — it belongs to the homepage's identity, whichever
        // concept is showing. In the canvas it's tagged so a click opens the
        // hero panel right on the ticker field.
        const tickerData = heroSection?.data?.ticker_items;
        const items = Array.isArray(tickerData) && tickerData.length ? tickerData : undefined;
        const ticker = <Ticker items={items} />;
        return canvas && heroSection ? (
          <div
            data-tb-section-id={heroSection.id}
            data-tb-label="Ticker strip"
            data-tb-field="ticker_items"
            style={{ display: 'contents' }}
          >
            {ticker}
          </div>
        ) : (
          ticker
        );
      })()}
      {rest.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </>
  );
}
