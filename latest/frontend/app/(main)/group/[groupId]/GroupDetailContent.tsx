'use client';

import { useState } from 'react';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { GroupFeed } from '@/components/group/GroupFeed';
import { groupApi } from '@/lib/api';
import { formatDisplayDate } from '@/lib/utils';
import type { Group } from '@/types';

export default function GroupDetailContent() {
  const params = useParams<{ groupId: string }>();
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const { data } = useQuery<Group>({
    queryKey: ['group', params.groupId],
    queryFn: async () => {
      const res = await groupApi.getById(params.groupId);
      return res.data.data;
    },
  });

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
            <button
              onClick={copyCode}
              className="flex items-center gap-1 bg-teal/20 px-2 py-1 rounded-pill"
            >
              <span className="font-myeong text-xs text-ink">{data.groupCode}</span>
              <Copy size={10} className="text-muted" />
            </button>
          )
        }
      />

      {showPicker && (
        <DatePickerModal
          value={date}
          onChange={setDate}
          onClose={() => setShowPicker(false)}
        />
      )}

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
        <GroupFeed groupId={params.groupId} date={date} />
      </main>
    </div>
  );
}
