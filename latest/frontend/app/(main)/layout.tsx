import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { SwipeNavigator } from '@/components/layout/SwipeNavigator';
import { OnboardingGuard } from '@/components/OnboardingGuard';
import { NotificationScheduler } from '@/components/NotificationScheduler';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SwipeNavigator>
      <div className="pb-section min-h-screen bg-canvas">
        <OnboardingGuard />
        <NotificationScheduler />
        {children}
        <BottomTabBar />
      </div>
    </SwipeNavigator>
  );
}
