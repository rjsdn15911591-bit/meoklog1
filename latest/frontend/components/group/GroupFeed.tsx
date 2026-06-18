'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { groupApi } from '@/lib/api';
import { useGroupRealtime } from '@/hooks/useGroupRealtime';
import { MealCard } from '@/components/meal/MealCard';
import { formatDate } from '@/lib/utils';
import type { GroupFeedMeal } from '@/types';
import { Loader2 } from 'lucide-react';

interface MemberInfo {
  userId: string;
  name: string;
  avatarUrl?: string;
}

interface GroupFeedProps {
  groupId: string;
  date: Date;
}

export function GroupFeed({ groupId, date }: GroupFeedProps) {
  const dateStr = formatDate(date);

  useGroupRealtime(groupId);

  const { data: groupData, isLoading: isGroupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const res = await groupApi.getById(groupId);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: feedData, isLoading: isFeedLoading, isError, refetch } = useQuery({
    queryKey: ['group-feed', groupId, dateStr],
    queryFn: async () => {
      const res = await groupApi.getFeed(groupId, dateStr);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isGroupLoading || isFeedLoading) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <Loader2 size={24} className="animate-spin text-cobalt" />
        <p className="font-kedu text-sm text-muted">피드 불러오는 중...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12 text-muted">
        <span className="text-4xl mb-3">😵</span>
        <p className="font-kedu">불러오는 데 실패했어요</p>
        <button onClick={() => refetch()} className="mt-3 text-cobalt font-kedu text-sm">
          다시 시도
        </button>
      </div>
    );
  }

  const members: MemberInfo[] = groupData?.members ?? [];
  const meals: GroupFeedMeal[] = feedData?.feed ?? [];

  const mealsByUser = new Map<string, GroupFeedMeal[]>();
  for (const meal of meals) {
    const existing = mealsByUser.get(meal.userId) ?? [];
    mealsByUser.set(meal.userId, [...existing, meal]);
  }

  if (members.length === 0 && meals.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted">
        <span className="text-4xl mb-3">🍽️</span>
        <p className="font-kedu text-base">아직 기록된 식사가 없어요</p>
        <p className="font-kedu text-sm mt-1">첫 번째로 식사를 기록해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {members.flatMap((member) => {
        const memberMeals = mealsByUser.get(member.userId) ?? [];

        if (memberMeals.length > 0) {
          return memberMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} showUser />
          ));
        }

        return [
          <div
            key={member.userId}
            className="flex items-center gap-sm px-md py-sm bg-surface-card rounded-xl border border-hairline"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.name}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-lavender flex items-center justify-center font-kedu font-bold text-sm text-ink">
                  {member.name[0]}
                </div>
              )}
            </div>
            <p className="font-kedu font-bold text-sm text-ink flex-1">{member.name}</p>
            <span className="font-kedu text-xs text-muted">기록 없음</span>
          </div>,
        ];
      })}
    </div>
  );
}
