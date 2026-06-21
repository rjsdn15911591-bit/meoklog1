'use client';

import { useQueries } from '@tanstack/react-query';
import { subDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { userApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import type { DailySummary } from '@/types';

interface WeeklyTrendChartProps {
  baseDate: Date;
  days?: number;
}

const BAR_MAX_H = 96;

export function WeeklyTrendChart({ baseDate, days = 7 }: WeeklyTrendChartProps) {
  const dates = Array.from({ length: days }, (_, i) =>
    subDays(baseDate, days - 1 - i)
  );

  const results = useQueries({
    queries: dates.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      return {
        queryKey: ['daily-summary', dateStr],
        queryFn: async () => {
          const res = await userApi.getDailySummary(dateStr);
          return res.data.data as DailySummary;
        },
        staleTime: 1000 * 60 * 5,
      };
    }),
  });

  const isLoading = results.some((r) => r.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-cobalt" />
      </div>
    );
  }

  const data = results.map((r, i) => ({
    date: dates[i],
    summary: r.data ?? null,
  }));

  const maxCal = Math.max(...data.map((d) => d.summary?.totalCalories ?? 0), 1);

  const totalAvg =
    data.filter((d) => (d.summary?.totalCalories ?? 0) > 0).length > 0
      ? Math.round(
          data.reduce((s, d) => s + (d.summary?.totalCalories ?? 0), 0) /
          data.filter((d) => (d.summary?.totalCalories ?? 0) > 0).length
        )
      : 0;

  const targetCal = data.find((d) => d.summary?.targetCalories)?.summary?.targetCalories ?? 0;

  return (
    <div>
      {/* 평균 + 목표 요약 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-surface-soft rounded-xl p-3 text-center">
          <p className="font-kedu text-xs text-muted mb-[2px]">평균 섭취</p>
          <div className="flex items-baseline justify-center gap-[3px]">
            <span className="font-myeong font-bold text-xl text-ink">{totalAvg.toLocaleString()}</span>
            <span className="font-myeong text-xs text-muted">kcal</span>
          </div>
        </div>
        {targetCal > 0 && (
          <div className="flex-1 bg-sage/15 rounded-xl p-3 text-center">
            <p className="font-kedu text-xs text-muted mb-[2px]">목표 칼로리</p>
            <div className="flex items-baseline justify-center gap-[3px]">
              <span className="font-myeong font-bold text-xl text-sage">{targetCal.toLocaleString()}</span>
              <span className="font-myeong text-xs text-muted">kcal</span>
            </div>
          </div>
        )}
      </div>

      {/* 막대 그래프 */}
      <div className="flex items-end justify-between gap-1" style={{ height: BAR_MAX_H + 36 }}>
        {data.map(({ date, summary }, i) => {
          const cal   = summary?.totalCalories ?? 0;
          const target = summary?.targetCalories ?? targetCal;
          const barH  = cal > 0 ? Math.max((cal / maxCal) * BAR_MAX_H, 4) : 0;
          const exceeded = target > 0 && cal > target;
          const dayLabel = format(date, 'EEE', { locale: ko });
          const isToday  = format(date, 'yyyy-MM-dd') === format(baseDate, 'yyyy-MM-dd');

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {/* 칼로리 수치 */}
              {cal > 0 && (
                <span
                  className="font-myeong text-[9px] font-bold"
                  style={{ color: exceeded ? '#e85d4a' : '#5058F0' }}
                >
                  {cal >= 1000 ? `${(cal / 1000).toFixed(1)}k` : cal}
                </span>
              )}

              {/* 바 영역 */}
              <div className="relative w-full flex justify-center" style={{ height: BAR_MAX_H }}>
                {/* 목표 기준선 */}
                {targetCal > 0 && (
                  <div
                    className="absolute left-0 right-0 h-[1px] bg-hairline"
                    style={{ bottom: (targetCal / maxCal) * BAR_MAX_H }}
                  />
                )}
                {/* 섭취 바 */}
                {barH > 0 && (
                  <div
                    className="absolute bottom-0 w-[70%] rounded-t-sm transition-all duration-500"
                    style={{
                      height: barH,
                      background: exceeded ? '#e85d4a' : isToday ? '#5058F0' : '#A8B0F0',
                    }}
                  />
                )}
                {/* 기록 없음 */}
                {cal === 0 && (
                  <div className="absolute bottom-0 w-[70%] rounded-t-sm bg-surface-strong h-1" />
                )}
              </div>

              {/* 요일 */}
              <span className={`font-kedu text-[10px] ${isToday ? 'text-cobalt font-bold' : 'text-muted'}`}>
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>

      {targetCal > 0 && (
        <div className="flex items-center gap-2 mt-2 justify-end">
          <div className="w-4 h-[1px] bg-hairline" />
          <span className="font-kedu text-[10px] text-muted">목표 {targetCal.toLocaleString()}kcal</span>
        </div>
      )}
    </div>
  );
}
