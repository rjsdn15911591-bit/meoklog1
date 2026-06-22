'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Users, Type, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Group } from '@/types';
import Image from 'next/image';

interface GroupSettingsModalProps {
  group: Group;
  onClose: () => void;
}

const MEMBER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type View = 'main' | 'transfer' | 'dissolve';

export function GroupSettingsModal({ group, onClose }: GroupSettingsModalProps) {
  const router = useRouter();
  const [view, setView] = useState<View>('main');
  const [groupName, setGroupName] = useState(group.groupName);
  const [maxMembers, setMaxMembers] = useState(group.maxMembers ?? 12);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [dissolveConfirm, setDissolveConfirm] = useState('');
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () => groupApi.update(group.id, { groupName: groupName.trim(), maxMembers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', group.id] });
      qc.invalidateQueries({ queryKey: ['my-groups'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      alert(err.response?.data?.detail ?? '저장에 실패했습니다.');
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => groupApi.transfer(group.id, selectedMemberId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', group.id] });
      qc.invalidateQueries({ queryKey: ['my-groups'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      alert(err.response?.data?.detail ?? '양도에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => groupApi.deleteGroup(group.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-groups'] });
      router.push('/group');
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      alert(err.response?.data?.detail ?? '해산에 실패했습니다.');
    },
  });

  const hasChanged =
    groupName.trim() !== group.groupName || maxMembers !== (group.maxMembers ?? 12);
  const currentCount = group.memberCount ?? 1;
  const otherMembers = (group.members ?? []).filter((m) => m.userId !== group.ownerId);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-surface-card rounded-t-2xl px-5 pt-5 pb-10 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto">

        {/* ── 헤더 ── */}
        <div className="flex items-center gap-2">
          {view !== 'main' && (
            <button onClick={() => setView('main')} className="p-1 text-muted">
              <ChevronRight size={18} className="rotate-180" />
            </button>
          )}
          <h2 className="font-kedu font-bold text-lg text-ink flex-1">
            {view === 'main' ? '그룹 설정' : view === 'transfer' ? '그룹장 양도' : '그룹 해산'}
          </h2>
          <button onClick={onClose} className="p-1 text-muted"><X size={20} /></button>
        </div>

        {/* ── 메인 뷰 ── */}
        {view === 'main' && (
          <>
            {/* 그룹명 */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 font-kedu text-sm text-muted">
                <Type size={13} /> 그룹 이름
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
                <Users size={13} /> 최대 인원{' '}
                <span className="text-muted-soft">(현재 {currentCount}명 참여 중)</span>
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
                      className={cn(
                        'h-10 rounded-lg font-kedu text-sm font-bold transition-colors',
                        isActive ? 'bg-cobalt text-white'
                          : isTooSmall ? 'bg-surface-soft text-muted-soft opacity-40'
                          : 'bg-surface-soft text-ink hover:bg-cobalt/10'
                      )}
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

            {/* 구분선 */}
            <div className="border-t border-hairline" />

            {/* 그룹장 양도 */}
            <button
              onClick={() => setView('transfer')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-soft hover:bg-lavender/20 transition-colors"
            >
              <span className="font-kedu text-sm text-ink">그룹장 양도</span>
              <ChevronRight size={16} className="text-muted" />
            </button>

            {/* 그룹 해산 */}
            <button
              onClick={() => setView('dissolve')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-coral/5 hover:bg-coral/10 transition-colors"
            >
              <span className="font-kedu text-sm text-coral">그룹 해산</span>
              <ChevronRight size={16} className="text-coral" />
            </button>
          </>
        )}

        {/* ── 그룹장 양도 뷰 ── */}
        {view === 'transfer' && (
          <>
            <p className="font-myeong text-sm text-muted">
              그룹장 권한을 넘길 멤버를 선택하세요. 양도 후 당신은 일반 멤버가 됩니다.
            </p>
            <div className="space-y-2">
              {otherMembers.length === 0 ? (
                <p className="font-kedu text-sm text-muted text-center py-6">양도할 수 있는 멤버가 없어요</p>
              ) : (
                otherMembers.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => setSelectedMemberId(m.userId === selectedMemberId ? null : m.userId)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left',
                      selectedMemberId === m.userId
                        ? 'border-cobalt bg-cobalt/10'
                        : 'border-hairline bg-surface-soft hover:bg-lavender/10'
                    )}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-surface-strong flex items-center justify-center">
                      {m.avatarUrl ? (
                        <Image src={m.avatarUrl} alt={m.name} width={36} height={36} className="object-cover w-full h-full" />
                      ) : (
                        <span className="font-kedu text-sm font-bold text-ink">{m.name[0]}</span>
                      )}
                    </div>
                    <span className={cn('font-kedu text-sm flex-1', selectedMemberId === m.userId ? 'text-cobalt font-bold' : 'text-ink')}>
                      {m.name}
                    </span>
                    {selectedMemberId === m.userId && <Check size={16} className="text-cobalt" />}
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => transferMutation.mutate()}
              disabled={!selectedMemberId || transferMutation.isPending}
              className="w-full h-12 bg-cobalt text-white font-kedu font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {transferMutation.isPending ? '처리 중...' : '그룹장 양도하기'}
            </button>
          </>
        )}

        {/* ── 그룹 해산 뷰 ── */}
        {view === 'dissolve' && (
          <>
            <div className="bg-coral/10 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={20} className="text-coral flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-kedu font-bold text-sm text-coral">주의! 되돌릴 수 없어요</p>
                <p className="font-myeong text-xs text-ink">
                  그룹을 해산하면 모든 멤버가 제거되고 그룹 피드 데이터가 삭제됩니다.
                  개인 식사 기록은 유지됩니다.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-kedu text-sm text-muted">
                확인을 위해 <span className="font-bold text-ink">"{group.groupName}"</span>을 입력하세요
              </label>
              <input
                type="text"
                value={dissolveConfirm}
                onChange={(e) => setDissolveConfirm(e.target.value)}
                className="w-full bg-surface-soft rounded-xl px-4 py-3 font-kedu text-base text-ink outline-none focus:ring-2 focus:ring-coral/30"
                placeholder={group.groupName}
              />
            </div>

            <button
              onClick={() => deleteMutation.mutate()}
              disabled={dissolveConfirm !== group.groupName || deleteMutation.isPending}
              className="w-full h-12 bg-coral text-white font-kedu font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {deleteMutation.isPending ? '해산 중...' : '그룹 해산하기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
