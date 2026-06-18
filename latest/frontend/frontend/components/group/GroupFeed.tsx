'use client';

import { useQuery } from '@tanstack/react-query';
import { groupApi } from '@/lib/api';
import { useGroupRealtime } from '@/hooks/useGroupRealtime';
import { MealCard } from '@/components/meal/MealCard';
import { formatDate } from '@/lib/utils';
import type { GroupFeedMeal } from '@/types';
import { Loader2 } from 'lucide-react';

interface GroupFeedProps {
  groupId: string;
  date: Date;
}

export function GroupFeed({ groupId, date }: GroupFeedProps) {
  const dateStr = formatDate(date);

  useGroupRealtime(groupId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['group-feed', groupId, dateStr],
    queryFn: async () => {
      const res = await groupApi.getFeed(groupId, dateStr);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
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

  const meals: GroupFeedMeal[] = data?.feed ?? [];

  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted">
        <span className="text-4xl mb-3">🍽️</span>
        <p className="font-kedu text-base">아직 기록된 식사가 없어요</p>
        <p className="font-kedu text-sm mt-1">첫 번째로 식사를 기록해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {meals.map((meal) => (
        <MealCard key={meal.id} meal={meal} showUser />
      ))}
    </div>
  );
}
