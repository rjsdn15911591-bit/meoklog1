import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { OnboardingGuard } from '@/components/OnboardingGuard';
import { NotificationScheduler } from '@/components/NotificationScheduler';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-section min-h-screen bg-canvas">
      <OnboardingGuard />
      <NotificationScheduler />
      {children}
      <BottomTabBar />
    </div>
  );
}
