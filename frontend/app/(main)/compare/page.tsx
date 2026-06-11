'use client';

import { useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { CalorieRanking } from '@/components/group/CalorieRanking';
import { groupApi } from '@/lib/api';
import { formatDisplayDate } from '@/lib/utils';
import { useGroupStore } from '@/store/groupStore';
import type { Group } from '@/types';
import { Loader2 } from 'lucide-react';

export default function ComparePage() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const { currentGroupId } = useGroupStore();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['my-groups'],
    queryFn: async () => {
      const res = await groupApi.getMyGroups();
      return res.data.data;
    },
  });

  const groupId =
    currentGroupId ??
    groups?.[0]?.id ??
    null;
  const currentGroup = groups?.find((g) => g.id === groupId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-cobalt" />
      </div>
    );
  }

  if (!groupId) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header title="비교" showSettings />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-md text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="font-kedu font-bold text-xl text-ink mb-2">그룹이 없어요</p>
          <p className="font-kedu text-sm text-muted">
            그룹 탭에서 그룹을 만들거나 참가해보세요
          </p>
          <a href="/group" className="mt-4 font-kedu font-bold text-cobalt text-sm">
            그룹 탭으로 →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="비교" showSettings />
      {showPicker && (
        <DatePickerModal
          value={date}
          onChange={setDate}
          onClose={() => setShowPicker(false)}
        />
      )}

      {currentGroup && (
        <div className="px-md pt-xs pb-0">
          <p className="font-kedu text-sm text-muted">{currentGroup.groupName}</p>
        </div>
      )}

      <div className="flex items-center justify-between px-md py-xs border-b border-hairline-soft">
        <button
          onClick={() => setDate((d) => subDays(d, 1))}
          className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setShowPicker(true)}
          className="font-jalnan text-base text-ink hover:text-cobalt transition-colors px-2 py-1 rounded-lg hover:bg-surface-soft"
        >
          {formatDisplayDate(date)}
        </button>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"
          disabled={date >= new Date()}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <main className="px-md pb-lg pt-sm">
        <CalorieRanking groupId={groupId} date={date} />
      </main>
    </div>
  );
}
