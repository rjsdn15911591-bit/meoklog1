'use client';

import { useState } from 'react';
import { PenLine } from 'lucide-react';
import { MealUploadForm } from './MealUploadForm';
import { QuickLogModal } from './QuickLogModal';
import { useQueryClient } from '@tanstack/react-query';
import { useMealStore } from '@/store/mealStore';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

export function CameraPageContent() {
  const [showQuickLog, setShowQuickLog] = useState(false);
  const queryClient = useQueryClient();
  const step = useMealStore((s) => s.step);
  const toast = useToast();

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
    toast.show('식사가 기록됐어요!');
  };

  return (
    <>
      <MealUploadForm />

      {/* 구분선 + 텍스트 기록 버튼 — 초기 화면(select)에서만 표시 */}
      {step === 'select' && (
        <div className="px-md pb-6 pt-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-hairline" />
            <span className="font-kedu text-xs text-muted">또는</span>
            <div className="flex-1 h-px bg-hairline" />
          </div>

          <button
            onClick={() => setShowQuickLog(true)}
            className="w-full h-12 rounded-2xl bg-white border border-hairline flex items-center justify-center gap-2 active:bg-surface-soft transition-colors shadow-sm"
          >
            <PenLine size={15} className="text-ink/50" />
            <span className="font-jalnan text-sm text-ink/70">텍스트로 직접 기록하기</span>
          </button>
        </div>
      )}

      <QuickLogModal
        isOpen={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onSaved={handleSaved}
      />
      <Toast visible={toast.visible} message={toast.message} />
    </>
  );
}
