import Reveal from '../Reveal.jsx';
import HoursToday from '../HoursToday.jsx';

export default function HoursSection({ data = {} }) {
  const { heading = 'Hours', intro = '' } = data;
  return (
    <Reveal as="section" className="section">
      <div className="container" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <h2>{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {/* the week reads off a letterboard sign, like the one over the counter */}
        <div className="hours-sign">
          <p className="hours-sign__label">This week</p>
          <HoursToday showWeek />
        </div>
      </div>
    </Reveal>
  );
}
