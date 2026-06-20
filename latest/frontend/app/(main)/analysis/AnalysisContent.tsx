'use client';

import { useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, ImageDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { DailyAnalysis } from '@/components/analysis/DailyAnalysis';
import { DailySummaryCardModal } from '@/components/analysis/DailySummaryCardModal';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { formatDisplayDate, formatDate } from '@/lib/utils';
import { userApi, mealApi } from '@/lib/api';
import type { DailySummary, MealRecord } from '@/types';

export default function AnalysisContent() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const dateStr = formatDate(date);

  const { data: summary } = useQuery<DailySummary>({
    queryKey: ['daily-summary', dateStr],
    queryFn: async () => {
      const res = await userApi.getDailySummary(dateStr);
      return res.data.data;
    },
    staleTime: 0,
  });

  const { data: mealsData } = useQuery<MealRecord[]>({
    queryKey: ['meals', dateStr],
    queryFn: async () => {
      const res = await mealApi.getByDate(dateStr);
      return res.data.data;
    },
    staleTime: 0,
    enabled: showCard,
  });

  const foods = (mealsData ?? [])
    .flatMap((m) => m.detectedFoods.map((f) => ({
      foodName: f.foodName,
      calories: Math.round(f.calories),
    })))
    .sort((a, b) => b.calories - a.calories);

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
      {showCard && summary && (
        <DailySummaryCardModal
          summary={summary}
          dateLabel={formatDisplayDate(date)}
          foods={foods}
          onClose={() => setShowCard(false)}
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
        {summary && (
          <button
            onClick={() => setShowCard(true)}
            className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-hairline bg-surface-card hover:bg-surface-soft font-kedu text-sm text-cobalt font-bold transition-colors"
          >
            <ImageDown size={16} />
            카드로 저장
          </button>
        )}
        <DailyAnalysis date={date} />
      </main>
    </div>
  );
}
