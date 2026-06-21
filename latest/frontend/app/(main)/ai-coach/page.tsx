'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type CoachTab = 'diet' | 'exercise';

interface MealItem { name: string; amount: string; calories: number; }
interface DietResult {
  totalCalories: number;
  meals: { breakfast: MealItem[]; lunch: MealItem[]; dinner: MealItem[]; snack: MealItem[]; };
  macros: { carbs: number; protein: number; fat: number; };
  tips: string[];
}
interface ExerciseItem { name: string; sets?: number; reps?: string; rest?: string; duration?: string; }
interface DaySchedule { day: string; focus: string; exercises: ExerciseItem[]; duration: string; }
interface ExerciseResult {
  schedule: DaySchedule[];
  restDays: string[];
  weeklyCaloriesBurned: number;
  tips: string[];
}

const MEAL_META = {
  breakfast: { label: '아침', emoji: '🌅' },
  lunch:     { label: '점심', emoji: '☀️'  },
  dinner:    { label: '저녁', emoji: '🌙' },
  snack:     { label: '간식', emoji: '🍎' },
};

const GOAL_META: Record<string, { emoji: string; label: string; color: string }> = {
  lose:     { emoji: '🔥', label: '체중 감량', color: 'text-coral'  },
  maintain: { emoji: '⚖️', label: '체중 유지', color: 'text-sage'   },
  gain:     { emoji: '💪', label: '근육 증량', color: 'text-cobalt' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:   '거의 운동 안 함',
  light:       '가벼운 활동',
  moderate:    '보통 활동',
  active:      '활발한 활동',
  very_active: '매우 활발',
};

function DietResultView({ result }: { result: DietResult }) {
  return (
    <div className="space-y-3">
      <div className="bg-surface-card rounded-xl border border-hairline p-4 flex items-center justify-between">
        <div>
          <p className="font-kedu text-xs text-muted">총 권장 칼로리</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-myeong font-bold text-2xl text-cobalt">{result.totalCalories.toLocaleString()}</span>
            <span className="font-myeong text-xs text-muted">kcal</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-kedu text-xs text-muted">탄수 · 단백 · 지방</p>
          <p className="font-myeong text-sm font-bold text-ink mt-0.5">
            {result.macros?.carbs ?? 0}g · {result.macros?.protein ?? 0}g · {result.macros?.fat ?? 0}g
          </p>
        </div>
      </div>

      {(Object.entries(MEAL_META) as [keyof typeof MEAL_META, (typeof MEAL_META)[keyof typeof MEAL_META]][]).map(([key, meta]) => {
        const items = result.meals?.[key];
        if (!items?.length) return null;
        const mealCal = items.reduce((s, i) => s + (i.calories ?? 0), 0);
        return (
          <div key={key} className="bg-surface-card rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.emoji}</span>
                <span className="font-kedu font-bold text-base text-ink">{meta.label}</span>
              </div>
              <span className="font-myeong text-sm font-bold text-cobalt">{mealCal}kcal</span>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-myeong text-sm text-ink font-bold">{item.name}</span>
                    {item.amount && (
                      <span className="font-myeong text-xs text-muted ml-1.5">{item.amount}</span>
                    )}
                  </div>
                  <span className="font-myeong text-xs text-muted flex-shrink-0">{item.calories}kcal</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {result.tips?.length > 0 && (
        <div className="bg-sage/10 rounded-xl border border-sage/20 p-4">
          <p className="font-kedu font-bold text-sm text-sage mb-2">💡 영양사 팁</p>
          <ul className="space-y-2">
            {result.tips.map((tip, i) => (
              <li key={i} className="font-myeong text-sm text-ink flex gap-2">
                <span className="text-sage flex-shrink-0 mt-[2px]">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExerciseResultView({ result }: { result: ExerciseResult }) {
  return (
    <div className="space-y-3">
      <div className="bg-surface-card rounded-xl border border-hairline p-4 flex items-center justify-between">
        <div>
          <p className="font-kedu text-xs text-muted">주간 예상 소모</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-myeong font-bold text-2xl text-coral">{(result.weeklyCaloriesBurned ?? 0).toLocaleString()}</span>
            <span className="font-myeong text-xs text-muted">kcal</span>
          </div>
        </div>
        {result.restDays?.length > 0 && (
          <div className="text-right">
            <p className="font-kedu text-xs text-muted">휴식일</p>
            <p className="font-myeong text-sm font-bold text-ink mt-0.5">{result.restDays.join(' · ')}</p>
          </div>
        )}
      </div>

      {result.schedule?.map((day, i) => (
        <div key={i} className="bg-surface-card rounded-xl border border-hairline p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-kedu font-bold text-base text-ink">{day.day}</span>
              <span className="font-kedu text-xs text-cobalt bg-cobalt/10 px-2 py-0.5 rounded-pill">{day.focus}</span>
            </div>
            <span className="font-myeong text-xs text-muted">{day.duration}</span>
          </div>
          <div className="space-y-2">
            {day.exercises?.map((ex, j) => (
              <div key={j} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cobalt flex-shrink-0 mt-[6px]" />
                <div className="flex-1">
                  <span className="font-myeong text-sm text-ink font-bold">{ex.name}</span>
                  <span className="font-myeong text-xs text-muted ml-2">
                    {ex.sets ? `${ex.sets}세트 × ${ex.reps}` : ex.duration}
                    {ex.rest && ` · 휴식 ${ex.rest}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {result.tips?.length > 0 && (
        <div className="bg-cobalt/10 rounded-xl border border-cobalt/20 p-4">
          <p className="font-kedu font-bold text-sm text-cobalt mb-2">💡 트레이너 팁</p>
          <ul className="space-y-2">
            {result.tips.map((tip, i) => (
              <li key={i} className="font-myeong text-sm text-ink flex gap-2">
                <span className="text-cobalt flex-shrink-0 mt-[2px]">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AICoachPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<CoachTab>('diet');
  const [isLoading, setIsLoading] = useState(false);
  const [dietResult, setDietResult] = useState<DietResult | null>(null);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasProfile = !!user?.height && !!user?.weight;
  const goalMeta = GOAL_META[user?.goalType ?? 'maintain'] ?? GOAL_META.maintain;

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: tab,
          profile: {
            age:            user?.age,
            gender:         user?.gender ?? 'male',
            height:         user?.height,
            weight:         user?.weight,
            activityLevel:  user?.activityLevel ?? 'moderate',
            goalType:       user?.goalType ?? 'maintain',
            targetCalories: user?.targetCalories,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI 오류');
      if (tab === 'diet') setDietResult(data);
      else setExerciseResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentResult = tab === 'diet' ? dietResult : exerciseResult;

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="AI 코치" showSettings />

      {/* 프로필 요약 */}
      <div className="px-md pt-sm">
        <div className="bg-surface-card rounded-xl border border-hairline p-4 flex items-center gap-3">
          <span className="text-3xl">{goalMeta.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className={cn('font-kedu font-bold text-base', goalMeta.color)}>{goalMeta.label}</span>
              <span className="font-kedu text-xs text-muted">목표</span>
            </div>
            <p className="font-myeong text-xs text-muted mt-[2px] truncate">
              {hasProfile
                ? `${user!.height}cm · ${user!.weight}kg · ${ACTIVITY_LABELS[user?.activityLevel ?? ''] ?? ''}`
                : '설정에서 신체 정보를 먼저 입력해주세요'}
            </p>
          </div>
          {user?.targetCalories && (
            <div className="text-right flex-shrink-0">
              <p className="font-kedu text-[10px] text-muted">목표</p>
              <p className="font-myeong text-sm font-bold text-ink">{user.targetCalories.toLocaleString()}<span className="text-[10px] text-muted">kcal</span></p>
            </div>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex px-md py-sm gap-2">
        {([['diet', '🍽️ 맞춤 식단'], ['exercise', '💪 운동 루틴']] as [CoachTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 h-10 rounded-xl font-kedu font-bold text-sm transition-colors',
              tab === key ? 'bg-cobalt text-white' : 'bg-surface-soft text-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-md pb-lg space-y-3">
        {/* 생성 버튼 */}
        <button
          onClick={generate}
          disabled={isLoading || !hasProfile}
          className="w-full h-12 bg-ink text-white font-kedu font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {isLoading ? (
            <><Loader2 size={18} className="animate-spin" />AI가 분석 중이에요...</>
          ) : currentResult ? (
            <><RefreshCw size={16} />다시 추천받기</>
          ) : (
            <><Sparkles size={18} />{tab === 'diet' ? 'AI 맞춤 식단 추천받기' : 'AI 맞춤 운동 루틴 받기'}</>
          )}
        </button>

        {!hasProfile && (
          <div className="bg-ochre/10 rounded-xl border border-ochre/30 p-4 text-center">
            <p className="font-kedu text-sm text-ochre font-bold">신체 정보를 먼저 설정해주세요</p>
            <p className="font-myeong text-xs text-muted mt-1">설정 탭에서 키·몸무게를 입력하면 맞춤 추천이 가능해요</p>
          </div>
        )}

        {error && (
          <div className="bg-coral/10 rounded-xl border border-coral/30 p-4 text-center">
            <p className="font-kedu text-sm text-coral font-bold">{error}</p>
          </div>
        )}

        {!isLoading && !currentResult && !error && hasProfile && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Sparkles size={40} className="text-cobalt/30" />
            <p className="font-kedu font-bold text-base text-ink">
              {tab === 'diet' ? '오늘의 맞춤 식단을 추천받아보세요' : '나만의 운동 루틴을 만들어보세요'}
            </p>
            <p className="font-myeong text-sm text-muted">
              {tab === 'diet'
                ? '신체 정보와 목표를 바탕으로 AI가 최적 식단을 짜드려요'
                : '목표와 활동 수준에 맞는 1주일 루틴을 제안해드려요'}
            </p>
          </div>
        )}

        {tab === 'diet' && dietResult && <DietResultView result={dietResult} />}
        {tab === 'exercise' && exerciseResult && <ExerciseResultView result={exerciseResult} />}
      </main>
    </div>
  );
}
