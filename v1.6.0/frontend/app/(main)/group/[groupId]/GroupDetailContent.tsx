'use client';

import { useState } from 'react';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Copy, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { GroupFeed } from '@/components/group/GroupFeed';
import { CalorieRanking } from '@/components/group/CalorieRanking';
import { GroupSettingsModal } from '@/components/group/GroupSettingsModal';
import { groupApi } from '@/lib/api';
import { formatDisplayDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Group } from '@/types';

type Tab = 'feed' | 'ranking';

export default function GroupDetailContent() {
  const params = useParams<{ groupId: string }>();
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>('feed');

  const { data } = useQuery<Group>({
    queryKey: ['group', params.groupId],
    queryFn: async () => {
      const res = await groupApi.getById(params.groupId);
      return res.data.data;
    },
  });

  const isPersonal = data?.isPersonal ?? false;

  const copyCode = () => {
    if (data?.groupCode) {
      navigator.clipboard.writeText(data.groupCode);
      alert(`코드 "${data.groupCode}" 복사됨`);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Header
        title={data?.groupName ?? '그룹'}
        showBack
        rightContent={
          data && !data.isPersonal && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 bg-teal/20 px-2 py-1 rounded-pill"
              >
                <span className="font-myeong text-xs text-ink">{data.groupCode}</span>
                <Copy size={10} className="text-muted" />
              </button>
              {data.isOwner && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-soft transition-colors"
                >
                  <Settings size={17} />
                </button>
              )}
            </div>
          )
        }
      />

      {showSettings && data && (
        <GroupSettingsModal group={data} onClose={() => setShowSettings(false)} />
      )}

      {showPicker && (
        <DatePickerModal
          value={date}
          onChange={setDate}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* 피드 / 랭킹 탭 — 소셜 그룹만 표시 */}
      {!isPersonal && (
        <div className="flex px-4 pt-3 gap-2">
          {(['feed', 'ranking'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 h-9 rounded-xl font-kedu font-bold text-sm transition-colors',
                tab === t
                  ? 'bg-cobalt text-white'
                  : 'bg-surface-soft text-muted hover:text-ink'
              )}
            >
              {t === 'feed' ? '피드' : '랭킹'}
            </button>
          ))}
        </div>
      )}

      {/* 날짜 네비게이터 */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setDate((d) => subDays(d, 1))}
          className="p-2 rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          className="p-2 rounded-lg text-muted hover:text-ink min-w-[44px] min-h-[44px] flex items-center justify-center"
          disabled={date >= new Date()}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <main className="px-4 pb-4">
        {tab === 'feed' || isPersonal ? (
          <GroupFeed groupId={params.groupId} date={date} />
        ) : (
          <CalorieRanking groupId={params.groupId} date={date} />
        )}
      </main>
    </div>
  );
}
