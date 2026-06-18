'use client';

import { useState, useMemo } from 'react';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { MealCard } from '@/components/meal/MealCard';
import { NutritionDetail } from '@/components/meal/NutritionDetail';
import { useDailyLog } from '@/hooks/useDailyLog';
import { formatDisplayDate, getProgressColor } from '@/lib/utils';
import { MEAL_TYPE_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import type { MealType } from '@/types';
import { cn } from '@/lib/utils';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/* 식사 시간대 색상과 의미 */
const MEAL_META: Record<MealType, { emoji: string; accent: string; emptyMsg: string }> = {
  breakfast: { emoji: '🌅', accent: 'bg-peach',  emptyMsg: '아침을 아직 기록하지 않았어요' },
  lunch:     { emoji: '☀️', accent: 'bg-ochre',  emptyMsg: '점심을 아직 기록하지 않았어요' },
  dinner:    { emoji: '🌙', accent: 'bg-cobalt', emptyMsg: '저녁을 아직 기록하지 않았어요' },
  snack:     { emoji: '🍪', accent: 'bg-sage',   emptyMsg: '간식을 기록하지 않았어요' },
};

/* 칼로리 달성률에 따른 상태 메시지 — 건강 상태를 언어로 표현 */
function getCalorieStatus(rate: number): { label: string; colorClass: string } {
  if (rate >= 110) return { label: '목표 초과', colorClass: 'text-coral' };
  if (rate >= 95)  return { label: '목표 달성', colorClass: 'text-cobalt' };
  if (rate >= 70)  return { label: '잘 하고 있어요', colorClass: 'text-ochre' };
  if (rate >= 30)  return { label: '조금 더 드세요', colorClass: 'text-sage' };
  return { label: '시작해봐요', colorClass: 'text-muted' };
}

export default function LogPage() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const { meals, dailyTotal, isLoading, isError, refetch } = useDailyLog(date);
  const { user } = useAuthStore();
  const router = useRouter();

  const targetCalories = user?.targetCalories ?? 2000;
  const rate = targetCalories > 0 ? (dailyTotal.calories / targetCalories) * 100 : 0;
  const progressColor = getProgressColor(rate);
  const { label: statusLabel, colorClass: statusColor } = getCalorieStatus(rate);

  const mealsByType = useMemo<Record<MealType, typeof meals>>(() => ({
    breakfast: meals.filter((m) => m.mealType === 'breakfast'),
    lunch:     meals.filter((m) => m.mealType === 'lunch'),
    dinner:    meals.filter((m) => m.mealType === 'dinner'),
    snack:     meals.filter((m) => m.mealType === 'snack'),
  }), [meals]);

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="로그" showSettings />
      {showPicker && (
        <DatePickerModal
          value={date}
          onChange={setDate}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* 날짜 네비게이션 */}
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

      <main className="px-md space-y-sm pb-lg pt-sm">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-cobalt" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">😵</span>
            <button onClick={() => refetch()} className="font-kedu text-cobalt text-sm">
              다시 시도
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* 하루 칼로리 요약 카드
                칼로리 진행 바의 색상이 건강 상태를 표현:
                sage=여유, ochre=무난, cobalt=달성, coral=초과 */}
            <div className="bg-surface-card rounded-xl border border-hairline p-md animate-fade-slide-up">
              {/* 탄단지 비율 바 — 오늘 섭취한 영양소의 시각적 균형 */}
              {(() => {
                const t = dailyTotal.carbs + dailyTotal.protein + dailyTotal.fat;
                const cPct = t > 0 ? (dailyTotal.carbs   / t) * 100 : 55;
                const pPct = t > 0 ? (dailyTotal.protein / t) * 100 : 25;
                const fPct = t > 0 ? (dailyTotal.fat     / t) * 100 : 20;
                return (
                  <div className="flex rounded-pill overflow-hidden h-1.5 mb-md">
                    <div className="bg-ochre transition-all duration-700" style={{ width: `${cPct}%` }} />
                    <div className="bg-sage  transition-all duration-700" style={{ width: `${pPct}%` }} />
                    <div className="bg-coral transition-all duration-700" style={{ width: `${fPct}%` }} />
                  </div>
                );
              })()}

              <div className="flex items-end justify-between mb-xs">
                <div className="flex items-baseline gap-xxs">
                  <span className="font-myeong font-extrabold text-3xl text-ink leading-none">
                    {dailyTotal.calories.toLocaleString()}
                  </span>
                  <span className="font-myeong text-xs text-muted">kcal</span>
                </div>
                <span className={cn('font-kedu font-bold text-sm', statusColor)}>
                  {statusLabel}
                </span>
              </div>

              <div className="h-2 bg-surface-strong rounded-pill overflow-hidden mb-xs">
                <div
                  className={cn('h-full rounded-pill transition-all duration-700', progressColor)}
                  style={{ width: `${Math.min(rate, 100)}%`, animation: 'progressFill 0.8s ease both' }}
                />
              </div>

              <div className="flex justify-between">
                <span className="font-myeong text-xs text-muted">{Math.round(rate)}%</span>
                <span className="font-myeong text-xs text-muted">목표 {targetCalories.toLocaleString()} kcal</span>
              </div>

              <div className="mt-sm">
                <NutritionDetail carbs={dailyTotal.carbs} protein={dailyTotal.protein} fat={dailyTotal.fat} />
              </div>
            </div>

            {/* 식사별 섹션 */}
            {MEAL_ORDER.map((type, sectionIdx) => {
              const meta = MEAL_META[type];
              const typeMeals = mealsByType[type];
              return (
                <div
                  key={type}
                  className={cn('space-y-xs animate-fade-slide-up', `stagger-${Math.min(sectionIdx + 2, 5)}`)}
                >
                  {/* 식사 시간대 헤더 — 색상과 이모지가 시간 맥락을 전달 */}
                  <div className="flex items-center gap-xs px-xs">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', meta.accent)} />
                    <p className="font-kedu font-bold text-sm text-ink">
                      {meta.emoji} {MEAL_TYPE_LABELS[type]}
                    </p>
                    {typeMeals.length > 0 && (
                      <span className="ml-auto font-myeong text-xs text-muted">
                        {typeMeals.reduce((s, m) => s + m.totalCalories, 0).toLocaleString()} kcal
                      </span>
                    )}
                  </div>

                  {typeMeals.length > 0 ? (
                    typeMeals.map((meal) => (
                      <MealCard key={meal.id} meal={meal} />
                    ))
                  ) : (
                    /* 빈 슬롯 — 클릭하면 카메라로 이동 */
                    <button
                      className="w-full bg-surface-card rounded-xl border border-dashed border-hairline p-sm text-center flex items-center justify-center gap-xs hover:bg-surface-soft transition-colors"
                      onClick={() => router.push('/camera')}
                    >
                      <Plus size={14} className="text-muted-soft" />
                      <p className="font-kedu text-sm text-muted-soft">{meta.emptyMsg}</p>
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
