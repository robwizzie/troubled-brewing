import { useEffect, useState } from 'react';
import { getContentBlock } from '../lib/dataService.js';

/* Site-wide banner, controlled from admin Quick Blocks (content_blocks.announcement_banner).
   Renders nothing unless enabled with a message. `fallback` (e.g. the
   rainy-day banner) shows in its place once the block has loaded and is
   off, so the two never stack. */
export default function AnnouncementBanner({ fallback = null }) {
  const [block, setBlock] = useState(null);

  useEffect(() => {
    let alive = true;
    getContentBlock('announcement_banner').then((b) => alive && setBlock(b || {}));
    return () => {
      alive = false;
    };
  }, []);

  if (!block) return null;
  if (!block.enabled || !block.message) return fallback;
  return (
    <div className="announce" role="status">
      {block.message}
    </div>
  );
}
