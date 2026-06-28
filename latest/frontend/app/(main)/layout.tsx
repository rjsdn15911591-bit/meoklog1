'use client';

import { usePathname } from 'next/navigation';
import { TabCarousel } from '@/components/layout/TabCarousel';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { OnboardingGuard } from '@/components/OnboardingGuard';
import { NotificationScheduler } from '@/components/NotificationScheduler';

// 이 경로들은 TabCarousel이 직접 렌더한다 (layout의 {children} 사용 안 함)
const TAB_ROUTES = new Set(['/camera', '/group', '/analysis', '/ai-coach']);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTab = TAB_ROUTES.has(pathname);

  return (
    <>
      <OnboardingGuard />
      <NotificationScheduler />

      {isTab ? (
        // 탭 화면: 4개 페이지를 가로 캐러셀로 표시
        <TabCarousel />
      ) : (
        // 서브 화면 (그룹 상세, 식사 상세 등): 일반 Next.js 라우팅
        <div className="pb-section min-h-screen bg-canvas">
          {children}
        </div>
      )}

      <BottomTabBar />
    </>
  );
}
