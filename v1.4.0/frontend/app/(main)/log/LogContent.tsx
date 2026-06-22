'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { groupApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import type { Group } from '@/types';
import { Loader2, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LogContent() {
  const router = useRouter();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['my-groups'],
    queryFn: async () => {
      const res = await groupApi.getMyGroups();
      return res.data.data;
    },
  });

  const personalGroup = groups?.find((g) => g.isPersonal);
  const socialGroups = groups?.filter((g) => !g.isPersonal) ?? [];

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="로그" showSettings />

      <main className="px-md py-sm space-y-sm">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-cobalt" />
          </div>
        )}

        {personalGroup && (
          <button
            onClick={() => router.push(`/group/${personalGroup.id}`)}
            className="w-full bg-surface-card rounded-xl border border-hairline p-md text-left active:scale-[0.98] transition-transform animate-fade-slide-up"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-kedu font-bold text-base text-ink">나만의 공간</p>
                <p className="font-kedu text-sm text-muted mt-[2px]">내 식사 기록</p>
              </div>
              <div className="flex items-center gap-xs">
                <Lock size={13} className="text-muted" />
                <ChevronRight size={16} className="text-muted" />
              </div>
            </div>
          </button>
        )}

        {socialGroups.map((group, i) => (
          <button
            key={group.id}
            onClick={() => router.push(`/group/${group.id}`)}
            className={cn(
              'w-full bg-cobalt rounded-xl p-md text-left active:scale-[0.98] transition-transform animate-fade-slide-up',
              `stagger-${Math.min(i + 2, 5)}`
            )}
          >
            <div className="flex items-center justify-between gap-sm">
              <div className="flex-1 min-w-0">
                <p className="font-kedu font-bold text-base text-white truncate">{group.groupName}</p>
                <p className="font-kedu text-sm text-white/70 mt-[2px]">멤버 {group.memberCount ?? 0}명</p>
              </div>
              <ChevronRight size={16} className="text-white/50" />
            </div>
          </button>
        ))}

        {!isLoading && !groups?.length && (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">🍽️</span>
            <p className="font-kedu text-muted">아직 그룹이 없어요</p>
          </div>
        )}
      </main>
    </div>
  );
}
