import Reveal from '../Reveal.jsx';

export default function Gallery({ data = {} }) {
  const { images = [], layout = 'grid' } = data;
  if (!images.length) return null;
  return (
    <Reveal as="section" className="section">
      <div className="container">
        <div className={`gallery gallery--${layout}`}>
          {images.map((img, i) => (
            <img key={i} src={img.url} alt={img.alt || ''} loading="lazy" />
          ))}
        </div>
      </div>
    </Reveal>
  );
}
