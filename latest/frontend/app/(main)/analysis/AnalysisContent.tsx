'use client';

import { useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, ImageDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { DailyAnalysis } from '@/components/analysis/DailyAnalysis';
import { WeeklyTrendChart } from '@/components/analysis/WeeklyTrendChart';
import { WeightTracker } from '@/components/analysis/WeightTracker';
import { MonthlyStats } from '@/components/analysis/MonthlyStats';
import { DailySummaryCardModal } from '@/components/analysis/DailySummaryCardModal';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { formatDisplayDate, formatDate } from '@/lib/utils';
import { userApi, mealApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DailySummary, DailyLogData } from '@/types';

type ViewMode = 'daily' | 'weekly' | 'weight' | 'monthly';

export default function AnalysisContent() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const dateStr = formatDate(date);

  const { data: summary } = useQuery<DailySummary>({
    queryKey: ['daily-summary', dateStr],
    queryFn: async () => {
      const res = await userApi.getDailySummary(dateStr);
      return res.data.data;
    },
    staleTime: 0,
  });

  const { data: mealsData } = useQuery<DailyLogData>({
    queryKey: ['meals', dateStr],
    queryFn: async () => {
      const res = await mealApi.getByDate(dateStr);
      return res.data.data;
    },
    staleTime: 0,
    enabled: showCard,
  });

  const foods = (mealsData?.meals ?? [])
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

      {/* 탭 */}
      <div className="flex px-md pt-xs gap-1.5">
        {([
          ['daily', '일별'],
          ['weekly', '주간'],
          ['monthly', '월간'],
          ['weight', '체중'],
        ] as [ViewMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'flex-1 h-9 rounded-xl font-kedu font-bold text-sm transition-colors',
              viewMode === mode
                ? 'bg-cobalt text-white'
                : 'bg-surface-soft text-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 날짜 네비게이터 (일별·주간만) */}
      {(viewMode === 'daily' || viewMode === 'weekly') && (
        <div className="flex items-center justify-between px-md py-xs border-b border-hairline-soft">
          <button
            onClick={() => setDate((d) => subDays(d, viewMode === 'daily' ? 1 : 7))}
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
            onClick={() => setDate((d) => addDays(d, viewMode === 'daily' ? 1 : 7))}
            className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"
            disabled={date >= new Date()}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <main className="px-md pb-lg pt-sm">
        {viewMode === 'daily' && (
          <>
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
          </>
        )}
        {viewMode === 'weekly' && (
          <div className="bg-surface-card rounded-xl border border-hairline p-4">
            <p className="font-myeong font-bold text-xs text-muted uppercase tracking-wide mb-4">
              최근 7일 칼로리
            </p>
            <WeeklyTrendChart baseDate={date} days={7} />
          </div>
        )}
        {viewMode === 'weight' && <WeightTracker />}
        {viewMode === 'monthly' && <MonthlyStats />}
      </main>
    </div>
  );
}
