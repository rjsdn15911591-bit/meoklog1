'use client';

import { useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const TAB_PATHS = ['/camera', '/group', '/analysis', '/ai-coach'];
const THRESHOLD = 60;   // 이 이상 밀어야 탭 전환
const ANIM_MS   = 260;  // 슬라이드 애니메이션 시간

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  // 애니메이션 대상 div (내부 — 실제로 움직이는 레이어)
  const innerRef  = useRef<HTMLDivElement>(null);
  const startX    = useRef(0);
  const startY    = useRef(0);
  const dragging  = useRef(false);
  const busy      = useRef(false);
  // 이벤트 핸들러가 stale closure에서 pathname을 쓰지 않도록 ref로 관리
  const pathRef   = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  // ---------- DOM 헬퍼 ----------
  const applyTransform = (x: number, animated: boolean) => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animated
      ? `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'none';
    el.style.transform = x === 0 ? '' : `translateX(${x}px)`;
  };

  // touchmove를 non-passive로 등록해야 preventDefault() 가 동작
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (!dragging.current || busy.current) return;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      // 수평이 수직보다 명확히 크면 스크롤 막음
      if (dx > dy * 1.2) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  // ---------- 터치 이벤트 ----------
  const onTouchStart = (e: React.TouchEvent) => {
    if (busy.current) return;
    startX.current  = e.touches[0].clientX;
    startY.current  = e.touches[0].clientY;
    dragging.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (busy.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // 방향이 아직 결정 안 됐을 때
    if (!dragging.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) return; // 세로 스크롤이면 무시
      dragging.current = true;
    }

    const idx    = TAB_PATHS.findIndex(p => pathRef.current.startsWith(p));
    const atLeft = idx <= 0;
    const atRight= idx >= TAB_PATHS.length - 1;

    // 끝 탭에서 더 밀면 고무줄 효과 (12%)
    const clamped = (atLeft && dx > 0) || (atRight && dx < 0) ? dx * 0.12 : dx;
    applyTransform(clamped, false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current || busy.current) {
      dragging.current = false;
      return;
    }
    dragging.current = false;

    const dx  = e.changedTouches[0].clientX - startX.current;
    const idx = TAB_PATHS.findIndex(p => pathRef.current.startsWith(p));

    let next: string | null = null;
    if (dx < -THRESHOLD && idx < TAB_PATHS.length - 1) next = TAB_PATHS[idx + 1];
    else if (dx > THRESHOLD && idx > 0)                next = TAB_PATHS[idx - 1];

    // 임계값 미달 → 원위치로 스프링백
    if (!next) { applyTransform(0, true); return; }

    busy.current = true;
    const W      = window.innerWidth;
    const exitX  = dx < 0 ? -W : W;   // 현재 페이지가 나가는 방향
    const enterX = -exitX;             // 새 페이지가 들어오는 방향 (반대)
    const target = next;

    // ① 현재 페이지 밀어내기
    applyTransform(exitX, true);

    setTimeout(() => {
      // ② 라우팅
      router.push(target);

      requestAnimationFrame(() => {
        // ③ 새 페이지가 렌더된 직후 — 반대편 끝으로 순간이동 (애니 없음)
        applyTransform(enterX, false);
        innerRef.current?.getBoundingClientRect(); // 강제 리플로우

        // ④ 중앙으로 슬라이드 인
        requestAnimationFrame(() => {
          applyTransform(0, true);
          setTimeout(() => { busy.current = false; }, ANIM_MS);
        });
      });
    }, ANIM_MS);
  };

  const onTouchCancel = () => {
    dragging.current = false;
    applyTransform(0, true);
  };

  return (
    // 외부 div: 넘치는 화면을 clip (overflow hidden)
    // — position:fixed 요소(탭바·모달)는 clip 안 됨
    <div style={{ overflow: 'hidden' }}>
      {/* 내부 div: 실제 transform 대상 */}
      <div
        ref={innerRef}
        style={{ willChange: 'transform' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {children}
      </div>
    </div>
  );
}
