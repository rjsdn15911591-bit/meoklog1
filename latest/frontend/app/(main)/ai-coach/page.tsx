'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { mealApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Sparkles, Loader2, RefreshCw, ImageDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type CoachTab = 'diet' | 'exercise' | 'feedback';

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

interface FeedbackDayAnalysis {
  date: string;
  calories: number;
  status: '달성' | '초과' | '부족' | '미기록';
  note: string;
}
interface FeedbackResult {
  overallScore: number;
  grade: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  dailyAnalysis: FeedbackDayAnalysis[];
  tips: string[];
  focusFoods: { add: string[]; reduce: string[] };
}

interface FrontendDaySummary {
  date: string;
  dayLabel: string;
  targetCalories: number;
  totalCalories: number;
  carbs: number;
  protein: number;
  fat: number;
  meals: { type: string; foods: string[] }[];
}

const MEAL_TYPE_KO: Record<string, string> = {
  breakfast: '아침',
  lunch:     '점심',
  dinner:    '저녁',
  snack:     '간식',
};

const MEAL_META = {
  breakfast: { label: '아침', emoji: '🌅', color: '#F9B77B' },
  lunch:     { label: '점심', emoji: '☀️',  color: '#E6A820' },
  dinner:    { label: '저녁', emoji: '🌙', color: '#5058F0' },
  snack:     { label: '간식', emoji: '🍎', color: '#6BAF8B' },
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

// ── Canvas 헬퍼 ──────────────────────────────────────────
function makeRR(ctx: CanvasRenderingContext2D) {
  return (x: number, y: number, w: number, h: number, r: number) => {
    const rc = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rc, y);
    ctx.lineTo(x + w - rc, y);
    ctx.arcTo(x + w, y, x + w, y + rc, rc);
    ctx.lineTo(x + w, y + h - rc);
    ctx.arcTo(x + w, y + h, x + w - rc, y + h, rc);
    ctx.lineTo(x + rc, y + h);
    ctx.arcTo(x, y + h, x, y + h - rc, rc);
    ctx.lineTo(x, y + rc);
    ctx.arcTo(x, y, x + rc, y, rc);
    ctx.closePath();
  };
}

function makeFont(size: number, weight = 400) {
  return `${weight} ${size}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
}

// 텍스트 자동 줄바꿈 (maxW 넘으면 줄바꿈, 반환값: 출력된 줄 수)
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(' ');
  let line = '';
  let rows = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + rows * lineH);
      line = word;
      rows++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + rows * lineH);
  return rows + 1;
}

// ── 식단 PNG 내보내기 ────────────────────────────────────
async function exportDietAsPng(
  result: DietResult,
  profile: { goal: string; height?: number | null; weight?: number | null; targetCalories?: number | null },
) {
  await document.fonts.ready;

  const DPR = 8;
  const LW  = 540;
  const PAD = 28;
  const IH  = 16;
  const IV  = 14;
  const SEC_R = 14;
  const GAP = 14;

  const font = makeFont;

  // ── 높이 계산용 임시 캔버스 ──
  const tmpC = document.createElement('canvas');
  tmpC.width = LW * DPR; tmpC.height = 100 * DPR;
  const tmpCtx = tmpC.getContext('2d')!;
  tmpCtx.scale(DPR, DPR);

  const innerW = LW - PAD * 2 - IH * 2;
  const LINE_H = 20;

  // 헤더 28+20
  let totalH = PAD + 48;

  // 프로필 카드 (~52)
  totalH += 52 + GAP;

  // 칼로리 + 매크로 카드
  totalH += 114 + GAP;

  // 끼니별 카드
  let mealsH = IV + 15 + 10; // 제목 + 간격
  (Object.entries(MEAL_META) as [keyof typeof MEAL_META, (typeof MEAL_META)[keyof typeof MEAL_META]][]).forEach(([key, meta]) => {
    const items = result.meals?.[key];
    if (!items?.length) return;
    mealsH += 24 + 8; // 끼니 헤더
    items.forEach((item) => {
      tmpCtx.font = font(12, 500);
      const nameW = tmpCtx.measureText(item.name + (item.amount ? ' ' + item.amount : '')).width;
      const rows = Math.ceil(nameW / (innerW - 60));
      mealsH += Math.max(rows, 1) * LINE_H + 4;
    });
    mealsH += 6;
  });
  mealsH += IV;
  totalH += mealsH + GAP;

  // 팁 카드
  let tipsH = IV + 15 + 8;
  if (result.tips?.length) {
    result.tips.forEach((tip) => {
      tmpCtx.font = font(12, 400);
      const rows = wrapText(tmpCtx, '• ' + tip, 0, 0, innerW - 8, LINE_H);
      tipsH += rows * LINE_H + 6;
    });
  }
  tipsH += IV;
  totalH += tipsH + GAP;

  // 워터마크
  totalH += 24 + PAD;
  const LH = Math.max(totalH, Math.round(LW * 16 / 9));

  const canvas = document.createElement('canvas');
  canvas.width  = LW * DPR;
  canvas.height = LH * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);
  const rr = makeRR(ctx);

  // 배경
  const bg = ctx.createLinearGradient(0, 0, LW, LH);
  bg.addColorStop(0, '#FAFAFA');
  bg.addColorStop(1, '#F4F4FF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LW, LH);

  let y = PAD;

  // 로고 행
  ctx.fillStyle = '#5058F0';
  rr(PAD, y, 28, 28, 8);
  ctx.fill();
  ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🍽️', PAD + 14, y + 14);
  ctx.fillStyle = '#1A1A2E'; ctx.font = font(14, 700); ctx.textAlign = 'left';
  ctx.fillText('먹로그', PAD + 36, y + 14);
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 500); ctx.textAlign = 'right';
  ctx.fillText('AI 맞춤 식단', LW - PAD, y + 14);
  y += 48;

  // 프로필 카드
  const profH = 52;
  ctx.fillStyle = 'white'; rr(PAD, y, LW - PAD * 2, profH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5058F0'; ctx.font = font(22, 700);
  ctx.fillText(profile.goal === 'lose' ? '🔥' : profile.goal === 'gain' ? '💪' : '⚖️', PAD + IH, y + profH / 2);
  ctx.fillStyle = '#1A1A2E'; ctx.font = font(13, 700);
  const goalLabel = profile.goal === 'lose' ? '체중 감량' : profile.goal === 'gain' ? '근육 증량' : '체중 유지';
  ctx.fillText(goalLabel, PAD + IH + 30, y + profH / 2 - 8);
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 400);
  const profDetail = [
    profile.height ? `${profile.height}cm` : null,
    profile.weight ? `${profile.weight}kg` : null,
  ].filter(Boolean).join(' · ');
  ctx.fillText(profDetail, PAD + IH + 30, y + profH / 2 + 9);
  if (profile.targetCalories) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9EA3B0'; ctx.font = font(10, 400);
    ctx.fillText('목표', LW - PAD - IH, y + profH / 2 - 8);
    ctx.fillStyle = '#5058F0'; ctx.font = font(14, 700);
    ctx.fillText(`${profile.targetCalories.toLocaleString()} kcal`, LW - PAD - IH, y + profH / 2 + 9);
  }
  y += profH + GAP;

  // 총 칼로리 + 매크로 카드
  const calMacH = 114;
  ctx.fillStyle = '#EEEFFE'; rr(PAD, y, LW - PAD * 2, calMacH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 500);
  ctx.fillText('총 권장 칼로리', PAD + IH, y + IV);
  ctx.fillStyle = '#5058F0'; ctx.font = font(30, 800);
  const calStr = result.totalCalories.toLocaleString();
  ctx.fillText(calStr, PAD + IH, y + IV + 15);
  const calW = ctx.measureText(calStr).width;
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(13, 500); ctx.textBaseline = 'alphabetic';
  ctx.fillText(' kcal', PAD + IH + calW, y + IV + 15 + 30);

  // 매크로 바
  const { carbs = 0, protein = 0, fat = 0 } = result.macros ?? {};
  const macTotal = carbs + protein + fat;
  const carbPct  = macTotal > 0 ? carbs   / macTotal * 100 : 55;
  const protPct  = macTotal > 0 ? protein / macTotal * 100 : 25;
  const fatPct   = macTotal > 0 ? fat     / macTotal * 100 : 20;
  const barX = PAD + IH;
  const barW = LW - PAD * 2 - IH * 2;
  const barY = y + IV + 15 + 36;
  ctx.fillStyle = '#D0D2E8'; rr(barX, barY, barW, 6, 3); ctx.fill();
  const cx = barX + barW * carbPct / 100;
  const px = barX + barW * (carbPct + protPct) / 100;
  if (carbPct > 0) { ctx.fillStyle = '#E6A820'; rr(barX, barY, barW * carbPct / 100, 6, 3); ctx.fill(); }
  if (protPct > 0) { ctx.fillStyle = '#6BAF8B'; ctx.fillRect(cx, barY, barW * protPct / 100, 6); }
  if (fatPct  > 0) { ctx.fillStyle = '#F06060'; rr(px, barY, barW * fatPct / 100, 6, 3); ctx.fill(); }

  // 매크로 레이블
  ctx.textBaseline = 'top';
  const colW3 = barW / 3;
  [
    { label: '탄수화물', value: carbs,   color: '#E6A820' },
    { label: '단백질',   value: protein, color: '#6BAF8B' },
    { label: '지방',     value: fat,     color: '#F06060' },
  ].forEach(({ label, value, color }, i) => {
    const cx2 = barX + colW3 * i + colW3 / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9EA3B0'; ctx.font = font(9, 400);
    ctx.fillText(label, cx2, barY + 8);
    ctx.fillStyle = color; ctx.font = font(12, 700);
    ctx.fillText(`${Math.round(value * 10) / 10}g`, cx2, barY + 19);
  });

  y += calMacH + GAP;

  // 끼니별 카드
  const mCardY = y;
  ctx.fillStyle = 'white'; rr(PAD, mCardY, LW - PAD * 2, mealsH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 500);
  ctx.fillText('끼니별 추천 식단', PAD + IH, mCardY + IV);

  let mY = mCardY + IV + 15 + 10;
  (Object.entries(MEAL_META) as [keyof typeof MEAL_META, (typeof MEAL_META)[keyof typeof MEAL_META]][]).forEach(([key, meta]) => {
    const items = result.meals?.[key];
    if (!items?.length) return;
    const mealCal = items.reduce((s, i) => s + (i.calories ?? 0), 0);

    // 끼니 헤더
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(meta.emoji, PAD + IH + 9, mY + 12);
    ctx.fillStyle = '#1A1A2E'; ctx.font = font(13, 700); ctx.textAlign = 'left';
    ctx.fillText(meta.label, PAD + IH + 24, mY + 12);
    ctx.fillStyle = meta.color; ctx.font = font(12, 700); ctx.textAlign = 'right';
    ctx.fillText(`${mealCal}kcal`, LW - PAD - IH, mY + 12);
    mY += 24 + 8;

    items.forEach((item) => {
      ctx.font = font(12, 600); ctx.fillStyle = '#1A1A2E'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const nameText = item.name + (item.amount ? ` (${item.amount})` : '');
      const rows = wrapText(ctx, nameText, PAD + IH + 10, mY, innerW - 60, LINE_H);
      ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 400); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`${item.calories}kcal`, LW - PAD - IH, mY);
      mY += rows * LINE_H + 4;
    });
    mY += 6;
  });
  y += mealsH + GAP;

  // 팁 카드
  const tCardY = y;
  ctx.fillStyle = '#EAF5EE'; rr(PAD, tCardY, LW - PAD * 2, tipsH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#4A9B6F'; ctx.font = font(11, 700);
  ctx.fillText('💡 영양사 팁', PAD + IH, tCardY + IV);
  let tY = tCardY + IV + 15 + 8;
  result.tips?.forEach((tip) => {
    ctx.fillStyle = '#2D6A4F'; ctx.font = font(12, 400); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const rows = wrapText(ctx, '• ' + tip, PAD + IH, tY, innerW, LINE_H);
    tY += rows * LINE_H + 6;
  });
  y += tipsH + GAP;

  // 워터마크
  ctx.fillStyle = '#C8CADB'; ctx.font = font(10, 400);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('powered by 먹로그', LW / 2, LH - 16);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = '먹로그_AI맞춤식단.png';
  a.href = url; a.click();
  URL.revokeObjectURL(url);
}

// ── 운동 PNG 내보내기 ────────────────────────────────────
async function exportExerciseAsPng(
  result: ExerciseResult,
  profile: { goal: string; height?: number | null; weight?: number | null },
) {
  await document.fonts.ready;

  const DPR = 8;
  const LW  = 540;
  const PAD = 28;
  const IH  = 16;
  const IV  = 14;
  const SEC_R = 14;
  const GAP = 14;
  const LINE_H = 20;
  const font = makeFont;

  const innerW = LW - PAD * 2 - IH * 2;

  const tmpC = document.createElement('canvas');
  tmpC.width = LW * DPR; tmpC.height = 100 * DPR;
  const tmpCtx = tmpC.getContext('2d')!;
  tmpCtx.scale(DPR, DPR);

  // 높이 계산
  let totalH = PAD + 48 + 52 + GAP + 70 + GAP;

  // 요일별 스케줄
  let schedH = IV + 15 + 10;
  result.schedule?.forEach((day) => {
    schedH += 28 + 6;
    day.exercises?.forEach((ex) => {
      const exText = ex.name + '  ' + (ex.sets ? `${ex.sets}세트×${ex.reps}` : ex.duration ?? '');
      tmpCtx.font = font(12, 400);
      const rows = Math.ceil(tmpCtx.measureText(exText).width / (innerW - 14)) || 1;
      schedH += rows * LINE_H + 4;
      if (ex.rest) schedH += LINE_H; // 휴식 표기 줄 반영
    });
    schedH += 10;
  });
  schedH += IV;
  totalH += schedH + GAP;

  // 팁
  let tipsH = IV + 15 + 8;
  result.tips?.forEach((tip) => {
    tmpCtx.font = font(12, 400);
    const rows = wrapText(tmpCtx, '• ' + tip, 0, 0, innerW, LINE_H);
    tipsH += rows * LINE_H + 6;
  });
  tipsH += IV;
  totalH += tipsH + 24 + PAD;

  const LH = Math.max(totalH, Math.round(LW * 16 / 9));

  const canvas = document.createElement('canvas');
  canvas.width  = LW * DPR;
  canvas.height = LH * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);
  const rr = makeRR(ctx);

  const bg = ctx.createLinearGradient(0, 0, LW, LH);
  bg.addColorStop(0, '#FAFAFA');
  bg.addColorStop(1, '#F0F4FF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LW, LH);

  let y = PAD;

  // 로고
  ctx.fillStyle = '#5058F0'; rr(PAD, y, 28, 28, 8); ctx.fill();
  ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💪', PAD + 14, y + 14);
  ctx.fillStyle = '#1A1A2E'; ctx.font = font(14, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('먹로그', PAD + 36, y + 14);
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 500); ctx.textAlign = 'right';
  ctx.fillText('AI 운동 루틴', LW - PAD, y + 14);
  y += 48;

  // 프로필 카드
  const profH = 52;
  ctx.fillStyle = 'white'; rr(PAD, y, LW - PAD * 2, profH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5058F0'; ctx.font = font(22, 700);
  ctx.fillText(profile.goal === 'lose' ? '🔥' : profile.goal === 'gain' ? '💪' : '⚖️', PAD + IH, y + profH / 2);
  ctx.fillStyle = '#1A1A2E'; ctx.font = font(13, 700);
  const goalLabel = profile.goal === 'lose' ? '체중 감량' : profile.goal === 'gain' ? '근육 증량' : '체중 유지';
  ctx.fillText(goalLabel, PAD + IH + 30, y + profH / 2 - 8);
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 400);
  const profDetail = [
    profile.height ? `${profile.height}cm` : null,
    profile.weight ? `${profile.weight}kg` : null,
  ].filter(Boolean).join(' · ');
  ctx.fillText(profDetail || '신체정보 미입력', PAD + IH + 30, y + profH / 2 + 9);
  y += profH + GAP;

  // 소모 칼로리 요약 카드
  const sumH = 70;
  ctx.fillStyle = '#FEF0EC'; rr(PAD, y, LW - PAD * 2, sumH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 500);
  ctx.fillText('주간 예상 소모 칼로리', PAD + IH, y + IV);
  ctx.fillStyle = '#F06060'; ctx.font = font(28, 800);
  const burnStr = (result.weeklyCaloriesBurned ?? 0).toLocaleString();
  ctx.fillText(burnStr, PAD + IH, y + IV + 15);
  const burnW = ctx.measureText(burnStr).width;
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(13, 500); ctx.textBaseline = 'alphabetic';
  ctx.fillText(' kcal', PAD + IH + burnW, y + IV + 15 + 28);
  if (result.restDays?.length) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#9EA3B0'; ctx.font = font(10, 400);
    ctx.fillText('휴식일', LW - PAD - IH, y + IV);
    ctx.fillStyle = '#5A5E72'; ctx.font = font(13, 700);
    ctx.fillText(result.restDays.join(' · '), LW - PAD - IH, y + IV + 15);
  }
  y += sumH + GAP;

  // 스케줄 카드
  const focusColors = ['#5058F0', '#F9B77B', '#6BAF8B', '#F06060', '#E6A820', '#A78BFA', '#5058F0'];
  const sCardY = y;
  ctx.fillStyle = 'white'; rr(PAD, sCardY, LW - PAD * 2, schedH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#9EA3B0'; ctx.font = font(11, 500);
  ctx.fillText('1주일 운동 스케줄', PAD + IH, sCardY + IV);

  let sY = sCardY + IV + 15 + 10;
  result.schedule?.forEach((day, di) => {
    const fc = focusColors[di % focusColors.length];
    // 요일 + 집중부위 태그
    ctx.fillStyle = '#1A1A2E'; ctx.font = font(13, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(day.day, PAD + IH, sY + 14);
    const dayW = ctx.measureText(day.day).width;
    // 태그 배경
    const tagTx = day.focus;
    ctx.font = font(10, 600);
    const tagW = ctx.measureText(tagTx).width + 12;
    ctx.fillStyle = fc + '22';
    rr(PAD + IH + dayW + 8, sY + 4, tagW, 20, 10);
    ctx.fill();
    ctx.fillStyle = fc; ctx.font = font(10, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tagTx, PAD + IH + dayW + 8 + tagW / 2, sY + 14);

    ctx.fillStyle = '#9EA3B0'; ctx.font = font(10, 400); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(day.duration, LW - PAD - IH, sY + 14);
    sY += 28 + 6;

    day.exercises?.forEach((ex) => {
      const dot_x = PAD + IH + 6;
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.arc(dot_x, sY + 7, 2.5, 0, Math.PI * 2); ctx.fill();

      const exText = ex.name + '  ' + (ex.sets ? `${ex.sets}세트×${ex.reps}` : ex.duration ?? '');
      ctx.fillStyle = '#1A1A2E'; ctx.font = font(12, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const rows = wrapText(ctx, exText, PAD + IH + 14, sY, innerW - 14, LINE_H);
      if (ex.rest) {
        ctx.fillStyle = '#B0B4C4'; ctx.font = font(10, 400);
        ctx.fillText(`휴식 ${ex.rest}`, PAD + IH + 14, sY + rows * LINE_H);
        sY += (rows + 1) * LINE_H;
      } else {
        sY += rows * LINE_H;
      }
      sY += 4;
    });
    sY += 10;
  });
  y += schedH + GAP;

  // 팁 카드
  const tCardY = y;
  ctx.fillStyle = '#EEEFFE'; rr(PAD, tCardY, LW - PAD * 2, tipsH, SEC_R); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#5058F0'; ctx.font = font(11, 700);
  ctx.fillText('💡 트레이너 팁', PAD + IH, tCardY + IV);
  let tY2 = tCardY + IV + 15 + 8;
  result.tips?.forEach((tip) => {
    ctx.fillStyle = '#1A1A2E'; ctx.font = font(12, 400); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const rows = wrapText(ctx, '• ' + tip, PAD + IH, tY2, innerW, LINE_H);
    tY2 += rows * LINE_H + 6;
  });

  // 워터마크
  ctx.fillStyle = '#C8CADB'; ctx.font = font(10, 400);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('powered by 먹로그', LW / 2, LH - 16);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = '먹로그_AI운동루틴.png';
  a.href = url; a.click();
  URL.revokeObjectURL(url);
}

// ── 뷰 컴포넌트 ─────────────────────────────────────────
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
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(ex.name + ' 운동 방법')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-myeong text-sm text-cobalt font-bold underline-offset-2 hover:underline"
                  >
                    {ex.name}
                  </a>
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

function FeedbackResultView({ result, targetCalories }: { result: FeedbackResult; targetCalories: number }) {
  const score = result.overallScore ?? 0;
  const scoreColor = score >= 8 ? 'text-sage' : score >= 5 ? 'text-cobalt' : 'text-coral';
  const gradeClass = score >= 8
    ? 'bg-sage/10 text-sage border-sage/20'
    : score >= 5
    ? 'bg-cobalt/10 text-cobalt border-cobalt/20'
    : 'bg-coral/10 text-coral border-coral/20';

  return (
    <div className="space-y-3">
      {/* 종합 평가 */}
      <div className="bg-surface-card rounded-xl border border-hairline p-4 flex items-start gap-4">
        <div className="flex flex-col items-center flex-shrink-0">
          <span className={cn('font-myeong font-bold text-5xl leading-none', scoreColor)}>{score}</span>
          <span className="font-kedu text-xs text-muted mt-0.5">/ 10</span>
          <span className={cn('font-kedu text-xs font-bold px-2 py-0.5 rounded-pill border mt-1.5', gradeClass)}>
            {result.grade}
          </span>
        </div>
        <p className="font-myeong text-sm text-ink leading-relaxed flex-1">{result.summary}</p>
      </div>

      {/* 잘하고 있어요 */}
      {result.strengths?.length > 0 && (
        <div className="bg-sage/10 rounded-xl border border-sage/20 p-4">
          <p className="font-kedu font-bold text-sm text-sage mb-2">✅ 잘하고 있어요</p>
          <ul className="space-y-1.5">
            {result.strengths.map((s, i) => (
              <li key={i} className="font-myeong text-sm text-ink flex gap-2">
                <span className="text-sage flex-shrink-0 mt-[2px]">•</span><span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 개선할 점 */}
      {result.improvements?.length > 0 && (
        <div className="bg-ochre/10 rounded-xl border border-ochre/30 p-4">
          <p className="font-kedu font-bold text-sm text-ochre mb-2">📌 개선하면 좋아요</p>
          <ul className="space-y-1.5">
            {result.improvements.map((imp, i) => (
              <li key={i} className="font-myeong text-sm text-ink flex gap-2">
                <span className="text-ochre flex-shrink-0 mt-[2px]">•</span><span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 일별 칼로리 분석 */}
      {result.dailyAnalysis?.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-hairline p-4">
          <p className="font-kedu font-bold text-sm text-ink mb-3">📅 일별 칼로리</p>
          <div className="space-y-2.5">
            {result.dailyAnalysis.map((day, i) => {
              const pct = targetCalories > 0 ? Math.min(100, (day.calories / targetCalories) * 100) : 0;
              const barColor = day.status === '달성' ? '#6BAF8B'
                : day.status === '초과' ? '#F06060'
                : day.status === '미기록' ? '#D0D3E0'
                : '#E6A820';
              const tagClass = day.status === '달성' ? 'bg-sage/10 text-sage'
                : day.status === '초과' ? 'bg-coral/10 text-coral'
                : day.status === '미기록' ? 'bg-hairline text-muted'
                : 'bg-ochre/10 text-ochre';
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-kedu text-xs text-muted w-12 flex-shrink-0">{day.date}</span>
                    <div className="flex-1 bg-hairline rounded-full h-1.5">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="font-myeong text-xs font-bold text-ink w-20 text-right flex-shrink-0">
                      {day.calories > 0 ? `${day.calories.toLocaleString()}kcal` : '-'}
                    </span>
                    <span className={cn('font-kedu text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', tagClass)}>
                      {day.status}
                    </span>
                  </div>
                  {day.note && <p className="font-myeong text-xs text-muted pl-14">{day.note}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 실천 팁 */}
      {result.tips?.length > 0 && (
        <div className="bg-cobalt/10 rounded-xl border border-cobalt/20 p-4">
          <p className="font-kedu font-bold text-sm text-cobalt mb-2">💡 실천 팁</p>
          <ul className="space-y-1.5">
            {result.tips.map((tip, i) => (
              <li key={i} className="font-myeong text-sm text-ink flex gap-2">
                <span className="text-cobalt flex-shrink-0 mt-[2px]">•</span><span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 음식 조절 추천 */}
      {(result.focusFoods?.add?.length > 0 || result.focusFoods?.reduce?.length > 0) && (
        <div className="bg-surface-card rounded-xl border border-hairline p-4">
          <p className="font-kedu font-bold text-sm text-ink mb-3">🥗 이런 음식 어때요?</p>
          <div className="grid grid-cols-2 gap-3">
            {result.focusFoods?.add?.length > 0 && (
              <div>
                <p className="font-kedu text-xs text-sage font-bold mb-1.5">더 먹으면 좋아요</p>
                <div className="flex flex-wrap gap-1">
                  {result.focusFoods.add.map((food, i) => (
                    <span key={i} className="font-kedu text-xs bg-sage/10 text-sage border border-sage/20 px-2 py-0.5 rounded-pill">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.focusFoods?.reduce?.length > 0 && (
              <div>
                <p className="font-kedu text-xs text-coral font-bold mb-1.5">줄이면 좋아요</p>
                <div className="flex flex-wrap gap-1">
                  {result.focusFoods.reduce.map((food, i) => (
                    <span key={i} className="font-kedu text-xs bg-coral/10 text-coral border border-coral/20 px-2 py-0.5 rounded-pill">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────
export default function AICoachPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<CoachTab>('diet');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dietResult, setDietResult] = useState<DietResult | null>(null);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasProfile = !!user?.height && !!user?.weight;
  const goalMeta = GOAL_META[user?.goalType ?? 'maintain'] ?? GOAL_META.maintain;

  // localStorage 복원
  useEffect(() => {
    try {
      const savedDiet     = localStorage.getItem('ai-coach-diet');
      const savedExercise = localStorage.getItem('ai-coach-exercise');
      const savedFeedback = localStorage.getItem('ai-coach-feedback');
      if (savedDiet)     setDietResult(JSON.parse(savedDiet).result);
      if (savedExercise) setExerciseResult(JSON.parse(savedExercise).result);
      if (savedFeedback) setFeedbackResult(JSON.parse(savedFeedback).result);
    } catch {}
  }, []);

  const savedDietAt: string | null = (() => {
    try { return JSON.parse(localStorage.getItem('ai-coach-diet') ?? 'null')?.savedAt ?? null; } catch { return null; }
  })();
  const savedExerciseAt: string | null = (() => {
    try { return JSON.parse(localStorage.getItem('ai-coach-exercise') ?? 'null')?.savedAt ?? null; } catch { return null; }
  })();
  const savedFeedbackAt: string | null = (() => {
    try { return JSON.parse(localStorage.getItem('ai-coach-feedback') ?? 'null')?.savedAt ?? null; } catch { return null; }
  })();
  const currentSavedAt = tab === 'diet' ? savedDietAt : tab === 'exercise' ? savedExerciseAt : savedFeedbackAt;

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let meals: FrontendDaySummary[] | undefined;

      if (tab === 'feedback') {
        // 최근 7일 식단 병렬 조회
        const today = new Date();
        const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
        const dateStrs = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          return d.toISOString().slice(0, 10);
        });

        const results = await Promise.all(
          dateStrs.map(async (date) => {
            try {
              const res = await mealApi.getByDate(date);
              const dayMeals = (res.data?.data ?? res.data ?? []) as Array<{
                mealType: string;
                detectedFoods?: Array<{
                  foodName: string;
                  calories: number;
                  carbs: number;
                  protein: number;
                  fat: number;
                }>;
              }>;
              if (!dayMeals.length) return null;

              const d = new Date(date);
              return {
                date,
                dayLabel: `${d.getMonth() + 1}/${d.getDate()}(${DAY_KO[d.getDay()]})`,
                targetCalories: user?.targetCalories ?? 2000,
                totalCalories: dayMeals.reduce((s, m) =>
                  s + (m.detectedFoods?.reduce((ss, f) => ss + (f.calories ?? 0), 0) ?? 0), 0),
                carbs: dayMeals.reduce((s, m) =>
                  s + (m.detectedFoods?.reduce((ss, f) => ss + (f.carbs ?? 0), 0) ?? 0), 0),
                protein: dayMeals.reduce((s, m) =>
                  s + (m.detectedFoods?.reduce((ss, f) => ss + (f.protein ?? 0), 0) ?? 0), 0),
                fat: dayMeals.reduce((s, m) =>
                  s + (m.detectedFoods?.reduce((ss, f) => ss + (f.fat ?? 0), 0) ?? 0), 0),
                meals: dayMeals
                  .map(m => ({
                    type: MEAL_TYPE_KO[m.mealType] ?? m.mealType,
                    foods: m.detectedFoods?.map(f => `${f.foodName}(${f.calories}kcal)`) ?? [],
                  }))
                  .filter(m => m.foods.length > 0),
              } satisfies FrontendDaySummary;
            } catch {
              return null;
            }
          })
        );

        meals = results.filter((r): r is FrontendDaySummary => r !== null);

        if (!meals.length) {
          setError('최근 7일간 기록된 식단이 없어요. 카메라로 식사를 먼저 기록해보세요!');
          setIsLoading(false);
          return;
        }
      }

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
          ...(meals && { meals }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI 오류');

      const savedAt = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      if (tab === 'diet') {
        setDietResult(data);
        try { localStorage.setItem('ai-coach-diet', JSON.stringify({ result: data, savedAt })); } catch {}
      } else if (tab === 'exercise') {
        setExerciseResult(data);
        try { localStorage.setItem('ai-coach-exercise', JSON.stringify({ result: data, savedAt })); } catch {}
      } else {
        setFeedbackResult(data);
        try { localStorage.setItem('ai-coach-feedback', JSON.stringify({ result: data, savedAt })); } catch {}
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const profile = {
        goal:           user?.goalType ?? 'maintain',
        height:         user?.height,
        weight:         user?.weight,
        targetCalories: user?.targetCalories,
      };
      if (tab === 'diet' && dietResult) {
        await exportDietAsPng(dietResult, profile);
      } else if (tab === 'exercise' && exerciseResult) {
        await exportExerciseAsPng(exerciseResult, profile);
      }
    } catch (err) {
      console.error('이미지 내보내기 실패:', err);
      alert('이미지 저장에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentResult = tab === 'diet' ? dietResult : tab === 'exercise' ? exerciseResult : feedbackResult;

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
      <div className="flex px-md py-sm gap-1.5">
        {([
          ['diet',     '🍽️ 맞춤식단'],
          ['exercise', '💪 운동루틴'],
          ['feedback', '📊 피드백'],
        ] as [CoachTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null); }}
            className={cn(
              'flex-1 h-10 rounded-xl font-kedu font-bold text-xs transition-colors',
              tab === key ? 'bg-cobalt text-white' : 'bg-surface-soft text-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-md pb-lg space-y-3">
        {/* 마지막 저장 표시 */}
        {currentSavedAt && !dietResult && !exerciseResult ? null : currentSavedAt && (
          <p className="font-kedu text-xs text-muted text-right">마지막 저장: {currentSavedAt}</p>
        )}

        {/* 생성 + 저장 버튼 행 */}
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={isLoading || (tab !== 'feedback' && !hasProfile)}
            className="flex-1 h-12 bg-ink text-white font-kedu font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {isLoading ? (
              <><Loader2 size={18} className="animate-spin" />
                {tab === 'feedback' ? '식단 기록 분석 중...' : 'AI가 분석 중이에요...'}</>
            ) : currentResult ? (
              <><RefreshCw size={16} />{tab === 'feedback' ? '다시 분석하기' : '다시 추천받기'}</>
            ) : (
              <><Sparkles size={18} />{
                tab === 'diet'     ? 'AI 맞춤 식단 추천받기' :
                tab === 'exercise' ? 'AI 운동 루틴 받기' :
                                     '7일 식단 AI 분석하기'
              }</>
            )}
          </button>

          {currentResult && tab !== 'feedback' && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                'h-12 px-4 rounded-xl font-kedu font-bold text-sm flex items-center gap-1.5 transition-all active:scale-95',
                isExporting
                  ? 'bg-hairline text-muted'
                  : 'bg-cobalt/10 text-cobalt border border-cobalt/30'
              )}
            >
              {isExporting
                ? <Loader2 size={16} className="animate-spin" />
                : <ImageDown size={16} />}
              저장
            </button>
          )}
        </div>

        {!hasProfile && tab !== 'feedback' && (
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

        {!isLoading && !currentResult && !error && (tab === 'feedback' || hasProfile) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Sparkles size={40} className="text-cobalt/30" />
            <p className="font-kedu font-bold text-base text-ink">
              {tab === 'diet'     ? '오늘의 맞춤 식단을 추천받아보세요' :
               tab === 'exercise' ? '나만의 운동 루틴을 만들어보세요' :
                                    '지난 7일 식단을 AI가 분석해드려요'}
            </p>
            <p className="font-myeong text-sm text-muted">
              {tab === 'diet'     ? '신체 정보와 목표를 바탕으로 AI가 최적 식단을 짜드려요' :
               tab === 'exercise' ? '목표와 활동 수준에 맞는 1주일 루틴을 제안해드려요' :
                                    '카메라로 기록한 실제 식사 데이터를 바탕으로 맞춤 피드백을 드려요'}
            </p>
          </div>
        )}

        {tab === 'diet'     && dietResult     && <DietResultView result={dietResult} />}
        {tab === 'exercise' && exerciseResult  && <ExerciseResultView result={exerciseResult} />}
        {tab === 'feedback' && feedbackResult  && (
          <FeedbackResultView result={feedbackResult} targetCalories={user?.targetCalories ?? 2000} />
        )}
      </main>
    </div>
  );
}
