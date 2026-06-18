'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi } from '@/lib/api';
import { X, Loader2 } from 'lucide-react';

interface GroupJoinModalProps {
  mode: 'create' | 'join';
  onClose: () => void;
  onSuccess: (groupId: string) => void;
}

export function GroupJoinModal({ mode, onClose, onSuccess }: GroupJoinModalProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => groupApi.create(value.trim()),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      onSuccess(res.data.data.id);
    },
    onError: () => setError('그룹 생성에 실패했습니다.'),
  });

  const joinMutation = useMutation({
    mutationFn: () => groupApi.join(value.trim().toUpperCase()),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      onSuccess(res.data.data.id);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const code = err.response?.data?.detail;
      if (code === 'GROUP_001') setError('존재하지 않는 그룹 코드입니다.');
      else if (code === 'GROUP_002') setError('이미 참여 중인 그룹입니다.');
      else if (code === 'GROUP_003') setError('그룹 정원(12명)이 꽉 찼습니다.');
      else if (code === 'GROUP_004') setError('개인 하루로그에는 참가할 수 없습니다.');
      else setError('그룹 참가에 실패했습니다.');
    },
  });

  const isPending = createMutation.isPending || joinMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!value.trim()) {
      setError(mode === 'create' ? '그룹명을 입력해주세요.' : '그룹 코드를 입력해주세요.');
      return;
    }
    if (mode === 'create') createMutation.mutate();
    else joinMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-card rounded-t-xl p-6 pb-8 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-kedu font-bold text-xl text-ink">
            {mode === 'create' ? '새 그룹 만들기' : '그룹 코드로 참가'}
          </h2>
          <button onClick={onClose} className="p-1 text-muted">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-kedu text-sm text-muted mb-1 block">
              {mode === 'create' ? '그룹명' : '8자리 그룹 코드'}
            </label>
            <input
              className="w-full h-12 px-4 bg-surface-card border border-hairline rounded-md font-kedu text-sm text-ink placeholder:text-muted-soft focus:outline-none focus:border-cobalt"
              placeholder={mode === 'create' ? '다이어트 챌린지' : 'AB3X9K2M'}
              value={value}
              onChange={(e) =>
                setValue(mode === 'join' ? e.target.value.toUpperCase() : e.target.value)
              }
              maxLength={mode === 'join' ? 8 : 50}
            />
            {error && <p className="font-kedu text-xs text-coral mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-peach text-ink font-kedu font-bold rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {mode === 'create' ? '그룹 만들기' : '참가하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
