'use client';

import dynamic from 'next/dynamic';
import { Suspense, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ── 상수 ────────────────────────────────────────────────────────────────────

const TAB_PATHS  = ['/camera', '/group', '/analysis', '/ai-coach'];
const N          = TAB_PATHS.length;
const SNAP_RATIO = 0.25;  // 컨테이너 너비의 25% 이상 밀면 탭 전환
const MIN_PX     = 40;
const ANIM_MS    = 300;
const RUBBER     = 0.12;

// ── 탭 페이지 (dynamic import, SSR 없음) ────────────────────────────────────

const PAGES = [
  dynamic(() => import('@/app/(main)/camera/page'),    { ssr: false }),
  dynamic(() => import('@/app/(main)/group/page'),     { ssr: false }),
  dynamic(() => import('@/app/(main)/analysis/page'),  { ssr: false }),
  dynamic(() => import('@/app/(main)/ai-coach/page'),  { ssr: false }),
];

// ── 컴포넌트 ────────────────────────────────────────────────────────────────

export function TabCarousel() {
  const pathname = usePathname();
  const router   = useRouter();

  const getIdx = (p = pathname) =>
    Math.max(0, TAB_PATHS.findIndex(t => p === t));

  const [mounted, setMounted] = useState<Set<number>>(
    () => new Set([getIdx()])
  );

  // outerRef: max-w-[480px] 컨테이너 — 이 너비를 슬라이드 단위로 사용
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX   = useRef(0);
  const startY   = useRef(0);
  const dragging = useRef(false);
  const busy     = useRef(false);
  const idxRef   = useRef(getIdx());

  // 컨테이너 실제 픽셀 너비 (100vw 가 아닌 앱 컨테이너 너비)
  const getW = () => outerRef.current?.offsetWidth ?? window.innerWidth;

  // ── DOM 헬퍼 ───────────────────────────────────────────────────────────────

  const setX = (x: number, animated: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animated
      ? `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  // ── 경로 변경 시 트랙 위치 동기화 (탭바 클릭 등) ─────────────────────────

  useEffect(() => {
    const idx = getIdx();
    idxRef.current = idx;
    setMounted(prev => { const s = new Set(prev); s.add(idx); return s; });
    setX(-idx * getW(), true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Non-passive touchmove ─────────────────────────────────────────────────

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      if (!dragging.current || busy.current) return;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      if (dx > dy * 1.2) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  // ── 터치 핸들러 ───────────────────────────────────────────────────────────

  const onTouchStart = (e: React.TouchEvent) => {
    if (busy.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = false;
    const el = trackRef.current;
    if (el) el.style.transition = 'none';
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (busy.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!dragging.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      dragging.current = true;
    }

    const W   = getW();
    const idx = idxRef.current;
    let x = -idx * W + dx;

    if (x > 0)                  x = dx * RUBBER;
    if (x < -(N - 1) * W) {
      const over = x + (N - 1) * W;
      x = -(N - 1) * W + over * RUBBER;
    }

    if (dx < -20 && idx < N - 1)
      setMounted(prev => { const s = new Set(prev); s.add(idx + 1); return s; });
    if (dx >  20 && idx > 0)
      setMounted(prev => { const s = new Set(prev); s.add(idx - 1); return s; });

    setX(x, false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current || busy.current) {
      dragging.current = false;
      return;
    }
    dragging.current = false;

    const dx  = e.changedTouches[0].clientX - startX.current;
    const W   = getW();
    const idx = idxRef.current;

    const threshold = Math.min(W * SNAP_RATIO, W - MIN_PX);
    let newIdx = idx;
    if      (dx < -threshold && idx < N - 1) newIdx = idx + 1;
    else if (dx >  threshold && idx > 0)     newIdx = idx - 1;

    busy.current = true;
    setX(-newIdx * W, true);

    if (newIdx !== idx) {
      setMounted(prev => { const s = new Set(prev); s.add(newIdx); return s; });
      router.replace(TAB_PATHS[newIdx]);
    }

    setTimeout(() => { busy.current = false; }, ANIM_MS + 50);
  };

  const onTouchCancel = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setX(-idxRef.current * getW(), true);
  };

  // ── 초기 transform: % 기준 (SSR 안전 — outerRef 너비 모를 때도 동작)
  // track 너비 = N * 100% of outer, 각 슬롯 = 100% of outer = 1/N of track
  // translateX(x%) = x% of track → -idx * (100/N)% = -idx * outerWidth
  const initIdx = getIdx();

  return (
    // 앱 폰 비율 컨테이너 (BottomTabBar 와 동일한 max-w)
    <div
      ref={outerRef}
      className="w-full max-w-[480px] mx-auto"
      style={{
        overflow: 'hidden',
        // 브라우저 기본 수평 스와이프 제스처(뒤로가기 등) 차단
        // 수직 스크롤은 각 슬롯이 담당하므로 pan-y 만 허용
        touchAction: 'pan-y',
      }}
    >
      {/* 트랙: N개 슬롯을 가로로 배치 */}
      <div
        ref={trackRef}
        style={{
          display:    'flex',
          // N * 100% of outerRef → 각 슬롯 = 100% of outerRef
          width:      `${N * 100}%`,
          // % 기반 초기 위치 (SSR 안전)
          // translateX(x%) = x% of this element's own width
          // 원하는 이동량: -idx * outerWidth = -idx * (trackWidth / N)
          // → translateX(-idx * 100/N %)
          transform:  `translateX(${-initIdx * (100 / N)}%)`,
          willChange: 'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {PAGES.map((Page, i) => (
          <div
            key={i}
            style={{
              // 1/N of track = 100% of outerRef
              width:      `${100 / N}%`,
              flexShrink: 0,
              height:     '100dvh',
              overflowY:  'auto',
              overflowX:  'hidden',
              paddingBottom: '80px', // pb-section: 탭바 64px + 여유
            }}
          >
            {mounted.has(i) ? (
              <Suspense fallback={<div style={{ height: '100%', background: '#f9f6f1' }} />}>
                <Page />
              </Suspense>
            ) : (
              <div style={{ height: '100%', background: '#f9f6f1' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
