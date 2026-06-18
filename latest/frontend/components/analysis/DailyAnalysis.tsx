'use client';

import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { formatDate, calculateBMI, getBMICategory, formatCalories, cn } from '@/lib/utils';
import { NutritionDetail } from '@/components/meal/NutritionDetail';
import { NutritionChart } from './NutritionChart';
import type { DailySummary } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

const BREAKDOWN_META: Record<string, { label: string; dot: string; emoji: string }> = {
  breakfast: { label: '아침', dot: 'bg-peach',  emoji: '🌅' },
  lunch:     { label: '점심', dot: 'bg-ochre',  emoji: '☀️' },
  dinner:    { label: '저녁', dot: 'bg-cobalt', emoji: '🌙' },
  snack:     { label: '간식', dot: 'bg-sage',   emoji: '🍪' },
};

interface DailyAnalysisProps {
  date: Date;
}

export function DailyAnalysis({ date }: DailyAnalysisProps) {
  const dateStr = formatDate(date);
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useQuery<DailySummary>({
    queryKey: ['daily-summary', dateStr],
    queryFn: async () => {
      const res = await userApi.getDailySummary(dateStr);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const bmi =
    user?.height && user?.weight ? calculateBMI(user.weight, user.height) : null;
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-cobalt" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-muted">
        <span className="text-4xl block mb-3">😵</span>
        <p className="font-kedu">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  const summary = data;
  const rate = summary?.achievementRate ?? 0;

  let accentBg = 'bg-sage';
  let accentText = 'text-white';
  if (rate >= 110) { accentBg = 'bg-coral'; accentText = 'text-white'; }
  else if (rate >= 100) { accentBg = 'bg-cobalt'; accentText = 'text-white'; }
  else if (rate >= 80) { accentBg = 'bg-ochre'; accentText = 'text-ink'; }

  return (
    <div className="space-y-4">
      {bmi && (
        <div className="bg-surface-card rounded-xl border border-hairline p-4">
          <p className="font-myeong font-bold text-xs text-muted uppercase tracking-wide mb-2">
            BMI 지수
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-myeong text-sm text-muted">
                키 {user?.height}cm · 몸무게 {user?.weight}kg
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-myeong font-extrabold text-3xl text-ink">{bmi}</span>
                <span
                  className={cn(
                    'font-kedu text-sm px-2 py-0.5 rounded-pill',
                    bmi < 18.5
                      ? 'bg-teal text-ink'
                      : bmi < 23
                      ? 'bg-sage text-white'
                      : bmi < 25
                      ? 'bg-ochre text-ink'
                      : 'bg-coral text-white'
                  )}
                >
                  {bmiCategory}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <>
          <div className={cn('rounded-xl p-4', accentBg)}>
            <p className={cn('font-myeong font-bold text-xs uppercase tracking-wide mb-2', accentText, 'opacity-80')}>
              오늘 섭취량
            </p>
            <div className="flex items-baseline gap-1 mb-3">
              <span className={cn('font-myeong font-extrabold text-3xl', accentText)}>
                {formatCalories(summary.totalCalories)}
              </span>
              <span className={cn('font-myeong text-xs', accentText, 'opacity-70')}>kcal</span>
              <span className={cn('font-myeong text-xs ml-1', accentText, 'opacity-70')}>
                / {formatCalories(summary.targetCalories)} kcal
              </span>
            </div>
            <div className="mb-2 space-y-1">
              <div className="h-2 bg-white/25 rounded-pill overflow-hidden">
                <div
                  className="h-full bg-white rounded-pill transition-all duration-500"
                  style={{ width: `${Math.min((summary.totalCalories / Math.max(summary.targetCalories, 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className={cn('font-myeong font-bold text-sm', accentText, 'opacity-80')}>
                  {Math.round((summary.totalCalories / Math.max(summary.targetCalories, 1)) * 100)}%
                </span>
                {summary.totalCalories < summary.targetCalories && (
                  <span className={cn('font-kedu text-xs', accentText, 'opacity-70')}>
                    {formatCalories(summary.targetCalories - summary.totalCalories)} kcal 남음
                  </span>
                )}
                {summary.totalCalories >= summary.targetCalories && (
                  <span className={cn('font-kedu text-xs', accentText, 'opacity-70')}>
                    {formatCalories(summary.totalCalories - summary.targetCalories)} kcal 초과
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-hairline p-4">
            <p className="font-myeong font-bold text-xs text-muted uppercase tracking-wide mb-3">
              영양소 분석
            </p>
            <NutritionDetail
              carbs={summary.totalCarbs}
              protein={summary.totalProtein}
              fat={summary.totalFat}
            />
            <div className="mt-4">
              <NutritionChart
                carbs={summary.totalCarbs}
                protein={summary.totalProtein}
                fat={summary.totalFat}
              />
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-hairline p-4">
            <p className="font-myeong font-bold text-xs text-muted uppercase tracking-wide mb-3">
              끼니별 섭취
            </p>
            <div className="space-y-2">
              {Object.entries(summary.breakdown).map(([type, cal]) => {
                const m = BREAKDOWN_META[type] ?? { label: type, dot: 'bg-hairline', emoji: '' };
                const total = summary.targetCalories;
                const barPct = total > 0 ? Math.min((cal / total) * 100, 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-2 py-1">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', m.dot)} />
                    <span className="font-kedu text-sm text-ink flex-shrink-0 whitespace-nowrap w-14">{m.emoji} {m.label}</span>
                    <div className="flex-1 h-1.5 bg-surface-strong rounded-pill overflow-hidden">
                      <div className={cn('h-full rounded-pill transition-all duration-500', m.dot)} style={{ width: `${barPct}%` }} />
                    </div>
                    <div className="flex items-baseline gap-[3px] ml-1">
                      <span className="font-myeong font-bold text-sm text-ink">{formatCalories(cal)}</span>
                      <span className="font-myeong text-[11px] text-muted">kcal</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!user?.height && (
        <div className="bg-lavender rounded-xl p-4 text-center">
          <p className="font-kedu text-sm text-ink">
            신체 정보를 입력하면 정확한 목표를 설정할 수 있어요
          </p>
          <a href="/settings" className="font-kedu font-bold text-sm text-cobalt mt-2 block">
            설정하러 가기 →
          </a>
        </div>
      )}
    </div>
  );
}
