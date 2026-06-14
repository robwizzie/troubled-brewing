import Reveal from '../Reveal.jsx';

export default function ImageBlock({ data = {} }) {
  const { image_url, alt = '', caption } = data;
  if (!image_url) return null;
  return (
    <Reveal as="figure" className="section container-narrow" style={{ margin: '0 auto' }}>
      <img src={image_url} alt={alt} loading="lazy" style={{ borderRadius: 'var(--radius-lg)', width: '100%' }} />
      {caption && <figcaption style={{ color: 'var(--color-text-soft)', marginTop: 'var(--space-2)', textAlign: 'center' }}>{caption}</figcaption>}
    </Reveal>
  );
}
