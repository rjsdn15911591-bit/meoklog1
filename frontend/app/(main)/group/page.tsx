'use client';

import { useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Copy, Plus, LogIn } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { GroupFeed } from '@/components/group/GroupFeed';
import { GroupJoinModal } from '@/components/group/GroupJoinModal';
import { groupApi } from '@/lib/api';
import { formatDisplayDate } from '@/lib/utils';
import { useGroupStore } from '@/store/groupStore';
import type { Group } from '@/types';
import { Loader2 } from 'lucide-react';

export default function GroupPage() {
  const [date, setDate] = useState(new Date());
  const [showModal, setShowModal] = useState<'create' | 'join' | null>(null);
  const { currentGroupId, setCurrentGroupId } = useGroupStore();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['my-groups'],
    queryFn: async () => {
      const res = await groupApi.getMyGroups();
      return res.data.data;
    },
  });

  const currentGroup = groups?.find((g) => g.id === currentGroupId) ?? groups?.[0];
  const groupId = currentGroup?.id ?? null;

  const handleModalSuccess = (newGroupId: string) => {
    setCurrentGroupId(newGroupId);
    setShowModal(null);
  };

  const copyGroupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`그룹 코드 "${code}" 복사됨`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-cobalt" />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header title="그룹" showSettings />
        <main className="flex flex-col items-center justify-center min-h-[70vh] px-md text-center">
          {/* cobalt = 신뢰·연결·커뮤니티의 상징색 */}
          <div className="w-full bg-cobalt rounded-xl p-xl flex flex-col items-center gap-md mb-lg animate-scale-in">
            {/* 접시 3개 겹침 — 함께 식사하는 이미지 */}
            <div className="flex items-end justify-center gap-[-8px] relative h-16">
              <span className="text-4xl absolute left-1/2 -translate-x-[32px] animate-float-slow" style={{ animationDelay: '0s' }}>🍽️</span>
              <span className="text-4xl absolute left-1/2 -translate-x-[0px] z-10 animate-float-slow" style={{ animationDelay: '0.5s' }}>🍽️</span>
              <span className="text-4xl absolute left-1/2 translate-x-[32px] animate-float-slow" style={{ animationDelay: '1s' }}>🍽️</span>
            </div>
            <div>
              <p className="font-kedu font-bold text-xl text-white">함께 먹는 즐거움</p>
              <p className="font-kedu text-sm text-white/70 mt-1">
                그룹을 만들어 친구들의 식사를 공유하고<br />서로 응원해보세요
              </p>
            </div>
          </div>
          <div className="w-full space-y-sm">
            <button
              onClick={() => setShowModal('create')}
              className="w-full h-12 bg-peach text-ink font-kedu font-bold rounded-md flex items-center justify-center gap-xs active:scale-95 transition-transform"
            >
              <Plus size={18} />
              새 그룹 만들기
            </button>
            <button
              onClick={() => setShowModal('join')}
              className="w-full h-12 bg-surface-card border border-hairline text-ink font-kedu font-bold rounded-md flex items-center justify-center gap-xs active:scale-95 transition-transform"
            >
              <LogIn size={18} />
              그룹 코드로 참가하기
            </button>
          </div>
        </main>
        {showModal && (
          <GroupJoinModal
            mode={showModal}
            onClose={() => setShowModal(null)}
            onSuccess={handleModalSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="그룹" showSettings />

      <div className="bg-cobalt mx-md mt-xs rounded-xl p-md text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-kedu font-bold text-lg">{currentGroup?.groupName}</p>
            <p className="font-kedu text-sm text-white/70">
              멤버 {currentGroup?.memberCount ?? '?'}명
            </p>
          </div>
          <button
            onClick={() => currentGroup && copyGroupCode(currentGroup.groupCode)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-pill transition-colors"
          >
            <span className="font-myeong font-bold text-sm text-white">
              {currentGroup?.groupCode}
            </span>
            <Copy size={12} className="text-white" />
          </button>
        </div>
      </div>

      {groups.length > 1 && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto hide-scrollbar">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setCurrentGroupId(g.id)}
              className={`shrink-0 h-8 px-3 rounded-pill font-kedu text-sm transition-colors ${
                g.id === groupId
                  ? 'bg-peach text-ink'
                  : 'bg-surface-card border border-hairline text-muted'
              }`}
            >
              {g.groupName}
            </button>
          ))}
          <button
            onClick={() => setShowModal('create')}
            className="shrink-0 h-8 px-3 rounded-pill border border-dashed border-hairline text-muted font-kedu text-sm"
          >
            + 추가
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-md py-xs border-b border-hairline-soft mt-xs">
        <button
          onClick={() => setDate((d) => subDays(d, 1))}
          className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="font-jalnan text-base text-ink">{formatDisplayDate(date)}</p>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="p-xs rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"
          disabled={date >= new Date()}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <main className="px-4 pb-4">
        {groupId ? (
          <GroupFeed groupId={groupId} date={date} />
        ) : (
          <div className="text-center py-12 text-muted">
            <p className="font-kedu">그룹을 선택해주세요</p>
          </div>
        )}
      </main>

      {showModal && (
        <GroupJoinModal
          mode={showModal}
          onClose={() => setShowModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
