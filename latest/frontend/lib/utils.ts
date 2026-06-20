import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ActivityLevel, GoalType, MealType } from '@/types';
import { DAY_START_HOUR } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ======= 칼로리 계산 =======

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

export function calculateTargetCalories(tdee: number, goalType: GoalType): number {
  const adjustments: Record<GoalType, number> = { lose: -500, maintain: 0, gain: 300 };
  return Math.max(1200, tdee + adjustments[goalType]);
}

export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return '저체중';
  if (bmi < 23.0) return '정상';
  if (bmi < 25.0) return '과체중';
  return '비만';
}

// ======= 날짜 계산 =======

export function getLogDate(uploadedAt: Date): Date {
  const kst = new Date(uploadedAt.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  if (kst.getHours() < DAY_START_HOUR) {
    return subDays(kst, 1);
  }
  return kst;
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'yyyy.MM.dd', { locale: ko });
}

export function formatDateKorean(date: Date): string {
  return format(date, 'M월 d일 (EEE)', { locale: ko });
}

export function formatTime(dateString: string): string {
  // 백엔드가 타임존 없는 UTC 문자열을 반환하므로 Z를 붙여 UTC로 파싱 → KST(+9) 표시
  const normalized =
    dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  const date = new Date(normalized);
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date);
}

// ======= 식사 카테고리 자동 추천 =======

export function getAutoMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snack';
}

// ======= 달성률 색상 =======

export function getProgressColor(rate: number): string {
  if (rate >= 110) return 'bg-coral';
  if (rate >= 100) return 'bg-cobalt';
  if (rate >= 80) return 'bg-ochre';
  return 'bg-sage';
}

export function getProgressTextColor(rate: number): string {
  if (rate >= 110) return 'text-coral';
  if (rate >= 100) return 'text-cobalt';
  if (rate >= 80) return 'text-ochre';
  return 'text-sage';
}

// ======= 숫자 포맷 =======

export function formatCalories(calories: number): string {
  return calories.toLocaleString('ko-KR');
}

export function roundNutrient(value: number): number {
  return Math.round(value * 10) / 10;
}
