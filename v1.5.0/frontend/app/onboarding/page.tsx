'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateBMI,
  getBMICategory,
  cn,
} from '@/lib/utils';
import { ACTIVITY_LEVEL_LABELS, GOAL_TYPE_LABELS } from '@/lib/constants';
import { Loader2, ShieldCheck } from 'lucide-react';
import type { ActivityLevel, GoalType } from '@/types';

const GOAL_META: Record<GoalType, { color: string; bg: string; emoji: string }> = {
  lose:     { color: 'text-coral',  bg: 'bg-coral',  emoji: '🔥' },
  maintain: { color: 'text-sage',   bg: 'bg-sage',   emoji: '⚖️' },
  gain:     { color: 'text-cobalt', bg: 'bg-cobalt', emoji: '💪' },
};

const ACTIVITY_INTENSITY: Record<ActivityLevel, number> = {
  sedentary: 1, light: 2, moderate: 3, active: 4, very_active: 5,
};

function getBmiColor(bmi: number) {
  if (bmi < 18.5) return { bg: 'bg-teal/20',  text: 'text-teal',  bar: 'bg-teal' };
  if (bmi < 23)   return { bg: 'bg-sage/20',  text: 'text-sage',  bar: 'bg-sage' };
  if (bmi < 25)   return { bg: 'bg-ochre/20', text: 'text-ochre', bar: 'bg-ochre' };
  return               { bg: 'bg-coral/15', text: 'text-coral', bar: 'bg-coral' };
}

export default function OnboardingPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.height) router.replace('/camera');
  }, [user, router]);

  const [form, setForm] = useState({
    age:           user?.age?.toString()          ?? '',
    gender:        user?.gender                   ?? 'male',
    height:        user?.height?.toString()       ?? '',
    weight:        user?.weight?.toString()       ?? '',
    activityLevel: (user?.activityLevel           ?? 'moderate') as ActivityLevel,
    goalType:      (user?.goalType                ?? 'maintain') as GoalType,
  });

  const previewBMI =
    form.height && form.weight
      ? calculateBMI(Number(form.weight), Number(form.height))
      : null;

  const previewTargetCalories = (() => {
    if (!form.age || !form.height || !form.weight) return null;
    const bmr  = calculateBMR(Number(form.weight), Number(form.height), Number(form.age), form.gender as 'male' | 'female');
    const tdee = calculateTDEE(bmr, form.activityLevel);
    return calculateTargetCalories(tdee, form.goalType);
  })();

  const mutation = useMutation({
    mutationFn: () =>
      userApi.updateMe({
        age:            Number(form.age)    || undefined,
        gender:         form.gender,
        height:         Number(form.height) || undefined,
        weight:         Number(form.weight) || undefined,
        activity_level: form.activityLevel,
        goal_type:      form.goalType,
      }),
    onSuccess: (res) => {
      setUser(res.data.data);
      router.replace('/camera');
    },
    onError: () => alert('저장에 실패했습니다. 다시 시도해주세요.'),
  });

  const canSubmit = !!form.age && !!form.height && !!form.weight;
  const bmiColors = previewBMI ? getBmiColor(previewBMI) : null;
  const goalMeta  = GOAL_META[form.goalType];

  return (
    <div className="min-h-screen bg-canvas">
      {/* 헤더 */}
      <div className="px-md pt-10 pb-6 text-center">
        <div className="text-4xl mb-3">🍽️</div>
        <h1 className="font-kedu font-bold text-2xl text-ink">먹로그에 오신 걸 환영해요!</h1>
        <p className="font-kedu text-sm text-muted mt-2">
          정확한 칼로리 목표를 위해 신체 정보를 알려주세요
        </p>
      </div>

      <main className="px-md pb-lg space-y-sm">

        {/* 신체 정보 카드 */}
        <div className="bg-surface-card rounded-xl border border-hairline p-md space-y-md">
          <p className="font-kedu font-bold text-base text-ink">신체 정보</p>

          <div className="grid grid-cols-2 gap-sm">
            <div>
              <label className="font-kedu text-xs text-muted mb-xxs block">나이</label>
              <input
                type="number"
                placeholder="22"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                className="w-full h-12 px-sm bg-surface-soft border border-hairline rounded-md font-myeong text-sm text-ink focus:outline-none focus:border-cobalt transition-colors"
              />
            </div>

            <div>
              <label className="font-kedu text-xs text-muted mb-xxs block">성별</label>
              <div className="flex gap-xs h-12">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm((f) => ({ ...f, gender: g }))}
                    className={cn(
                      'flex-1 h-full rounded-md font-kedu text-sm transition-colors',
                      form.gender === g
                        ? 'bg-peach text-ink font-bold'
                        : 'bg-surface-soft border border-hairline text-muted'
                    )}
                  >
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-kedu text-xs text-muted mb-xxs block">키 (cm)</label>
              <input
                type="number"
                placeholder="175"
                value={form.height}
                onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                className="w-full h-12 px-sm bg-surface-soft border border-hairline rounded-md font-myeong text-sm text-ink focus:outline-none focus:border-cobalt transition-colors"
              />
            </div>

            <div>
              <label className="font-kedu text-xs text-muted mb-xxs block">몸무게 (kg)</label>
              <input
                type="number"
                placeholder="70"
                value={form.weight}
                onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                className="w-full h-12 px-sm bg-surface-soft border border-hairline rounded-md font-myeong text-sm text-ink focus:outline-none focus:border-cobalt transition-colors"
              />
            </div>
          </div>

          {previewBMI && bmiColors && (
            <div className={cn('rounded-xl p-sm flex items-center justify-between', bmiColors.bg)}>
              <div>
                <p className="font-kedu text-xs text-muted">BMI 지수</p>
                <p className="font-myeong text-xs text-muted-soft mt-[2px]">
                  {form.height}cm · {form.weight}kg
                </p>
              </div>
              <div className="flex items-center gap-sm">
                <span className={cn('font-myeong font-extrabold text-3xl leading-none', bmiColors.text)}>
                  {previewBMI}
                </span>
                <span className={cn('font-kedu font-bold text-sm px-sm py-xxs rounded-pill text-white', bmiColors.bar)}>
                  {getBMICategory(previewBMI)}
                </span>
              </div>
            </div>
          )}

          {/* 개인정보 안내 */}
          <div className="flex items-start gap-2 bg-surface-soft rounded-xl p-3">
            <ShieldCheck size={15} className="text-cobalt flex-shrink-0 mt-[1px]" />
            <p className="font-kedu text-xs text-muted leading-relaxed">
              입력하신 신체 정보는 <span className="text-ink font-bold">다이어트 목표 설정 및 운동 루틴 추천</span>에만 활용되며,
              그 외의 목적으로는 사용되지 않습니다. 정확한 신체 정보를 입력해 주시면 더욱 정밀한 분석이 가능해요.
            </p>
          </div>
        </div>

        {/* 목표 설정 카드 */}
        <div className="bg-surface-card rounded-xl border border-hairline p-md space-y-md">
          <p className="font-kedu font-bold text-base text-ink">목표 설정</p>

          <div>
            <label className="font-kedu text-xs text-muted mb-xs block">활동 수준</label>
            <div className="space-y-xs">
              {(Object.entries(ACTIVITY_LEVEL_LABELS) as [ActivityLevel, string][]).map(([val, label]) => {
                const intensity = ACTIVITY_INTENSITY[val];
                const isActive  = form.activityLevel === val;
                return (
                  <button
                    key={val}
                    onClick={() => setForm((f) => ({ ...f, activityLevel: val }))}
                    className={cn(
                      'w-full h-11 px-sm rounded-md font-kedu text-sm text-left flex items-center gap-sm transition-colors',
                      isActive ? 'bg-ochre text-ink font-bold' : 'bg-surface-soft text-muted'
                    )}
                  >
                    <div className="flex gap-[3px] flex-shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[3px] rounded-pill"
                          style={{
                            height: 8 + i * 3,
                            background: isActive
                              ? 'rgba(26,26,26,0.4)'
                              : i < intensity
                              ? '#e8b94a'
                              : '#e0d8cc',
                          }}
                        />
                      ))}
                    </div>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-kedu text-xs text-muted mb-xs block">나의 목표</label>
            <div className="flex gap-xs">
              {(Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]).map(([val, label]) => {
                const meta   = GOAL_META[val];
                const active = form.goalType === val;
                return (
                  <button
                    key={val}
                    onClick={() => setForm((f) => ({ ...f, goalType: val }))}
                    className={cn(
                      'flex-1 h-12 rounded-md font-kedu font-bold text-sm flex flex-col items-center justify-center gap-[2px] transition-colors',
                      active ? `${meta.bg} text-white` : 'bg-surface-soft text-muted'
                    )}
                  >
                    <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                    <span className={cn('text-xs', active ? 'text-white' : 'text-muted')}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {previewTargetCalories && (
            <div className="bg-sage/15 rounded-xl p-sm flex items-center justify-between border border-sage/20">
              <div>
                <p className="font-kedu text-xs text-muted">일일 권장 칼로리</p>
                <p className="font-myeong text-xs text-muted-soft mt-[2px]">Mifflin-St Jeor 공식 기준</p>
              </div>
              <div className="flex items-baseline gap-xxs">
                <span className="font-myeong font-extrabold text-sage text-2xl leading-none">
                  {previewTargetCalories.toLocaleString()}
                </span>
                <span className="font-myeong text-xs text-muted">kcal</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !canSubmit}
          className="w-full h-12 bg-cobalt text-white font-kedu font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-xs active:scale-95 transition-transform"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          {canSubmit ? '시작하기' : '신체 정보를 입력해주세요'}
        </button>

        <button
          onClick={() => {
            sessionStorage.setItem('onboarding-skipped', 'true');
            router.replace('/camera');
          }}
          className="w-full py-3 font-kedu text-sm text-muted text-center"
        >
          나중에 입력할게요
        </button>
      </main>
    </div>
  );
}
