import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';

/* Landing concept #2: photography-led. Big inviting shot of the space, warm
   headline, hours-today, and the Order CTA. Swap in via Quick Blocks. */
export default function WarmStorefrontHero({ data = {} }) {
  const {
    heading = 'Your neighborhood coffee shop',
    subheading = 'La Colombe coffee, fresh food, and a room that feels like home.',
    background_image_url,
  } = data;

  return (
    <section
      className={`hero ${background_image_url ? 'hero--image' : ''}`}
      style={background_image_url ? { backgroundImage: `url(${background_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '70vh', display: 'grid', placeItems: 'center' } : { minHeight: '60vh', display: 'grid', placeItems: 'center' }}
    >
      <div className="container">
        <p className="eyebrow">Haddon Heights, NJ</p>
        <h1>{heading}</h1>
        <p className="hero__sub">{subheading}</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap', margin: 'var(--space-5) 0' }}>
          <OrderButton label="Order Now" className="btn btn--accent btn--lg" location="hero" />
          <Link className="btn btn--ghost btn--lg" to="/menu">See the menu</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HoursToday />
        </div>
      </div>
    </section>
  );
}
