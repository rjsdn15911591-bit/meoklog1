'use client';

import { cn } from '@/lib/utils';

interface NutritionDetailProps {
  carbs: number;
  protein: number;
  fat: number;
  className?: string;
  light?: boolean;
}

/* 영양소별 색상 — 범세계적으로 통용되는 영양 색상 체계 사용
   ochre(황금/곡물) = 탄수화물, sage(녹색/식물) = 단백질, coral(붉은/열) = 지방 */
const ITEMS = [
  { key: 'carbs',   label: '탄수화물', bar: 'bg-ochre', text: 'text-ochre', icon: '🌾' },
  { key: 'protein', label: '단백질',   bar: 'bg-sage',  text: 'text-sage',  icon: '🥩' },
  { key: 'fat',     label: '지방',     bar: 'bg-coral', text: 'text-coral', icon: '🫒' },
] as const;

export function NutritionDetail({
  carbs, protein, fat, className, light = false,
}: NutritionDetailProps) {
  const values = { carbs, protein, fat };
  const total  = carbs + protein + fat;

  return (
    <div className={cn('grid grid-cols-3 gap-xs', className)}>
      {ITEMS.map(({ key, label, bar, text, icon }) => {
        const value = values[key];
        const pct   = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
          <div
            key={key}
            className={cn(
              'rounded-lg p-sm text-center',
              light ? 'bg-white/20' : 'bg-surface-soft'
            )}
          >
            {/* 컬러 바 — 영양소 색상 인식 훈련 */}
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
            <p className={cn('font-myeong text-[11px] mt-[2px]', light ? 'text-white/60' : text)}>
              {pct}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
