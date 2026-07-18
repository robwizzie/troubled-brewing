import { useEffect, useState } from 'react';
import { getPage, getSections, getContentBlock } from '../lib/dataService.js';
import SectionRenderer from '../components/SectionRenderer.jsx';
import SEO from '../components/SEO.jsx';
import { SECTION_RENDERERS } from '../components/sections/registry.js';
import Ticker from '../components/Ticker.jsx';
import { localBusinessJsonLd } from '../lib/jsonld.js';
import * as seed from '../lib/seed.js';

/* Home is concept-swappable: the hero renders as Gallery Wall (lead), Warm
   Storefront, or Cozy Editorial based on content_blocks.homepage_concept, so the
   client can review all three and lock one in. The chosen concept reuses the
   seeded hero section's data; the rest of the page renders normally. */
const CONCEPT_TO_TYPE = {
  gallery_wall: 'gallery_wall_hero',
  warm_storefront: 'warm_storefront_hero',
  cozy_editorial: 'cozy_editorial_hero',
  modern_coffee: 'modern_coffee_hero',
};
const HERO_TYPES = new Set(Object.values(CONCEPT_TO_TYPE));

/* The hero's content ships in the bundle (seed), so the top of the page can paint
   — and run its entrance animation — immediately, instead of behind a loading
   skeleton. Any owner edits from Supabase reconcile in once the fetch resolves. */
const SEED_HERO = (seed.SECTIONS.home || []).find((s) => HERO_TYPES.has(s.type)) || null;

export default function Home() {
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState(null);
  // Preview override: visit /?concept=warm_storefront or ?concept=cozy_editorial
  // to see a concept without changing the saved choice (admin → Quick Blocks).
  const previewConcept = new URLSearchParams(window.location.search).get('concept');
  const isPreview = !!CONCEPT_TO_TYPE[previewConcept];
  const [concept, setConcept] = useState(isPreview ? previewConcept : 'gallery_wall');

  useEffect(() => {
    let alive = true;
    Promise.all([getPage('home'), getSections('home'), getContentBlock('homepage_concept')]).then(
      ([p, s, c]) => {
        if (!alive) return;
        setPage(p);
        setSections(s);
        if (!isPreview && c?.concept && CONCEPT_TO_TYPE[c.concept]) setConcept(c.concept);
      }
    );
    return () => { alive = false; };
  }, [isPreview]);

  // The hero renders from seed on the first paint and stays mounted across the
  // fetch (same component + position), so its GSAP entrance plays exactly once —
  // no skeleton, and no swap flash for the default concept. The rest of the page
  // fills in below once the sections land.
  const loadedHero = sections?.find((s) => HERO_TYPES.has(s.type));
  const heroData = (loadedHero || SEED_HERO)?.data || {};
  const rest = sections ? sections.filter((s) => s !== loadedHero) : [];
  const ConceptHero = SECTION_RENDERERS[CONCEPT_TO_TYPE[concept]];

  return (
    <>
      <SEO title={page?.title} description={page?.meta_description} path="/" jsonLd={localBusinessJsonLd()} />
      {ConceptHero && <ConceptHero data={heroData} />}
      <Ticker />
      {rest.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </>
  );
}
