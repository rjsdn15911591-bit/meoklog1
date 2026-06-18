'use client';

import { useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { DailyAnalysis } from '@/components/analysis/DailyAnalysis';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { formatDisplayDate } from '@/lib/utils';

export default function AnalysisContent() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="분석" showSettings />
      {showPicker && (
        <DatePickerModal
          value={date}
          onChange={setDate}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="flex items-center justify-between px-md py-xs border-b border-hairline-soft">
        <button
          onClick={() => setDate((d) => subDays(d, 1))}
          className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setShowPicker(true)}
          className="font-jalnan text-base text-ink hover:text-cobalt transition-colors px-2 py-1 rounded-lg hover:bg-surface-soft"
        >
          {formatDisplayDate(date)}
        </button>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"
          disabled={date >= new Date()}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <main className="px-md pb-lg pt-sm">
        <DailyAnalysis date={date} />
      </main>
    </div>
  );
}
