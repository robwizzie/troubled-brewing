import Markdown from '../Markdown.jsx';
import Reveal from '../Reveal.jsx';
import { CoffeeCup, Beans } from '../Motifs.jsx';

/* Editorial text block. Optional `variant`:
   - 'lead' → centered, larger intro with a coffee-cup motif above the heading
              and a little bean flourish below
   - 'alt'  → sits on a soft sage band for rhythm
   - 'note' → a short practical note taped up on the wall (parking, which
              door to use) — static, so it never adds motion to a page
   All default off, so existing sections render exactly as before. */
export default function RichText({ data = {} }) {
  const { heading, body_markdown, variant } = data;
  if (variant === 'note') {
    return (
      <section className="section pg-note-section">
        <div className="container">
          <div className="pg-note">
            {heading && <h2 className="pg-note__title">{heading}</h2>}
            <Markdown>{body_markdown}</Markdown>
          </div>
        </div>
      </section>
    );
  }
  const isLead = variant === 'lead';
  const isAlt = variant === 'alt';
  return (
    <Reveal as="section" className={`section richtext ${isLead ? 'richtext--lead' : ''} ${isAlt ? 'section--alt' : ''}`}>
      <div className="container-narrow">
        {isLead && <CoffeeCup className="richtext__motif" size={68} color="var(--color-yellow-deep)" steam={false} />}
        {heading && <h2>{heading}</h2>}
        <div className="prose">
          <Markdown>{body_markdown}</Markdown>
        </div>
        {isLead && <Beans className="richtext__beans" size={72} color="var(--color-green-deep)" />}
      </div>
    </Reveal>
  );
}
