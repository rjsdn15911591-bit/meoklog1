'use client';

import dynamic from 'next/dynamic';
import { Suspense, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ── 상수 ─────────────────────────────────────────────────────────────────────

const TAB_PATHS  = ['/camera', '/group', '/analysis', '/ai-coach'];
const N          = TAB_PATHS.length;
const SNAP_RATIO = 0.25;
const MIN_PX     = 40;
const ANIM_MS    = 300;
const RUBBER     = 0.12;

// ── 탭 페이지 ─────────────────────────────────────────────────────────────────

const PAGES = [
  dynamic(() => import('@/app/(main)/camera/page'),    { ssr: false }),
  dynamic(() => import('@/app/(main)/group/page'),     { ssr: false }),
  dynamic(() => import('@/app/(main)/analysis/page'),  { ssr: false }),
  dynamic(() => import('@/app/(main)/ai-coach/page'),  { ssr: false }),
];

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function TabCarousel() {
  const pathname = usePathname();
  const router   = useRouter();

  const pathToIdx = (p: string) =>
    Math.max(0, TAB_PATHS.findIndex(t => t === p));

  // ─── activeIdxRef: 현재 캐러셀이 보여주는 탭의 인덱스 ───────────────────
  // pathname 기반 getIdx() 와 분리: 스와이프 중에는 router.replace 를 쓰지 않으므로
  // usePathname() 이 아직 안 바뀐 상태에서도 올바른 위치를 추적해야 함.
  const activeIdxRef = useRef(pathToIdx(pathname));

  const [mounted, setMounted] = useState<Set<number>>(
    () => new Set([activeIdxRef.current])
  );

  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX   = useRef(0);
  const startY   = useRef(0);
  const dragging = useRef(false);
  const busy     = useRef(false);

  const getW = () => outerRef.current?.offsetWidth ?? window.innerWidth;

  // ── DOM transform 헬퍼 ────────────────────────────────────────────────────

  const setX = (x: number, animated: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animated
      ? `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  // ── 뒤로 가기 차단 (popstate 트랩) ──────────────────────────────────────
  // 탭 캐러셀 안에서는 브라우저 뒤로가기·스와이프백 제스처를 완전히 무력화.
  // "더미 상태"를 히스토리에 추가해두고, popstate 가 발생하면 즉시 다시 push 해
  // 실제 페이지 이탈 없이 현재 탭에 머문다.

  useEffect(() => {
    // 더미 상태 push → 이 상태가 "뒤로 가면 소비될" 완충재 역할
    history.pushState({ meoklogTabs: true }, '', window.location.href);

    const onPopState = () => {
      // 사용자가 뒤로 가려 할 때마다 현재 탭 상태를 다시 push
      history.pushState(
        { meoklogTabs: true },
        '',
        TAB_PATHS[activeIdxRef.current],
      );
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회

  // ── pathname 변경 감지 (탭바 클릭 · 직접 URL 접근) ───────────────────────
  // 스와이프는 router.replace 를 쓰지 않으므로 여기서는 외부 내비게이션만 처리됨

  useEffect(() => {
    const idx = pathToIdx(pathname);
    activeIdxRef.current = idx;
    setMounted(prev => { const s = new Set(prev); s.add(idx); return s; });
    setX(-idx * getW(), true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Non-passive touchmove (수평 스와이프 중 페이지 스크롤 방지) ──────────

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

  // ── 터치 이벤트 ──────────────────────────────────────────────────────────

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
    const idx = activeIdxRef.current; // pathname 아닌 자체 추적값 사용
    let x = -idx * W + dx;

    if (x > 0)             x = dx * RUBBER;
    if (x < -(N - 1) * W) {
      const over = x + (N - 1) * W;
      x = -(N - 1) * W + over * RUBBER;
    }

    // 드래그 방향의 인접 탭 미리 마운트
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
    const idx = activeIdxRef.current;

    const threshold = Math.min(W * SNAP_RATIO, W - MIN_PX);
    let newIdx = idx;
    if      (dx < -threshold && idx < N - 1) newIdx = idx + 1;
    else if (dx >  threshold && idx > 0)     newIdx = idx - 1;

    busy.current = true;
    activeIdxRef.current = newIdx; // 즉시 업데이트 (다음 스와이프 계산 기준)
    setX(-newIdx * W, true);

    if (newIdx !== idx) {
      setMounted(prev => { const s = new Set(prev); s.add(newIdx); return s; });

      // ★ router.replace() 대신 history.replaceState() 사용
      // router.replace 는 Next.js 미들웨어(세션 체크 등)를 타서 로그인 리디렉션 유발.
      // history.replaceState 는 URL 바만 바꾸고 라우팅·미들웨어를 전혀 거치지 않음.
      window.history.replaceState(null, '', TAB_PATHS[newIdx]);
    }

    setTimeout(() => { busy.current = false; }, ANIM_MS + 50);
  };

  const onTouchCancel = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setX(-activeIdxRef.current * getW(), true);
  };

  const initIdx = pathToIdx(pathname);

  return (
    <div
      ref={outerRef}
      className="w-full max-w-[480px] mx-auto"
      style={{
        overflow: 'hidden',
        touchAction: 'pan-y', // 브라우저 수평 제스처(뒤로가기 등) 차단
      }}
    >
      <div
        ref={trackRef}
        style={{
          display:    'flex',
          width:      `${N * 100}%`,
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
              width:         `${100 / N}%`,
              flexShrink:    0,
              height:        '100dvh',
              overflowY:     'auto',
              overflowX:     'hidden',
              paddingBottom: '80px',
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
