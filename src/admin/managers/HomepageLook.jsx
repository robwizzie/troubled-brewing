import { LuPanelsTopLeft } from 'react-icons/lu';
import { Spinner } from '../components/ui.jsx';
import { ScreenHead } from '../lib/publishing.jsx';
import { useBlockDraft } from '../lib/useBlockDraft.js';
import { CONCEPTS, DEFAULT_CONCEPT } from '../../lib/concepts.js';
import ConceptPicker from '../components/ConceptPicker.jsx';

/* Homepage look: pick one of the homepage styles, preview it full-size
   (desktop or phone) before anything is saved, then Publish. Choosing only
   stages it — the shared Publish bar is the one thing that writes
   content_blocks.homepage_concept. */

const labelOf = (v) => CONCEPTS.find((c) => c.value === v)?.label || v;

export default function HomepageLook() {
  const look = useBlockDraft('homepage_concept', { concept: DEFAULT_CONCEPT }, { label: 'the homepage look' });
  if (!look.loaded) return <Spinner />;

  const staged = look.value.concept;
  const live = look.saved.concept;
  const step = look.dirty ? 3 : 1;

  return (
    <div className="lookscreen">
      <ScreenHead
        icon={LuPanelsTopLeft}
        title="Homepage look"
        help="Choose the style for the top of your homepage. Preview any look full-size first — nothing changes on the website until you press Publish."
      />

      <ol className="steps" aria-label="How it works">
        <li className={step === 1 ? 'is-current' : 'is-done'}><span className="steps__n">1</span><span><strong>Pick</strong> a look you like</span></li>
        <li className={step === 1 ? '' : 'is-done'}><span className="steps__n">2</span><span><strong>Preview</strong> it on a computer or phone</span></li>
        <li className={step === 3 ? 'is-current' : ''}><span className="steps__n">3</span><span><strong>Publish</strong> to put it live</span></li>
      </ol>

      <section className="admin__panel lookscreen__now">
        <p className="lookscreen__line">
          {look.dirty ? (
            <>You’ve chosen <strong>{labelOf(staged)}</strong>. The website still shows the old look until you press <strong>Publish</strong> below.</>
          ) : (
            <>Your homepage uses <strong>{labelOf(live)}</strong> right now. Tap a picture or <strong>Preview</strong> to see a look full-size.</>
          )}
        </p>
      </section>

      <ConceptPicker
        value={staged}
        live={live}
        onChoose={(v) => look.set({ ...look.value, concept: v })}
      />
    </div>
  );
}
