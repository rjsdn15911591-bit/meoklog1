'use client';

import { memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MEAL_TYPE_LABELS, REACTION_EMOJIS } from '@/lib/constants';
import type { MealRecord, GroupFeedMeal, MealType } from '@/types';
import { MessageCircle } from 'lucide-react';

interface MealCardProps {
  meal: MealRecord | GroupFeedMeal;
  showUser?: boolean;
  onClick?: () => void;
}

function isGroupFeedMeal(meal: MealRecord | GroupFeedMeal): meal is GroupFeedMeal {
  return 'reactionSummary' in meal;
}

/* 식사 시간대를 색상으로 표현 — 아침=peach, 점심=ochre, 저녁=cobalt, 간식=sage */
const MEAL_COLOR: Record<MealType, { bar: string; badge: string; emoji: string }> = {
  breakfast: { bar: 'bg-peach',  badge: 'bg-peach/20 text-ink',  emoji: '🌅' },
  lunch:     { bar: 'bg-ochre',  badge: 'bg-ochre/20 text-ink',  emoji: '☀️' },
  dinner:    { bar: 'bg-cobalt', badge: 'bg-cobalt/10 text-cobalt', emoji: '🌙' },
  snack:     { bar: 'bg-sage',   badge: 'bg-sage/20 text-ink',   emoji: '🍪' },
};

export const MealCard = memo(function MealCard({ meal, showUser = false, onClick }: MealCardProps) {
  const router = useRouter();
  const meta = MEAL_COLOR[meal.mealType];

  const handleClick = () => {
    if (onClick) onClick();
    else router.push(`/meal/${meal.id}`);
  };

  const reactions = isGroupFeedMeal(meal) ? meal.reactionSummary : null;
  const commentCount = isGroupFeedMeal(meal) ? meal.commentCount : 0;

  return (
    <div
      className="bg-surface-card rounded-xl border border-hairline overflow-hidden cursor-pointer active:scale-[0.99] transition-transform flex"
      onClick={handleClick}
    >
      {/* 식사 시간대 컬러 세로 바 — 하루 중 언제 먹었는지를 색으로 표현 */}
      <div className={`w-[4px] flex-shrink-0 ${meta.bar}`} />

      <div className="flex-1 p-md">
        {showUser && meal.user && (
          <div className="flex items-center gap-xs mb-sm">
            <div className="w-8 h-8 rounded-full bg-surface-soft overflow-hidden flex-shrink-0">
              {meal.user.avatarUrl ? (
                <Image src={meal.user.avatarUrl} alt={meal.user.name} width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-lavender flex items-center justify-center text-xs font-kedu font-bold text-ink">
                  {meal.user.name[0]}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-kedu font-bold text-sm text-ink">{meal.user.name}</p>
              <p className="font-myeong text-xs text-muted-soft">{MEAL_TYPE_LABELS[meal.mealType]}</p>
            </div>
            <span className={`font-kedu text-[11px] px-xs py-[3px] rounded-pill ${meta.badge}`}>
              {meta.emoji} {MEAL_TYPE_LABELS[meal.mealType]}
            </span>
          </div>
        )}

        <div className="aspect-[4/3] relative rounded-lg overflow-hidden bg-surface-soft mb-sm">
          <Image
            src={meal.thumbnailUrl || meal.imageUrl}
            alt={`${MEAL_TYPE_LABELS[meal.mealType]} 사진`}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex items-center justify-between">
          {!showUser && (
            <span className="font-kedu text-xs text-muted flex items-center gap-xxs">
              <span>{meta.emoji}</span>
              {MEAL_TYPE_LABELS[meal.mealType]}
            </span>
          )}
          <div className="flex items-baseline gap-xxs ml-auto">
            <span className="font-myeong font-bold text-lg text-ink">
              {meal.totalCalories.toLocaleString()}
            </span>
            <span className="font-myeong text-xs text-muted">kcal</span>
          </div>
        </div>

        {meal.caption && (
          <p className="font-kedu text-sm text-body mt-xs">{meal.caption}</p>
        )}

        {reactions && (
          <div className="flex items-center gap-xs mt-sm pt-sm border-t border-hairline-soft">
            <div className="flex gap-xxs flex-1 flex-wrap">
              {Object.entries(reactions)
                .filter(([, count]) => (count ?? 0) > 0)
                .map(([type, count]) => (
                  <span
                    key={type}
                    className="flex items-center gap-[3px] text-xs font-myeong bg-surface-soft px-xs py-[3px] rounded-pill"
                  >
                    {REACTION_EMOJIS[type]} {count}
                  </span>
                ))}
            </div>
            {commentCount > 0 && (
              <span className="flex items-center gap-xxs text-xs font-myeong text-muted">
                <MessageCircle size={12} />
                {commentCount}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
