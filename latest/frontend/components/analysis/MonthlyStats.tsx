'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { userApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DailyStat {
  date: string;
  calories: number;
  mealCount: number;
  achievementRate: number;
}

interface MonthlyData {
  year: number;
  month: number;
  daily: DailyStat[];
  topFoods: { foodName: string; count: number; totalCalories: number }[];
  summary: {
    loggedDays: number;
    totalDays: number;
    avgCalories: number;
    avgAchievement: number;
    totalMeals: number;
    targetCalories: number;
  };
}

function achievementColor(rate: number): string {
  if (rate === 0) return 'bg-surface-soft text-muted';
  if (rate < 70) return 'bg-coral/20 text-coral';
  if (rate < 90) return 'bg-amber-100 text-amber-600';
  if (rate <= 115) return 'bg-sage/20 text-sage';
  return 'bg-cobalt/15 text-cobalt';
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function MonthlyStats() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const { data, isLoading } = useQuery<MonthlyData>({
    queryKey: ['monthly-stats', year, month],
    queryFn: async () => {
      const res = await userApi.getMonthlyStats(year, month);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // 달력 그리드용 빈 칸 계산
  const firstDayOfMonth = getDay(startOfMonth(new Date(year, month - 1, 1)));
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const dailyMap = new Map((data?.daily ?? []).map((d) => [d.date, d]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-cobalt" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-3">
      {/* 월 네비게이터 */}
      <div className="flex items-center justify-between bg-surface-card rounded-xl border border-hairline px-4 py-2">
        <button onClick={prevMonth} className="p-1 text-muted">
          <ChevronLeft size={18} />
        </button>
        <span className="font-kedu font-bold text-base text-ink">
          {year}년 {month}월
        </span>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1 text-muted disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 요약 수치 */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '기록한 날', value: `${summary.loggedDays}/${summary.totalDays}일` },
            { label: '평균 칼로리', value: `${summary.avgCalories.toLocaleString()}kcal` },
            { label: '달성률', value: `${summary.avgAchievement}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-card rounded-xl border border-hairline p-3 text-center">
              <p className="font-kedu text-[10px] text-muted mb-1">{label}</p>
              <p className="font-myeong font-bold text-sm text-ink">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 달력 히트맵 */}
      <div className="bg-surface-card rounded-xl border border-hairline p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center font-kedu text-[10px] text-muted py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* 첫 주 앞쪽 빈 칸 */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const stat = dailyMap.get(dateStr);
            const isToday = dateStr === format(now, 'yyyy-MM-dd');
            const rate = stat?.achievementRate ?? 0;

            return (
              <div
                key={day}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center text-center',
                  achievementColor(rate),
                  isToday && 'ring-1 ring-cobalt ring-offset-1'
                )}
              >
                <span className="font-kedu text-[11px] font-bold leading-none">{day}</span>
                {stat && stat.calories > 0 && (
                  <span className="font-kedu text-[8px] leading-none mt-0.5 opacity-70">
                    {stat.calories >= 1000 ? `${(stat.calories / 1000).toFixed(1)}k` : stat.calories}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {[
            { label: '미기록', cls: 'bg-surface-soft' },
            { label: '~70%', cls: 'bg-coral/20' },
            { label: '70~90%', cls: 'bg-amber-100' },
            { label: '90~115%', cls: 'bg-sage/20' },
            { label: '115%+', cls: 'bg-cobalt/15' },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded', cls)} />
              <span className="font-kedu text-[9px] text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 자주 먹은 음식 Top 5 */}
      {data?.topFoods && data.topFoods.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-hairline p-4">
          <p className="font-kedu text-xs font-bold text-muted mb-3">이번 달 자주 먹은 음식</p>
          <div className="space-y-2">
            {data.topFoods.map((food, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-myeong font-bold text-sm text-cobalt w-4">{i + 1}</span>
                <span className="flex-1 font-myeong text-sm text-ink truncate">{food.foodName}</span>
                <span className="font-kedu text-xs text-muted flex-shrink-0">{food.count}회</span>
                <span className="font-myeong text-xs text-muted flex-shrink-0 w-16 text-right">
                  {food.totalCalories.toLocaleString()}kcal
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
