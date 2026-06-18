import { BottomTabBar } from '@/components/layout/BottomTabBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-section min-h-screen bg-canvas">
      {children}
      <BottomTabBar />
    </div>
  );
}
