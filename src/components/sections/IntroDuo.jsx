import Markdown from '../Markdown.jsx';
import Reveal from '../Reveal.jsx';
import BrandImg from '../BrandImg.jsx';
import { BRAND } from '../../lib/config.js';
import { CoffeeCup, FoxEmblem } from '../Motifs.jsx';

/* A balanced two-column "what we're about" block — pairs what we make with who
   we are, each under a small brand motif, split by a hairline divider. Reads as
   one intentional unit instead of two stacked text blocks. Editable in admin. */
export default function IntroDuo({ data = {} }) {
  const { heading_a, body_a, heading_b, body_b } = data;
  return (
    <Reveal as="section" className="section intro-duo">
      <div className="container">
        <div className="intro-duo__grid">
          <article className="intro-duo__item">
            <CoffeeCup className="intro-duo__icon" size={52} color="var(--color-yellow-deep)" steam={false} />
            {heading_a && <h2>{heading_a}</h2>}
            <div className="prose"><Markdown>{body_a}</Markdown></div>
          </article>
          <article className="intro-duo__item">
            <BrandImg src={BRAND.foxHead} alt="" aria-hidden="true" loading="lazy" className="intro-duo__icon intro-duo__fox" fallback={<FoxEmblem size={56} />} />
            {heading_b && <h2>{heading_b}</h2>}
            <div className="prose"><Markdown>{body_b}</Markdown></div>
          </article>
        </div>
      </div>
    </Reveal>
  );
}
