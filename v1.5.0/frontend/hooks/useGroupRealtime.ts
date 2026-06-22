'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useGroupRealtime(groupId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId || !supabase) return;

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
      supabase?.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}
