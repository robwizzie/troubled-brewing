/* Public renderer registry: section `type` → renderer component.
   To add a section type: build a renderer here, an editor in admin/editors,
   register both, and document in docs/CMS.md. */
import Hero from './Hero.jsx';
import RichText from './RichText.jsx';
import ImageBlock from './ImageBlock.jsx';
import Gallery from './Gallery.jsx';
import MenuBlock from './MenuBlock.jsx';
import HoursSection from './HoursSection.jsx';
import CTA from './CTA.jsx';
import EventsList from './EventsList.jsx';
import CommunityBoard from './CommunityBoard.jsx';
import InstagramFeed from './InstagramFeed.jsx';
import MapSection from './MapSection.jsx';
import Newsletter from './Newsletter.jsx';
import FeaturedDrink from './FeaturedDrink.jsx';
import SignatureDrinks from './SignatureDrinks.jsx';
import SocialProof from './SocialProof.jsx';
import ReviewsHero from './ReviewsHero.jsx';
import TestimonialsWall from './TestimonialsWall.jsx';
import GoogleReviewsFeed from './GoogleReviewsFeed.jsx';
import ReviewCTA from './ReviewCTA.jsx';
import GalleryWallHero from './GalleryWallHero.jsx';
import WarmStorefrontHero from './WarmStorefrontHero.jsx';
import CozyEditorialHero from './CozyEditorialHero.jsx';
import GalleryPiecesGrid from './GalleryPiecesGrid.jsx';
import TroublemakersGrid from './TroublemakersGrid.jsx';
import LocalBusinessesGrid from './LocalBusinessesGrid.jsx';
import TimelineGrid from './TimelineGrid.jsx';
import { FlavorVoting, DrinkSuggestions } from './Stubs.jsx';

export const SECTION_RENDERERS = {
  hero: Hero,
  rich_text: RichText,
  image: ImageBlock,
  gallery: Gallery,
  menu_block: MenuBlock,
  hours: HoursSection,
  cta: CTA,
  events_list: EventsList,
  community_board: CommunityBoard,
  instagram: InstagramFeed,
  map: MapSection,
  newsletter: Newsletter,
  featured_drink: FeaturedDrink,
  signature_drinks: SignatureDrinks,
  social_proof: SocialProof,
  reviews_hero: ReviewsHero,
  testimonials_wall: TestimonialsWall,
  google_reviews_feed: GoogleReviewsFeed,
  review_cta: ReviewCTA,
  gallery_wall_hero: GalleryWallHero,
  warm_storefront_hero: WarmStorefrontHero,
  cozy_editorial_hero: CozyEditorialHero,
  gallery_pieces_grid: GalleryPiecesGrid,
  troublemakers_grid: TroublemakersGrid,
  local_businesses_grid: LocalBusinessesGrid,
  timeline_grid: TimelineGrid,
  // Future stubs (not added to pages in v1)
  flavor_voting: FlavorVoting,
  drink_suggestions: DrinkSuggestions,
};

/* Section types an owner may ADD to a page in the Page Editor. Collection-backed
   and concept heroes are seeded/managed elsewhere, so we keep the add-list to the
   broadly reusable building blocks (build plan §4.4 "add/remove from allowed types"). */
export const ADDABLE_SECTION_TYPES = [
  'hero',
  'rich_text',
  'image',
  'gallery',
  'cta',
  'menu_block',
  'hours',
  'events_list',
  'community_board',
  'instagram',
  'map',
  'newsletter',
  'featured_drink',
  'signature_drinks',
  'social_proof',
  'testimonials_wall',
  'google_reviews_feed',
  'review_cta',
  'gallery_pieces_grid',
  'troublemakers_grid',
  'local_businesses_grid',
  'timeline_grid',
];

export const SECTION_LABELS = {
  hero: 'Hero banner',
  rich_text: 'Text block',
  image: 'Single image',
  gallery: 'Image gallery',
  menu_block: 'Menu',
  hours: 'Hours',
  cta: 'Call-to-action',
  events_list: 'Events list',
  community_board: 'Community board',
  instagram: 'Instagram callout',
  map: 'Map',
  newsletter: 'Newsletter signup',
  featured_drink: 'Featured drink',
  signature_drinks: 'Signature drinks teaser',
  social_proof: 'Social proof (rating + reviews)',
  reviews_hero: 'Reviews hero (rating)',
  testimonials_wall: 'Testimonials wall',
  google_reviews_feed: 'Google reviews feed',
  review_cta: 'Leave-a-review CTA',
  gallery_wall_hero: 'Gallery Wall hero',
  warm_storefront_hero: 'Warm storefront hero',
  cozy_editorial_hero: 'Cozy editorial hero',
  gallery_pieces_grid: 'Gallery pieces',
  troublemakers_grid: 'Troublemakers',
  local_businesses_grid: 'Local businesses',
  timeline_grid: 'TB Timeline',
  flavor_voting: 'Flavor voting (coming soon)',
  drink_suggestions: 'Drink suggestions (coming soon)',
};
