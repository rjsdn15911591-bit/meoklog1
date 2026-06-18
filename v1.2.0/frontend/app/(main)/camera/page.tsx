import { Header } from '@/components/layout/Header';
import { MealUploadForm } from '@/components/meal/MealUploadForm';

export default function CameraPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Header title="먹로그" showSettings lightTitle titleAsHomeLink className="bg-surface-card border-b border-hairline" />
      <main className="pt-xs">
        <MealUploadForm />
      </main>
    </div>
  );
}
