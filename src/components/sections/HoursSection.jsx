import Reveal from '../Reveal.jsx';
import HoursToday from '../HoursToday.jsx';

export default function HoursSection({ data = {} }) {
  const { heading = 'Hours' } = data;
  return (
    <Reveal as="section" className="section">
      <div className="container" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <h2>{heading}</h2>
        <HoursToday showWeek />
      </div>
    </Reveal>
  );
}
