'use client';

import { useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, ImageDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { DailyAnalysis } from '@/components/analysis/DailyAnalysis';
import { WeeklyTrendChart } from '@/components/analysis/WeeklyTrendChart';
import { MonthlyStats } from '@/components/analysis/MonthlyStats';
import { DailySummaryCardModal } from '@/components/analysis/DailySummaryCardModal';
import { ExerciseAnalysis } from '@/components/analysis/ExerciseAnalysis';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { formatDisplayDate, formatDate } from '@/lib/utils';
import { userApi, mealApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { DailySummary, DailyLogData } from '@/types';

type AnalysisMode = 'diet' | 'exercise';
type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function AnalysisContent() {
  const { user } = useAuthStore();
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('diet');
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

      {/* 분석 모드 토글 */}
      <div className="flex px-md pt-xs gap-2">
        {([
          ['diet',     '🍽️ 식단 분석'],
          ['exercise', '🏃 운동 분석'],
        ] as [AnalysisMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setAnalysisMode(mode)}
            className={cn(
              'flex-1 h-10 rounded-xl font-kedu font-bold text-sm transition-colors',
              analysisMode === mode
                ? 'bg-cobalt text-white'
                : 'bg-surface-soft text-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 식단 분석: 일별·주간·월간 탭 */}
      {analysisMode === 'diet' && (
      <div className="flex px-md pt-xs gap-1.5">
        {([
          ['daily', '일별'],
          ['weekly', '주간'],
          ['monthly', '월간'],
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
      )}

      {/* 날짜 네비게이터 (식단·일별·주간만) */}
      {analysisMode === 'diet' && (viewMode === 'daily' || viewMode === 'weekly') && (
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
        {/* 식단 분석 */}
        {analysisMode === 'diet' && viewMode === 'daily' && (
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
        {analysisMode === 'diet' && viewMode === 'weekly' && (
          <div className="bg-surface-card rounded-xl border border-hairline p-4">
            <p className="font-myeong font-bold text-xs text-muted uppercase tracking-wide mb-4">
              최근 7일 칼로리
            </p>
            <WeeklyTrendChart baseDate={date} days={7} />
          </div>
        )}
        {analysisMode === 'diet' && viewMode === 'monthly' && <MonthlyStats />}

        {/* 운동 분석 */}
        {analysisMode === 'exercise' && (
          <ExerciseAnalysis weight={user?.weight ?? 70} />
        )}
      </main>
    </div>
  );
}
