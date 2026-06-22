'use client';

import { useState } from 'react';
import { PenLine } from 'lucide-react';
import { MealUploadForm } from './MealUploadForm';
import { QuickLogModal } from './QuickLogModal';
import { useQueryClient } from '@tanstack/react-query';

export function CameraPageContent() {
  const [showQuickLog, setShowQuickLog] = useState(false);
  const queryClient = useQueryClient();

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
  };

  return (
    <>
      <MealUploadForm />

      {/* 텍스트 기록 진입 버튼 */}
      <div className="px-md pb-4">
        <button
          onClick={() => setShowQuickLog(true)}
          className="w-full h-11 rounded-xl border border-hairline bg-white text-muted font-kedu text-sm flex items-center justify-center gap-2 active:bg-surface-soft transition-colors"
        >
          <PenLine size={15} />
          사진 없이 텍스트로 기록하기
        </button>
      </div>

      <QuickLogModal
        isOpen={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
