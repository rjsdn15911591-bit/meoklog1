'use client';

import { cn } from '@/lib/utils';

interface NutritionDetailProps {
  carbs: number;
  protein: number;
  fat: number;
  targets?: { carbs: number; protein: number; fat: number };
  className?: string;
  light?: boolean;
}

// 식약처 1일 영양성분 기준치 (성인, 2000kcal 기준)
const DRI = {
  carbs:   324,
  protein: 109,
  fat:      54,
} as const;

/* 영양소별 색상 — 범세계적으로 통용되는 영양 색상 체계 사용
   ochre(황금/곡물) = 탄수화물, sage(녹색/식물) = 단백질, coral(붉은/열) = 지방 */
const ITEMS = [
  { key: 'carbs',   label: '탄수화물', bar: 'bg-ochre', text: 'text-ochre' },
  { key: 'protein', label: '단백질',   bar: 'bg-sage',  text: 'text-sage'  },
  { key: 'fat',     label: '지방',     bar: 'bg-coral', text: 'text-coral' },
] as const;

export function NutritionDetail({
  carbs, protein, fat, targets, className, light = false,
}: NutritionDetailProps) {
  const values = { carbs, protein, fat };
  const ref = targets ?? DRI;

  return (
    <div className={cn('space-y-xs', className)}>
      <div className="grid grid-cols-3 gap-xs">
        {ITEMS.map(({ key, label, bar, text }) => {
          const value = values[key];
          const pct   = Math.round((value / ref[key]) * 100);
          return (
            <div
              key={key}
              className={cn(
                'rounded-lg p-sm text-center',
                light ? 'bg-white/20' : 'bg-surface-soft'
              )}
            >
              <div className={cn('w-5 h-[3px] rounded-pill mx-auto mb-xs', bar)} />
              <p className={cn(
                'font-myeong font-bold text-[11px] uppercase tracking-[1px]',
                light ? 'text-white/70' : 'text-muted'
              )}>
                {label}
              </p>
              <p className={cn(
                'font-myeong font-bold text-[15px] mt-[2px]',
                light ? 'text-white' : 'text-ink'
              )}>
                {Math.round(value)}g
              </p>
              <p
                className={cn('font-myeong text-[11px] mt-[2px]', light ? 'text-white/60' : text)}
                title="1일 영양성분 기준치(2,000kcal 기준) 대비"
              >
                {pct}%
              </p>
            </div>
          );
        })}
      </div>
      <p className={cn('font-myeong text-[10px] text-right', light ? 'text-white/40' : 'text-muted')}>
        * {targets ? '개인 목표 대비' : '1일 영양성분 기준치(2,000kcal) 대비'}
      </p>
    </div>
  );
}
