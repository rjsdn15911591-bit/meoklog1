'use client';

import { useQuery } from '@tanstack/react-query';
import { mealApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { DailyLogData } from '@/types';

export function useDailyLog(date: Date) {
  const dateStr = formatDate(date);

  const { data, isLoading, isError, refetch } = useQuery<DailyLogData>({
    queryKey: ['meals', dateStr],
    queryFn: async () => {
      const res = await mealApi.getByDate(dateStr);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    meals: data?.meals ?? [],
    dailyTotal: data?.dailyTotal ?? { calories: 0, carbs: 0, protein: 0, fat: 0 },
    isLoading,
    isError,
    refetch,
  };
}
