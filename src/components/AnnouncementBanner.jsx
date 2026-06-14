import { useEffect, useState } from 'react';
import { getContentBlock } from '../lib/dataService.js';

/* Site-wide banner, controlled from admin Quick Blocks (content_blocks.announcement_banner).
   Renders nothing unless enabled with a message. */
export default function AnnouncementBanner() {
  const [block, setBlock] = useState(null);

  useEffect(() => {
    let alive = true;
    getContentBlock('announcement_banner').then((b) => alive && setBlock(b));
    return () => {
      alive = false;
    };
  }, []);

  if (!block || !block.enabled || !block.message) return null;
  return (
    <div className="announce" role="status">
      {block.message}
    </div>
  );
}
