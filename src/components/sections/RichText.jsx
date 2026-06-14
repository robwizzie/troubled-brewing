import Markdown from '../Markdown.jsx';
import Reveal from '../Reveal.jsx';

export default function RichText({ data = {} }) {
  const { heading, body_markdown } = data;
  return (
    <Reveal as="section" className="section">
      <div className="container-narrow">
        {heading && <h2>{heading}</h2>}
        <Markdown>{body_markdown}</Markdown>
      </div>
    </Reveal>
  );
}
