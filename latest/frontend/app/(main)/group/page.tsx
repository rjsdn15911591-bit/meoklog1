'use client';

import { useState } from 'react';
import { Plus, LogIn, Copy, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { GroupJoinModal } from '@/components/group/GroupJoinModal';
import { groupApi } from '@/lib/api';
import { useGroupStore } from '@/store/groupStore';
import type { Group } from '@/types';

export default function GroupPage() {
  const [showModal, setShowModal] = useState<'create' | 'join' | null>(null);
  const { setCurrentGroupId } = useGroupStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['my-groups'],
    queryFn: async () => {
      const res = await groupApi.getMyGroups();
      return res.data.data;
    },
  });

  const socialGroups = groups?.filter((g) => !g.isPersonal) ?? [];

  const leaveMutation = useMutation({
    mutationFn: (groupId: string) => groupApi.leave(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail ?? '';
      if (detail.includes('그룹장')) alert('그룹장은 탈퇴할 수 없습니다. 다른 멤버에게 양도하거나 그룹을 삭제하세요.');
      else alert('탈퇴에 실패했습니다.');
    },
  });

  const handleModalSuccess = (newGroupId: string) => {
    setCurrentGroupId(newGroupId);
    setShowModal(null);
    router.push(`/group/${newGroupId}`);
  };

  const copyGroupCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    alert(`그룹 코드 "${code}" 복사됨`);
  };

  const handleLeave = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    if (confirm(`"${group.groupName}" 그룹에서 탈퇴하시겠어요?`)) {
      leaveMutation.mutate(group.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-cobalt" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="그룹" showSettings />

      <main className="px-md py-md space-y-sm">

        {/* 그룹 카드 목록 */}
        {socialGroups.length === 0 ? (
          <div className="bg-cobalt rounded-xl p-xl flex flex-col items-center gap-md animate-scale-in">
            <div className="flex items-center justify-center h-16 w-full">
              <span className="text-5xl animate-float-slow">🍽️</span>
            </div>
            <div className="text-center">
              <p className="font-kedu font-bold text-xl text-white">함께 먹는 즐거움</p>
              <p className="font-kedu text-sm text-white/70 mt-1">
                그룹을 만들어 친구들의 식사를 공유하고<br />서로 응원해보세요
              </p>
            </div>
          </div>
        ) : (
          socialGroups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => router.push(`/group/${g.id}`)}
              className={`w-full bg-cobalt rounded-xl p-md text-white text-left active:scale-[0.98] transition-transform animate-fade-slide-up stagger-${Math.min(i + 1, 4)}`}
            >
              <div className="flex items-center justify-between gap-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-kedu font-bold text-lg leading-tight truncate">{g.groupName}</p>
                  <p className="font-kedu text-sm text-white/70 mt-[2px]">멤버 {g.memberCount}명</p>
                </div>
                <div className="flex items-center gap-xs flex-shrink-0">
                  <button
                    onClick={(e) => copyGroupCode(e, g.groupCode)}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-pill transition-colors"
                  >
                    <span className="font-myeong font-bold text-sm">{g.groupCode}</span>
                    <Copy size={12} />
                  </button>
                  {!g.isOwner && (
                    <button
                      onClick={(e) => handleLeave(e, g)}
                      disabled={leaveMutation.isPending}
                      className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors disabled:opacity-50"
                      title="그룹 탈퇴"
                    >
                      {leaveMutation.isPending
                        ? <Loader2 size={14} className="animate-spin" />
                        : <LogOut size={14} />
                      }
                    </button>
                  )}
                  <ChevronRight size={16} className="text-white/50" />
                </div>
              </div>
            </button>
          ))
        )}

        {/* 그룹 추가 버튼 — 항상 표시 */}
        <div className="space-y-sm pt-xs">
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
