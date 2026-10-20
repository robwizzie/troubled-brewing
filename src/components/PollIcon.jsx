import {
  LuCakeSlice, LuCandy, LuCoffee, LuCookie, LuCroissant, LuCupSoda, LuDonut, LuEgg,
  LuFlame, LuLeaf, LuMilk, LuMoon, LuSandwich, LuSnowflake, LuSun,
} from 'react-icons/lu';

/* The small icon set a poll option can wear (keys in src/lib/polls.js ·
   POLL_ICONS). Shared by the fox's poll card and the admin, so the owner
   picks exactly what visitors see. No emoji. */
const POLL_ICON_COMPONENTS = {
  iced: LuSnowflake,
  cup: LuCupSoda,
  hot: LuCoffee,
  milk: LuMilk,
  leaf: LuLeaf,
  spice: LuFlame,
  croissant: LuCroissant,
  cake: LuCakeSlice,
  cookie: LuCookie,
  bagel: LuDonut,
  sandwich: LuSandwich,
  egg: LuEgg,
  sweet: LuCandy,
  sun: LuSun,
  moon: LuMoon,
};

export default function PollIcon({ id, className }) {
  const Icon = POLL_ICON_COMPONENTS[id];
  return Icon ? <Icon className={className} aria-hidden="true" focusable="false" /> : null;
}
