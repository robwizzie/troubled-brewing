import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import OrderButton from '../OrderButton.jsx';
import BrandImg from '../BrandImg.jsx';
import HoursToday from '../HoursToday.jsx';
import { BRAND, asset } from '../../lib/config.js';
import { track } from '../../lib/analytics.js';

const FALLBACK_LINKS = [
  { label: 'Coffee Menu', link: '/menu', image_url: 'images/wall/flank-coffee.jpg' },
  { label: 'Bakery Menu', link: '/menu#bakery', image_url: 'images/wall/flank-food.jpg' },
  { label: 'Our Story', link: '/about', image_url: 'images/wall/our-story-so-far.jpg' },
  { label: 'Events', link: '/events', image_url: 'images/wall/gallery-wall.jpg' },
  { label: 'Visit Us', link: '/location', image_url: 'images/wall/order-menu.jpg' },
  { label: 'Community', link: '/community', image_url: 'images/wall/flank-food.jpg' },
];

const FRAME_CLASSES = ['gilt', 'black', 'oval', 'gold', 'black', 'gilt'];

function resolveAsset(src) {
  if (!src) return '';
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('/')) return src;
  return asset(src);
}

export default function GalleryWallHero({ data = {} }) {
  const root = useRef(null);
  const scene = useRef(null);
  const {
    heading = 'Trouble Brewing',
    subheading = 'Good coffee. Good food. Good company.',
    specials_label: specialsLabel = "Today's specials",
    specials_link: specialsLink = '/menu#specials',
    frames = [],
  } = data;

  const links = (frames.length ? frames : FALLBACK_LINKS).slice(0, 6);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches || !root.current) return undefined;

    const ctx = gsap.context(() => {
      gsap.from('.immersive-hero__brand > *', {
        opacity: 0,
        y: 22,
        duration: 0.8,
        stagger: 0.09,
        ease: 'power3.out',
      });
      gsap.from('.immersive-frame', {
        opacity: 0,
        y: 38,
        rotation: (i) => (i % 2 ? 3 : -3),
        scale: 0.92,
        duration: 0.75,
        stagger: 0.08,
        delay: 0.2,
        ease: 'back.out(1.35)',
        clearProps: 'transform',
      });
    }, root);

    const onMove = (event) => {
      if (!scene.current || window.innerWidth < 900) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 12;
      const y = (event.clientY / window.innerHeight - 0.5) * 8;
      gsap.to(scene.current, { x, y, duration: 1.2, ease: 'power2.out' });
      gsap.to('.immersive-hero__glow', { x: x * 1.8, y: y * 1.8, duration: 1.5, ease: 'power2.out' });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      ctx.revert();
    };
  }, []);

  return (
    <section className="immersive-hero" ref={root} aria-labelledby="immersive-title">
      <div className="immersive-hero__scene" ref={scene} aria-hidden="true" />
      <div className="immersive-hero__shade" aria-hidden="true" />
      <div className="immersive-hero__glow" aria-hidden="true" />

      <div className="immersive-hero__topline">
        <BrandImg src={BRAND.logoFox} alt="Trouble Brewing Coffee House" className="immersive-hero__logo" />
        <p>{subheading}</p>
        <OrderButton label="Order Ahead" className="immersive-order" location="immersive-hero" />
      </div>

      <div className="immersive-hero__content">
        <div className="immersive-hero__brand">
          <p className="immersive-hero__eyebrow">Welcome to</p>
          <h1 id="immersive-title">{heading}</h1>
          <p className="immersive-hero__descriptor">Coffee House &amp; Bakery</p>
          <p className="immersive-hero__location">Haddon Heights, New Jersey</p>
          <div className="immersive-hero__actions">
            <Link className="immersive-btn immersive-btn--light" to="/menu">View the menu</Link>
            <OrderButton label="Order online" className="immersive-btn immersive-btn--outline" location="immersive-hero-main" />
          </div>
          <div className="immersive-hero__status">
            <HoursToday />
            {specialsLink && specialsLabel && (
              <Link to={specialsLink} onClick={() => track('specials_click', { location: 'immersive-hero' })}>
                {specialsLabel} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>

        <nav className="immersive-gallery" aria-label="Explore Trouble Brewing">
          {links.map((item, index) => {
            const internal = item.link?.startsWith('/');
            const body = (
              <>
                <img src={resolveAsset(item.image_url)} alt="" loading={index < 3 ? 'eager' : 'lazy'} />
                <span className="immersive-frame__veil" />
                <span className="immersive-frame__label">{item.label}<b aria-hidden="true">→</b></span>
              </>
            );
            const className = `immersive-frame immersive-frame--${FRAME_CLASSES[index]}`;
            return internal ? (
              <Link key={`${item.label}-${index}`} to={item.link} className={className} aria-label={item.label}>{body}</Link>
            ) : (
              <a key={`${item.label}-${index}`} href={item.link || '#'} className={className} aria-label={item.label}>{body}</a>
            );
          })}
          <BrandImg src={BRAND.foxHead} alt="" className="immersive-gallery__fox" />
          <BrandImg src={BRAND.rabbitHead} alt="" className="immersive-gallery__rabbit" />
        </nav>
      </div>

      <div className="immersive-hero__scroll" aria-hidden="true"><span /> Explore the wall</div>
    </section>
  );
}
