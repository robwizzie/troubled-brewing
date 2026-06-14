import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPage, getSections } from '../lib/dataService.js';
import SectionRenderer from '../components/SectionRenderer.jsx';
import SEO from '../components/SEO.jsx';
import { PageSkeleton } from '../components/Skeleton.jsx';
import { localBusinessJsonLd } from '../lib/jsonld.js';

/* Generic section-composed page. Fetches the page meta + ordered sections and
   renders them via the registry. Used by most public routes. Supports admin
   preview of unpublished drafts via ?preview=1. */
export default function SitePage({ slug, children }) {
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState(null);

  useEffect(() => {
    let alive = true;
    setSections(null);
    Promise.all([getPage(slug), getSections(slug, { preview })]).then(([p, s]) => {
      if (!alive) return;
      setPage(p);
      setSections(s);
    });
    return () => { alive = false; };
  }, [slug, preview]);

  const includeJsonLd = slug === 'location';

  return (
    <>
      <SEO
        title={page?.title}
        description={page?.meta_description}
        path={slug === 'home' ? '/' : `/${slug}`}
        jsonLd={includeJsonLd ? localBusinessJsonLd() : undefined}
      />
      {preview && (
        <div className="announce" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
          Preview mode — showing unpublished drafts. This banner isn't visible to the public.
        </div>
      )}
      {sections === null ? (
        <PageSkeleton />
      ) : (
        sections.map((s) => <SectionRenderer key={s.id} section={s} />)
      )}
      {children}
    </>
  );
}
