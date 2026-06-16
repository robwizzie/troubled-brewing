import Markdown from '../Markdown.jsx';
import Reveal from '../Reveal.jsx';
import { CoffeeCup, Beans } from '../Motifs.jsx';

/* Editorial text block. Optional `variant`:
   - 'lead' → centered, larger intro with a coffee-cup motif above the heading
              and a little bean flourish below
   - 'alt'  → sits on a soft sage band for rhythm
   Both default off, so existing sections render exactly as before. */
export default function RichText({ data = {} }) {
  const { heading, body_markdown, variant } = data;
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
