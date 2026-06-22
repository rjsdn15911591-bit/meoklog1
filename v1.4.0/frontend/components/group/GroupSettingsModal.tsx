'use client';

import { useState } from 'react';
import { X, Users, Type, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi } from '@/lib/api';
import type { Group } from '@/types';

interface GroupSettingsModalProps {
  group: Group;
  onClose: () => void;
}

const MEMBER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function GroupSettingsModal({ group, onClose }: GroupSettingsModalProps) {
  const [groupName, setGroupName] = useState(group.groupName);
  const [maxMembers, setMaxMembers] = useState(group.maxMembers ?? 12);
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () =>
      groupApi.update(group.id, {
        groupName: groupName.trim(),
        maxMembers,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', group.id] });
      qc.invalidateQueries({ queryKey: ['my-groups'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      alert(err.response?.data?.detail ?? '저장에 실패했습니다.');
    },
  });

  const hasChanged =
    groupName.trim() !== group.groupName || maxMembers !== (group.maxMembers ?? 12);
  const currentCount = group.memberCount ?? 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-surface-card rounded-t-2xl px-5 pt-5 pb-10 space-y-5 animate-slide-up">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="font-kedu font-bold text-lg text-ink">그룹 설정</h2>
          <button onClick={onClose} className="p-1 text-muted">
            <X size={20} />
          </button>
        </div>

        {/* 그룹명 */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-kedu text-sm text-muted">
            <Type size={13} />
            그룹 이름
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={30}
            className="w-full bg-surface-soft rounded-xl px-4 py-3 font-kedu text-base text-ink outline-none focus:ring-2 focus:ring-cobalt/30"
            placeholder="그룹 이름을 입력하세요"
          />
          <p className="text-right font-myeong text-xs text-muted-soft">{groupName.length}/30</p>
        </div>

        {/* 인원 제한 */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-kedu text-sm text-muted">
            <Users size={13} />
            최대 인원 <span className="text-muted-soft">(현재 {currentCount}명 참여 중)</span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {MEMBER_OPTIONS.map((n) => {
              const isActive = n === maxMembers;
              const isTooSmall = n < currentCount;
              return (
                <button
                  key={n}
                  onClick={() => !isTooSmall && setMaxMembers(n)}
                  disabled={isTooSmall}
                  className={`h-10 rounded-lg font-kedu text-sm font-bold transition-colors
                    ${isActive ? 'bg-cobalt text-white' : isTooSmall ? 'bg-surface-soft text-muted-soft opacity-40' : 'bg-surface-soft text-ink hover:bg-cobalt/10'}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="font-myeong text-xs text-muted-soft">현재 멤버 수보다 작게 설정할 수 없어요</p>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={() => updateMutation.mutate()}
          disabled={!hasChanged || !groupName.trim() || updateMutation.isPending}
          className="w-full h-12 bg-cobalt text-white font-kedu font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
        >
          <Check size={16} />
          {updateMutation.isPending ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
