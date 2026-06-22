import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';

const CameraPageContent = dynamic(
  () => import('@/components/meal/CameraPageContent').then((m) => ({ default: m.CameraPageContent })),
  { ssr: false }
);

export default function CameraPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Header title="먹로그" showSettings lightTitle titleAsHomeLink className="bg-surface-card border-b border-hairline" />
      <main className="pt-xs">
        <CameraPageContent />
      </main>
    </div>
  );
}
