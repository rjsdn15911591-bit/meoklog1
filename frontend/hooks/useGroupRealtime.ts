'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useGroupRealtime(groupId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    // meal_group_shares 테이블 감시 (식사가 이 그룹에 공유될 때 피드 갱신)
    // Supabase 대시보드에서 meal_group_shares 테이블의 Realtime을 활성화해야 함
    const channel = supabase
      .channel(`group-feed-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meal_group_shares',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group-feed', groupId] });
          queryClient.invalidateQueries({ queryKey: ['calorie-compare', groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}
