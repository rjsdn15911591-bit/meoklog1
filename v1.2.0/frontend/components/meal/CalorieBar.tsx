'use client';

import { cn, getProgressColor, formatCalories } from '@/lib/utils';

interface CalorieBarProps {
  current: number;
  target: number;
  showNumbers?: boolean;
  className?: string;
}

export function CalorieBar({ current, target, showNumbers = true, className }: CalorieBarProps) {
  const rate = target > 0 ? (current / target) * 100 : 0;
  const clampedRate = Math.min(rate, 100);
  const progressColor = getProgressColor(rate);

  return (
    <div className={cn('space-y-1', className)}>
      {showNumbers && (
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-myeong font-extrabold text-2xl text-ink">
              {formatCalories(current)}
            </span>
            <span className="font-myeong text-xs text-muted">kcal</span>
          </div>
          <span className="font-myeong text-xs text-muted">
            목표 {formatCalories(target)} kcal
          </span>
        </div>
      )}
      <div className="h-2 bg-surface-strong rounded-pill overflow-hidden">
        <div
          className={cn('h-full rounded-pill transition-all duration-500', progressColor)}
          style={{ width: `${clampedRate}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span
          className={cn(
            'font-myeong font-bold text-sm',
            rate >= 110
              ? 'text-coral'
              : rate >= 100
              ? 'text-cobalt'
              : rate >= 80
              ? 'text-ochre'
              : 'text-sage'
          )}
        >
          {Math.round(rate)}%
        </span>
        {rate < 100 && (
          <span className="font-kedu text-xs text-muted">
            {formatCalories(Math.max(0, target - current))} kcal 남음
          </span>
        )}
        {rate >= 100 && (
          <span className="font-kedu text-xs text-coral">
            {formatCalories(current - target)} kcal 초과
          </span>
        )}
      </div>
    </div>
  );
}
