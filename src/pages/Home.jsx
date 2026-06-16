import { useEffect, useState } from 'react';
import { getPage, getSections, getContentBlock } from '../lib/dataService.js';
import SectionRenderer from '../components/SectionRenderer.jsx';
import SEO from '../components/SEO.jsx';
import { PageSkeleton } from '../components/Skeleton.jsx';
import { SECTION_RENDERERS } from '../components/sections/registry.js';
import Ticker from '../components/Ticker.jsx';
import { localBusinessJsonLd } from '../lib/jsonld.js';

/* Home is concept-swappable: the hero renders as Gallery Wall (lead), Warm
   Storefront, or Cozy Editorial based on content_blocks.homepage_concept, so the
   client can review all three and lock one in. The chosen concept reuses the
   seeded hero section's data; the rest of the page renders normally. */
const CONCEPT_TO_TYPE = {
  gallery_wall: 'gallery_wall_hero',
  warm_storefront: 'warm_storefront_hero',
  cozy_editorial: 'cozy_editorial_hero',
};
const HERO_TYPES = new Set(Object.values(CONCEPT_TO_TYPE));

export default function Home() {
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState(null);
  const [concept, setConcept] = useState('gallery_wall');

  useEffect(() => {
    let alive = true;
    Promise.all([getPage('home'), getSections('home'), getContentBlock('homepage_concept')]).then(
      ([p, s, c]) => {
        if (!alive) return;
        setPage(p);
        setSections(s);
        if (c?.concept && CONCEPT_TO_TYPE[c.concept]) setConcept(c.concept);
      }
    );
    return () => { alive = false; };
  }, []);

  if (sections === null) {
    return (
      <>
        <SEO title={page?.title} description={page?.meta_description} path="/" jsonLd={localBusinessJsonLd()} />
        <PageSkeleton />
      </>
    );
  }

  // Pull the seeded hero (any concept type) out and render the CHOSEN concept in its place.
  const heroSection = sections.find((s) => HERO_TYPES.has(s.type));
  const rest = sections.filter((s) => s !== heroSection);
  const ConceptHero = SECTION_RENDERERS[CONCEPT_TO_TYPE[concept]];

  return (
    <>
      <SEO title={page?.title} description={page?.meta_description} path="/" jsonLd={localBusinessJsonLd()} />
      {ConceptHero && <ConceptHero data={heroSection?.data || {}} />}
      <Ticker />
      {rest.map((s) => (
        <SectionRenderer key={s.id} section={s} />
      ))}
    </>
  );
}
