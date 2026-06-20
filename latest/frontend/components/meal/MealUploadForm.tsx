'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Camera, Image as ImageIcon, Trash2, Plus, Loader2, Check } from 'lucide-react';
import { useMealUpload } from '@/hooks/useMealUpload';
import { MEAL_TYPE_LABELS } from '@/lib/constants';
import type { DetectedFood, MealType } from '@/types';
import { cn, formatCalories } from '@/lib/utils';
import { NutritionDetail } from './NutritionDetail';
import { FoodSearchModal } from './FoodSearchModal';
import { FoodAutocomplete } from './FoodAutocomplete';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_META: Record<MealType, { emoji: string; color: string; bg: string; label: string }> = {
  breakfast: { emoji: '🌅', color: 'text-peach',  bg: 'bg-peach',  label: '아침' },
  lunch:     { emoji: '☀️', color: 'text-ochre',  bg: 'bg-ochre',  label: '점심' },
  dinner:    { emoji: '🌙', color: 'text-cobalt', bg: 'bg-cobalt', label: '저녁' },
  snack:     { emoji: '🍪', color: 'text-sage',   bg: 'bg-sage',   label: '간식' },
};

function getTimeGreeting(): { greeting: string; sub: string; icon: string; mealType: MealType } {
  const h = new Date().getHours();
  if (h >= 4  && h < 10) return { greeting: '좋은 아침이에요',  sub: '아침 식사를 기록해볼까요?',  icon: '🌅', mealType: 'breakfast' };
  if (h >= 10 && h < 14) return { greeting: '맛있는 점심이에요', sub: '오늘 점심은 뭘 드셨나요?',  icon: '☀️', mealType: 'lunch' };
  if (h >= 14 && h < 18) return { greeting: '오후도 잘 지내요',  sub: '간식이나 식사를 기록해요',   icon: '🫖', mealType: 'snack' };
  if (h >= 18 && h < 22) return { greeting: '저녁 식사 시간이에요', sub: '오늘 저녁은 뭘 드셨나요?', icon: '🌙', mealType: 'dinner' };
  return { greeting: '늦은 시간이네요',    sub: '야식도 기록해두세요',         icon: '🌃', mealType: 'snack' };
}

function formatServing(ratio: number): string {
  const whole = Math.floor(ratio);
  const isHalf = Math.abs((ratio % 1) - 0.5) < 0.01;
  if (whole === 0 && isHalf) return '½인분';
  if (isHalf) return `${whole}½인분`;
  return `${whole}인분`;
}

/* 영양소 색상 레일 — 상징적 의미: 탄단지의 시각적 균형 */
function NutrientRail() {
  return (
    <div className="flex items-center gap-[3px]" title="탄수화물 · 단백질 · 지방">
      {[
        { color: 'bg-ochre',  w: 'w-8',  label: '탄' },
        { color: 'bg-sage',   w: 'w-6',  label: '단' },
        { color: 'bg-coral',  w: 'w-5',  label: '지' },
      ].map(({ color, w, label }) => (
        <div key={label} className="flex flex-col items-center gap-[2px]">
          <div className={cn('h-1 rounded-pill opacity-60', color, w)} />
        </div>
      ))}
    </div>
  );
}

/* 접시 업로드 존 — 상징: 식사 기록 = 접시 위에 올리는 행위 */
function PlateUploadZone({ onClick, onDrop }: {
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: 220, height: 220 }}
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* 접시 외곽 테두리 — 가장 바깥 림(rim) */}
      <div
        className="absolute inset-0 rounded-full border-[3px] border-peach opacity-30"
        style={{ animation: 'spinSlow 20s linear infinite' }}
      />
      {/* 접시 중간 영역 — 음식이 올라가는 면 */}
      <div
        className="absolute rounded-full bg-surface-card border-[1.5px] border-peach"
        style={{ inset: 12 }}
      />
      {/* 접시 안쪽 원 — 접시 중심부 */}
      <div
        className="absolute rounded-full bg-surface-soft"
        style={{ inset: 28 }}
      />

      {/* 카메라 아이콘 — 사진 찍기 행위의 상징 */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        {/* 펄스 링: "카메라가 준비됐어요" */}
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-14 h-14 rounded-full bg-peach opacity-20"
            style={{ animation: 'pulseRing 2s ease-out infinite' }}
          />
          <span
            className="absolute w-14 h-14 rounded-full bg-peach opacity-10"
            style={{ animation: 'pulseRing 2s ease-out 0.7s infinite' }}
          />
          <div className="relative w-14 h-14 rounded-full bg-peach flex items-center justify-center shadow-sm">
            <Camera size={22} className="text-ink" />
          </div>
        </div>
        <p className="font-kedu text-xs text-muted text-center leading-snug mt-1">
          탭해서 사진 선택
        </p>
      </div>

      {/* 접시 림 위에 음식 재료 점들 — 식재료의 상징 */}
      {[
        { angle: 0,   emoji: '🥬' },
        { angle: 60,  emoji: '🍅' },
        { angle: 120, emoji: '🧅' },
        { angle: 180, emoji: '🥕' },
        { angle: 240, emoji: '🌽' },
        { angle: 300, emoji: '🍄' },
      ].map(({ angle, emoji }) => {
        const rad = (angle * Math.PI) / 180;
        const r   = 100;
        const cx  = Math.round((110 + r * Math.sin(rad)) * 100) / 100;
        const cy  = Math.round((110 - r * Math.cos(rad)) * 100) / 100;
        return (
          <div
            key={angle}
            className="absolute pointer-events-none select-none"
            style={{
              left: cx,
              top: cy,
              width: 32,
              height: 32,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                fontSize: 24,
                lineHeight: 1,
                opacity: 0.5,
                animation: `floatSlow ${2.5 + (angle / 60) * 0.4}s ease-in-out ${(angle / 60) * 0.3}s infinite`,
              }}
            >
              {emoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MealUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const {
    step, previewUrl, mealType, setMealType,
    editedFoods, caption, setCaption,
    handleFileSelect, startUpload, saveEdits,
    updateFood, removeFood, addFood, addFoods, reset,
    isSaving, totalCalories, totalCarbs, totalProtein, totalFat,
    servingRatio, applyServingRatio, applyServingGrams, originalTotalGrams,
    selectedGroupIds, toggleGroupId, groups,
  } = useMealUpload();

  const [unitMode, setUnitMode] = useState<'serving' | 'gram'>('serving');
  const [gramInput, setGramInput] = useState('');
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  useEffect(() => {
    if (step === 'select') {
      setUnitMode('serving');
      setGramInput('');
    }
  }, [step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const { greeting, sub, icon, mealType: suggestedType } = getTimeGreeting();

  /* ── Step 1: 사진 선택 ──────────────────────────────── */
  if (step === 'select') {
    return (
      <div className="flex flex-col">

        {/* ── Section 1: 인사 — canvas 배경 ── */}
        <div className="px-[22px] pt-sm pb-xl animate-fade-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-kedu font-bold text-[22px] text-ink leading-tight tracking-[0.02em]">{greeting}</p>
              <p className="font-kedu text-sm text-muted mt-1">{sub}</p>
              <div className="mt-2">
                <NutrientRail />
              </div>
            </div>
            <span
              className="text-5xl leading-none mt-1 animate-float-slow"
              style={{ animationDuration: '4s' }}
            >
              {icon}
            </span>
          </div>
        </div>

        {/* ── Section 2: 접시 존 — surface-card(흰) 시트, 위로 올라오는 느낌 ── */}
        <div className="bg-surface-card rounded-t-[28px] flex flex-col items-center px-md pt-xl pb-lg animate-fade-slide-up stagger-2"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}
        >
          <PlateUploadZone
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
          />
          <p className="font-kedu text-xs text-muted mt-3 text-center">
            드래그하거나 탭해서 음식 사진을 올려요
          </p>
        </div>

        {/* ── Section 3: 액션 존 — surface-soft, 버튼 + 태그 ── */}
        <div className="bg-surface-soft px-md pt-md pb-lg space-y-sm rounded-b-[28px] animate-fade-slide-up stagger-3">

          {/* 버튼 */}
          <div className="flex gap-sm">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 h-12 rounded-md bg-peach font-kedu font-bold text-[15px] text-ink flex items-center justify-center gap-xs active:scale-95 transition-transform"
            >
              <Camera size={17} />
              카메라 촬영
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-12 rounded-md bg-surface-card border border-hairline font-kedu font-bold text-[15px] text-ink flex items-center justify-center gap-xs active:scale-95 transition-transform"
            >
              <ImageIcon size={17} />
              갤러리 선택
            </button>
          </div>

          {/* 식사 시간대 — 가로 타임라인 바 */}
          {(() => {
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            // 오전 6시(360) ~ 오후 10시(1320) = 960분 기준
            const markerPct = Math.max(0, Math.min(100, ((currentMins - 360) / 960) * 100));

            // flex 비율 = 시간 길이 기반 (아침5h·점심4h·간식3h·저녁4h)
            const segments = [
              { type: 'breakfast' as MealType, emoji: '🌅', label: '아침', bg: 'bg-peach',  flex: 5 },
              { type: 'lunch'     as MealType, emoji: '☀️', label: '점심', bg: 'bg-ochre',  flex: 4 },
              { type: 'snack'     as MealType, emoji: '🍪', label: '간식', bg: 'bg-sage',   flex: 3 },
              { type: 'dinner'    as MealType, emoji: '🌙', label: '저녁', bg: 'bg-cobalt', flex: 4 },
            ];

            // 경계 시간 레이블 위치 (flex 합계 16 기준 누적)
            // 6시(0%) → 11시(5/16=31.25%) → 15시(9/16=56.25%) → 18시(12/16=75%) → 22시(100%)
            const boundaries = [
              { label: '6시',  pct: 0 },
              { label: '11시', pct: 31.25 },
              { label: '15시', pct: 56.25 },
              { label: '18시', pct: 75 },
              { label: '22시', pct: 100 },
            ];

            return (
              <div className="w-full">
                <div className="relative flex rounded overflow-hidden" style={{ height: 28 }}>
                  {segments.map(({ type, emoji, label, bg, flex }, i) => {
                    const isActive = type === suggestedType;
                    return (
                      <div
                        key={type}
                        className={cn(
                          'flex items-center justify-center gap-[3px] transition-opacity',
                          bg,
                          isActive ? 'opacity-100' : 'opacity-20',
                          i > 0 && 'border-l border-white/40'
                        )}
                        style={{ flex }}
                      >
                        <span className="text-[11px] leading-none">{emoji}</span>
                        <span className={cn(
                          'font-kedu text-[11px] leading-none',
                          isActive ? 'font-bold text-ink' : 'text-ink'
                        )}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                  {/* 현재 시각 마커 — 시계 바늘 */}
                  {markerPct > 1 && markerPct < 99 && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white/80 pointer-events-none"
                      style={{ left: `${markerPct}%` }}
                    />
                  )}
                </div>
                {/* 경계 시간 레이블 */}
                <div className="relative h-[14px] mt-[2px]">
                  {boundaries.map(({ label, pct }) => (
                    <span
                      key={label + pct}
                      className="absolute font-myeong text-[9px] text-muted-soft leading-none whitespace-nowrap"
                      style={{
                        left: `${pct}%`,
                        transform: pct === 0 ? 'none' : pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  /* ── Step 2: 카테고리 선택 ──────────────────────────── */
  if (step === 'category') {
    return (
      <div className="px-md pb-lg pt-2 space-y-md">

        {/* 사진 프리뷰 */}
        {previewUrl && (
          <div className="aspect-[4/3] relative rounded-xl overflow-hidden animate-scale-in">
            <Image src={previewUrl} alt="선택한 사진" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <p className="absolute bottom-3 left-4 font-kedu font-bold text-white text-base">
              어떤 식사인가요?
            </p>
          </div>
        )}

        {/* 식사 종류 선택 — 각 타입의 색상이 시간대를 상징 */}
        <div className="grid grid-cols-4 gap-xs animate-fade-slide-up">
          {(Object.entries(MEAL_META) as [MealType, typeof MEAL_META[MealType]][]).map(([type, meta], i) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={cn(
                'flex flex-col items-center gap-xxs py-md rounded-lg font-kedu text-xs transition-all active:scale-95',
                `stagger-${i + 1} animate-fade-slide-up`,
                mealType === type
                  ? `${meta.bg} text-ink font-bold`
                  : 'bg-surface-card border border-hairline text-muted'
              )}
            >
              <span className="text-xl">{meta.emoji}</span>
              {MEAL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <button
          onClick={startUpload}
          className="w-full h-12 rounded-md bg-peach font-kedu font-bold text-[15px] text-ink flex items-center justify-center gap-xs active:scale-95 transition-transform animate-fade-slide-up stagger-5"
        >
          AI 분석 시작 →
        </button>
        <button
          onClick={reset}
          className="w-full h-11 rounded-md bg-surface-card border border-hairline font-kedu text-[15px] text-muted active:scale-95 transition-transform"
        >
          다시 선택
        </button>
      </div>
    );
  }

  /* ── Step 3: AI 분석 중 ─────────────────────────────── */
  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-md">

        {/* 라벤더 AccentCard — 스펙: AI 분석 = lavender */}
        <div className="w-full bg-lavender rounded-xl p-xl flex flex-col items-center gap-lg animate-scale-in">

          {/* AI 뱃지 */}
          <div className="flex items-center gap-xs bg-surface-card rounded-pill px-sm py-[5px]">
            <div className="w-2 h-2 rounded-full bg-cobalt" style={{ animation: 'bounceDot 1s ease-in-out infinite' }} />
            <div className="w-2 h-2 rounded-full bg-cobalt" style={{ animation: 'bounceDot 1s ease-in-out 0.2s infinite' }} />
            <div className="w-2 h-2 rounded-full bg-cobalt" style={{ animation: 'bounceDot 1s ease-in-out 0.4s infinite' }} />
            <span className="font-myeong text-xs text-cobalt font-bold ml-xs">분석 중</span>
          </div>

          {/* 음식 사진 + 스캔 효과 — "AI가 접시를 읽고 있다" */}
          {previewUrl && (
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-surface-card shadow-sm">
              <Image src={previewUrl} alt="분석 중" fill className="object-cover" />
              {/* 스캔 라인 */}
              <div className="absolute left-0 right-0 h-0.5 bg-white/80 animate-scan-line" />
              {/* 원형 스캔 오버레이 */}
              <div className="absolute inset-0 rounded-full border-2 border-cobalt/40"
                style={{ animation: 'pulseRing 2s ease-out infinite' }} />
            </div>
          )}

          <div className="text-center">
            <p className="font-kedu font-bold text-[17px] text-ink">음식과 영양소를 인식하고 있어요</p>
            <p className="font-kedu text-sm text-muted mt-1">칼로리 · 탄수화물 · 단백질 · 지방</p>
          </div>

          {/* 영양소 컬러 로딩바 — 탄단지 순서대로 채워지는 것처럼 표현 */}
          <div className="w-full flex gap-xs">
            {[
              { color: 'bg-ochre', label: '탄', stagger: '' },
              { color: 'bg-sage',  label: '단', stagger: 'stagger-2' },
              { color: 'bg-coral', label: '지', stagger: 'stagger-4' },
            ].map(({ color, label, stagger }) => (
              <div key={label} className="flex-1">
                <div className="h-1.5 rounded-pill bg-surface-card overflow-hidden">
                  <div className={cn('h-full rounded-pill animate-shimmer-fill', color, stagger)} />
                </div>
                <p className="font-myeong text-[10px] text-muted mt-1 text-center uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  /* ── Step 4: 결과 확인 ──────────────────────────────── */
  if (step === 'review') {
    return (
      <div className="px-md space-y-md pb-lg">

        {/* 사진 */}
        {previewUrl && (
          <div className="aspect-[4/3] relative rounded-xl overflow-hidden animate-scale-in">
            <Image src={previewUrl} alt="음식 사진" fill className="object-cover" />
          </div>
        )}

        {/* 칼로리 카드 — surface-card + 영양소 레일로 의미 전달 */}
        <div className="bg-surface-card rounded-xl border border-hairline p-md animate-fade-slide-up">
          {/* 영양소 레일 (상단 장식이 아닌 실제 비율을 나타내는 막대) */}
          {(() => {
            const total = totalCarbs + totalProtein + totalFat;
            const cPct  = total > 0 ? (totalCarbs   / total) * 100 : 55;
            const pPct  = total > 0 ? (totalProtein / total) * 100 : 25;
            const fPct  = total > 0 ? (totalFat     / total) * 100 : 20;
            return (
              <div className="flex rounded-pill overflow-hidden h-3 mb-md">
                <div className="bg-ochre transition-all duration-700" style={{ width: `${cPct}%` }} title={`탄수화물 ${Math.round(cPct)}%`} />
                <div className="bg-sage  transition-all duration-700" style={{ width: `${pPct}%` }} title={`단백질 ${Math.round(pPct)}%`} />
                <div className="bg-coral transition-all duration-700" style={{ width: `${fPct}%` }} title={`지방 ${Math.round(fPct)}%`} />
              </div>
            );
          })()}
          <div className="flex items-baseline gap-xs pl-[2px]">
            <span className="font-myeong font-extrabold text-[32px] text-ink leading-none">{formatCalories(totalCalories)}</span>
            <span className="font-myeong text-xs text-muted">kcal</span>
          </div>
          <div className="mt-sm">
            <NutritionDetail carbs={totalCarbs} protein={totalProtein} fat={totalFat} />
          </div>
        </div>

        {/* 양 조절 */}
        <div className="bg-surface-card rounded-xl border border-hairline p-md animate-fade-slide-up stagger-2">
          <div className="flex items-center justify-between mb-sm">
            <div>
              <p className="font-kedu font-bold text-sm text-ink">양 조절</p>
              <p className="font-myeong text-[11px] text-muted mt-[2px]">사진 속 음식 전체 = 1인분 기준</p>
            </div>
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              {(['serving', 'gram'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode === 'serving') {
                      const snapped = Math.max(0.5, Math.round(servingRatio * 2) / 2);
                      applyServingRatio(snapped);
                      setUnitMode('serving');
                    } else {
                      setGramInput(String(Math.round(originalTotalGrams * servingRatio)));
                      setUnitMode('gram');
                    }
                  }}
                  className={cn(
                    'px-sm py-[5px] font-kedu text-xs transition-colors',
                    unitMode === mode ? 'bg-cobalt text-white font-bold' : 'bg-surface-card text-muted'
                  )}
                >
                  {mode === 'serving' ? '인분' : 'g'}
                </button>
              ))}
            </div>
          </div>

          {unitMode === 'serving' ? (
            <div>
              <div className="flex items-center justify-between mb-xs">
                <span className="font-kedu text-xs text-muted">0.5인분</span>
                <span className="font-kedu font-bold text-[15px] text-cobalt">{formatServing(servingRatio)}</span>
                <span className="font-kedu text-xs text-muted">4인분</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.5}
                value={Math.min(4, Math.max(0.5, servingRatio))}
                onChange={(e) => applyServingRatio(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: '#5058f0' }}
              />
              <div className="flex justify-between mt-xs px-[2px]">
                {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => (
                  <span
                    key={v}
                    className={cn(
                      'font-myeong text-[9px] w-4 text-center',
                      Math.abs(servingRatio - v) < 0.01 ? 'text-cobalt font-bold' : 'text-muted-soft'
                    )}
                  >
                    {v % 1 === 0 ? `${v}` : '·'}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-sm">
              <input
                type="number"
                min={1}
                value={gramInput}
                onChange={(e) => {
                  setGramInput(e.target.value);
                  const n = Number(e.target.value);
                  if (n > 0) applyServingGrams(n);
                }}
                className="flex-1 h-11 rounded-lg border border-hairline font-myeong text-[18px] text-ink text-center bg-surface-soft outline-none focus:border-cobalt transition-colors"
                placeholder={String(Math.round(originalTotalGrams))}
              />
              <span className="font-kedu font-bold text-sm text-muted">g</span>
            </div>
          )}
        </div>

        {/* AI 인식 결과 목록 */}
        {(() => {
          const aiFoods = editedFoods.map((f, i) => ({ food: f, idx: i })).filter(({ food }) => food.source !== 'manual');
          const manualFoods = editedFoods.map((f, i) => ({ food: f, idx: i })).filter(({ food }) => food.source === 'manual');

          const renderFoodRow = ({ food, idx }: { food: typeof editedFoods[number]; idx: number }, staggerIdx: number) => (
            <div key={idx} className={cn('flex items-center gap-xs px-md py-sm animate-fade-slide-up', `stagger-${Math.min(staggerIdx + 1, 4)}`)}>
              <div className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                food.protein > food.carbs ? 'bg-sage' : food.fat > food.protein ? 'bg-coral' : 'bg-ochre'
              )} />
              <div className="flex-1 min-w-0">
                <FoodAutocomplete
                  value={food.foodName}
                  onChange={(name) => updateFood(idx, { foodName: name })}
                  onSelect={(item) =>
                    updateFood(idx, {
                      foodName: item.foodName,
                      calories: item.calories,
                      carbs: item.carbs,
                      protein: item.protein,
                      fat: item.fat,
                      servingSize: item.servingSize,
                    })
                  }
                />
                <div className="flex items-center gap-[2px]">
                  <input type="text" inputMode="numeric" className="font-myeong text-sm text-muted bg-transparent outline-none text-right"
                    style={{ width: `${Math.max(String(Math.round(food.servingSize)).length, 2) + 1}ch` }}
                    value={food.servingSize}
                    onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) updateFood(idx, { servingSize: n }); }} />
                  <span className="font-myeong text-sm text-muted">g</span>
                </div>
              </div>
              <div className="flex items-center gap-xxs">
                <input type="number" className="font-myeong font-bold text-[15px] text-ink bg-transparent w-14 text-right outline-none"
                  value={food.calories} onChange={(e) => updateFood(idx, { calories: Number(e.target.value) })} />
                <span className="font-myeong text-xs text-muted">kcal</span>
              </div>
              <button onClick={() => removeFood(idx)} className="p-xxs text-muted hover:text-coral transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          );

          return (
            <>
              <div className="bg-surface-card rounded-xl border border-hairline overflow-hidden animate-fade-slide-up stagger-3">
                <div className="flex items-center gap-xs px-md py-sm border-b border-hairline-soft">
                  <span className="px-sm py-[3px] rounded-pill bg-lavender font-myeong text-xs text-ink font-bold">AI 인식 결과</span>
                  <span className="font-kedu text-xs text-muted">{aiFoods.length}가지 음식</span>
                </div>
                <div className="divide-y divide-hairline-soft">
                  {aiFoods.map((item, i) => renderFoodRow(item, i))}
                </div>
              </div>

              {manualFoods.length > 0 && (
                <div className="bg-surface-card rounded-xl border border-hairline overflow-hidden animate-fade-slide-up stagger-4">
                  <div className="flex items-center gap-xs px-md py-sm border-b border-hairline-soft">
                    <span className="px-sm py-[3px] rounded-pill bg-surface-soft font-myeong text-xs text-ink font-bold border border-hairline">직접 추가</span>
                    <span className="font-kedu text-xs text-muted">{manualFoods.length}가지 음식</span>
                  </div>
                  <div className="divide-y divide-hairline-soft">
                    {manualFoods.map((item, i) => renderFoodRow(item, i))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowFoodSearch(true)}
                className="w-full py-sm font-kedu text-sm text-cobalt bg-surface-card border border-hairline rounded-xl hover:bg-surface-soft transition-colors flex items-center justify-center gap-xxs"
              >
                <Plus size={13} />
                음식 추가
              </button>
            </>
          );
        })()}

        <FoodSearchModal
          isOpen={showFoodSearch}
          onClose={() => setShowFoodSearch(false)}
          onAdd={(foods) => {
            addFoods(foods);
            setShowFoodSearch(false);
          }}
        />

        <textarea
          className="w-full bg-surface-card border border-hairline rounded-md p-sm font-kedu text-[15px] text-ink placeholder:text-muted-soft resize-none focus:outline-none focus:border-cobalt transition-colors"
          placeholder="오늘 식사 한마디 (선택)"
          rows={2}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        {/* 공유 그룹 선택 */}
        {groups.length > 0 && (
          <div className="bg-surface-card rounded-xl border border-hairline p-md space-y-sm animate-fade-slide-up">
            <p className="font-kedu font-bold text-sm text-ink">어디에 공유할까요?</p>
            <div className="space-y-xs">
              {groups.map((group) => {
                const checked = selectedGroupIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    onClick={() => toggleGroupId(group.id)}
                    className={cn(
                      'w-full flex items-center gap-sm px-sm py-xs rounded-lg border transition-colors text-left',
                      checked
                        ? 'bg-cobalt/10 border-cobalt'
                        : 'bg-surface-soft border-hairline'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors',
                      checked ? 'bg-cobalt border-cobalt' : 'border-muted'
                    )}>
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-kedu text-sm truncate', checked ? 'text-cobalt font-bold' : 'text-ink')}>
                        {group.isPersonal ? '🔒 ' : ''}{group.groupName}
                      </p>
                      {!group.isPersonal && (
                        <p className="font-myeong text-xs text-muted">{group.memberCount}명</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => saveEdits()}
          disabled={isSaving}
          className="w-full h-12 rounded-md bg-peach font-kedu font-bold text-[15px] text-ink flex items-center justify-center gap-xs disabled:bg-hairline disabled:text-muted active:scale-95 transition-transform"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          저장하기
        </button>
        <button
          onClick={reset}
          disabled={isSaving}
          className="w-full h-11 rounded-md bg-surface-card border border-hairline font-kedu text-[15px] text-muted active:scale-95 transition-transform disabled:opacity-40"
        >
          취소
        </button>
      </div>
    );
  }

  /* ── Step 5: 완료 — 접시가 비워진 상태 ──────────────── */
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-md">
        <div className="w-full bg-sage rounded-xl p-xl flex flex-col items-center gap-md animate-scale-in">
          <span className="px-sm py-xxs rounded-pill bg-surface-card font-kedu font-bold text-[11px] text-sage uppercase tracking-wide">
            저장 완료
          </span>
          {/* 빈 접시 — 식사를 마친 상태의 상징 */}
          <div className="relative w-24 h-24 animate-float-slow">
            <div className="w-24 h-24 rounded-full bg-surface-card border-4 border-white/50 flex items-center justify-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-surface-soft flex items-center justify-center">
                <Check size={28} className="text-sage" strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="font-kedu font-bold text-[20px] text-white">기록했어요!</p>
            <p className="font-kedu text-sm text-white/80 mt-1">오늘도 건강한 하루 보내세요</p>
          </div>
          <button
            onClick={reset}
            className="w-full h-12 rounded-md bg-surface-card font-kedu font-bold text-[15px] text-ink active:scale-95 transition-transform"
          >
            다른 식사 기록하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
