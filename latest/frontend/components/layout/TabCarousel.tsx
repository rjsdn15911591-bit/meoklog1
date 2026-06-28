'use client';

import dynamic from 'next/dynamic';
import { Suspense, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ── 상수 ────────────────────────────────────────────────────────────────────

const TAB_PATHS = ['/camera', '/group', '/analysis', '/ai-coach'];
const SNAP_RATIO  = 0.25;   // 화면 너비의 25% 이상 밀면 탭 전환
const MIN_PX      = 40;     // 최소 픽셀 임계값
const ANIM_MS     = 300;    // 전환 애니메이션 시간 (ms)
const RUBBER      = 0.12;   // 끝 탭에서 추가로 당길 때 저항 계수

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

  // 현재 탭 인덱스 (pathname 기준)
  const getIdx = (p = pathname) =>
    Math.max(0, TAB_PATHS.findIndex(t => p === t));

  // 마운트된 탭 집합 (lazy mount — 방문한 탭만 실제 렌더)
  const [mounted, setMounted] = useState<Set<number>>(
    () => new Set([getIdx()])
  );

  const trackRef  = useRef<HTMLDivElement>(null);
  const startX    = useRef(0);
  const startY    = useRef(0);
  const dragging  = useRef(false);
  const busy      = useRef(false);
  const idxRef    = useRef(getIdx()); // 이벤트 핸들러에서 stale closure 방지

  // ── DOM 헬퍼 ───────────────────────────────────────────────────────────────

  const setX = (x: number, animated: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animated
      ? `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  // ── 경로 변경 시 트랙 위치 동기화 ─────────────────────────────────────────

  useEffect(() => {
    const idx = getIdx();
    idxRef.current = idx;
    setMounted(prev => { const s = new Set(prev); s.add(idx); return s; });
    setX(-idx * window.innerWidth, true); // 탭바 클릭 등 외부 이동 처리
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Non-passive touchmove (preventDefault 사용 필요) ──────────────────────

  useEffect(() => {
    const wrapper = trackRef.current?.parentElement;
    if (!wrapper) return;
    const handler = (e: TouchEvent) => {
      if (!dragging.current || busy.current) return;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      if (dx > dy * 1.2) e.preventDefault(); // 수평 스와이프면 스크롤 차단
    };
    wrapper.addEventListener('touchmove', handler, { passive: false });
    return () => wrapper.removeEventListener('touchmove', handler);
  }, []);

  // ── 터치 핸들러 ───────────────────────────────────────────────────────────

  const onTouchStart = (e: React.TouchEvent) => {
    if (busy.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = false;
    // 진행 중인 애니메이션 중단 (현재 위치에서 바로 따라오게)
    const el = trackRef.current;
    if (el) el.style.transition = 'none';
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (busy.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // 최소 움직임 확인 후 방향 결정
    if (!dragging.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) return; // 세로 스크롤 → 처리 안 함
      dragging.current = true;
    }

    const W   = window.innerWidth;
    const idx = idxRef.current;
    let x = -idx * W + dx;

    // 끝 탭에서 추가로 당길 때 고무줄 효과
    if (x > 0)                          x = dx * RUBBER;
    if (x < -(TAB_PATHS.length - 1) * W) {
      const over = x + (TAB_PATHS.length - 1) * W;
      x = -(TAB_PATHS.length - 1) * W + over * RUBBER;
    }

    // 드래그 방향의 인접 탭을 미리 마운트 (내용이 슬라이드 중 보이게)
    if (dx < -20 && idx < TAB_PATHS.length - 1)
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
    const W   = window.innerWidth;
    const idx = idxRef.current;

    // 임계값 판단: 화면의 25% 혹은 최소 40px 이상
    const threshold = Math.min(W * SNAP_RATIO, W - MIN_PX);
    let newIdx = idx;
    if      (dx < -threshold && idx < TAB_PATHS.length - 1) newIdx = idx + 1;
    else if (dx >  threshold && idx > 0)                    newIdx = idx - 1;

    busy.current = true;
    setX(-newIdx * W, true);

    if (newIdx !== idx) {
      setMounted(prev => { const s = new Set(prev); s.add(newIdx); return s; });
      // replace: 탭 간 이동은 브라우저 히스토리에 쌓지 않음
      router.replace(TAB_PATHS[newIdx]);
    }

    setTimeout(() => { busy.current = false; }, ANIM_MS + 50);
  };

  const onTouchCancel = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setX(-idxRef.current * window.innerWidth, true);
  };

  // ── 초기 transform (SSR 안전: CSS calc 사용) ──────────────────────────────
  const initIdx = getIdx();

  return (
    // 외부: 가로 overflow 클립 (세로 스크롤은 각 슬롯이 담당)
    <div style={{ overflow: 'hidden', width: '100%' }}>
      {/* 트랙: 4개 페이지를 가로로 나열 */}
      <div
        ref={trackRef}
        style={{
          display:    'flex',
          width:      `${TAB_PATHS.length * 100}vw`,
          // calc()는 SSR에서도 동작, mount 후 useEffect가 px 값으로 교체
          transform:  `translateX(calc(${-initIdx} * 100vw))`,
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
              width:      '100vw',
              flexShrink: 0,
              height:     '100dvh',   // 주소창 높이 반영
              overflowY:  'auto',
              overflowX:  'hidden',
              // 탭바 뒤에 컨텐츠가 가려지지 않도록 padding
              paddingBottom: '80px',  // pb-section (tailwind.config: section=80px)
            }}
          >
            {mounted.has(i) ? (
              <Suspense
                fallback={
                  <div style={{ height: '100%', background: '#f9f6f1' }} />
                }
              >
                <Page />
              </Suspense>
            ) : (
              // 아직 방문 안 한 탭: 빈 배경만 (슬라이드 중 보여도 자연스럽게)
              <div style={{ height: '100%', background: '#f9f6f1' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
