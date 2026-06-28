'use client';

import { useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const TAB_PATHS = ['/camera', '/group', '/analysis', '/ai-coach'];

const MIN_SWIPE_DISTANCE = 60;  // px
const DIRECTION_RATIO = 1.5;    // 수평 이동이 수직의 1.5배 이상이어야 탭 전환

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;

    if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;

    const idx = TAB_PATHS.findIndex((p) => pathname.startsWith(p));
    if (idx === -1) return;

    if (dx < 0 && idx < TAB_PATHS.length - 1) {
      router.push(TAB_PATHS[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      router.push(TAB_PATHS[idx - 1]);
    }
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}
