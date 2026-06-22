'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { groupApi } from '@/lib/api';
import { useGroupRealtime } from '@/hooks/useGroupRealtime';
import { formatDate, formatCalories, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { DailyCalorieSummary } from '@/types';
import { Loader2 } from 'lucide-react';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

/* 달성률 → 색상: 건강 상태를 즉시 인식할 수 있는 색 체계 */
function getAchievementColor(rate: number) {
  if (rate >= 110) return { bar: 'bg-coral',  text: 'text-coral',  label: '초과' };
  if (rate >= 100) return { bar: 'bg-cobalt', text: 'text-cobalt', label: '달성' };
  if (rate >= 80)  return { bar: 'bg-ochre',  text: 'text-ochre',  label: '양호' };
  return             { bar: 'bg-sage',   text: 'text-sage',   label: '진행중' };
}

interface RankingRowProps {
  summary: DailyCalorieSummary;
  isMe: boolean;
  isFirst: boolean;
}

function RankingRow({ summary, isMe, isFirst }: RankingRowProps) {
  const rate    = summary.achievementRate;
  const pct     = Math.min(Math.round(rate), 100);
  const { bar, text, label } = getAchievementColor(rate);
  const macroTotal = summary.totalCarbs + summary.totalProtein + summary.totalFat;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        /* 1위: cobalt = 리더십/신뢰의 색. 나: sage 테두리 = 건강/나 자신 */
        isFirst ? '' : isMe ? 'border-2 border-sage' : 'border border-hairline'
      )}
    >
      {/* 달성률 색상 세로 바 — 카드 왼쪽에서 건강 상태를 즉시 표시 */}
      <div className={cn('flex', isFirst ? 'bg-cobalt' : 'bg-surface-card')}>
        {!isFirst && (
          <div className={cn('w-1 flex-shrink-0', bar)} />
        )}

        <div className="flex-1 p-md">
          {/* 상단: 순위 + 유저 정보 + 칼로리 */}
          <div className="flex items-center gap-sm mb-sm">
            <span className="text-xl w-7 text-center flex-shrink-0">
              {RANK_MEDALS[summary.rank - 1] ?? (
                <span className={cn('font-myeong font-bold text-sm', isFirst ? 'text-white/70' : 'text-muted')}>
                  {summary.rank}위
                </span>
              )}
            </span>

            {/* 아바타 */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-surface-soft">
              {summary.avatarUrl ? (
                <Image src={summary.avatarUrl} alt={summary.name} width={32} height={32} className="object-cover" />
              ) : (
                <div className={cn(
                  'w-full h-full flex items-center justify-center font-kedu font-bold text-xs',
                  isFirst ? 'bg-white/20 text-white' : 'bg-lavender text-cobalt'
                )}>
                  {summary.name[0]}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-xxs">
                <span className={cn('font-kedu font-bold text-sm truncate', isFirst ? 'text-white' : 'text-ink')}>
                  {summary.name}
                </span>
                {isMe && (
                  <span className={cn(
                    'font-kedu text-[10px] px-xs py-[2px] rounded-pill flex-shrink-0',
                    isFirst ? 'bg-white/20 text-white' : 'bg-sage text-white'
                  )}>
                    나
                  </span>
                )}
              </div>
              {/* 목표 칼로리 */}
              <p className={cn('font-myeong text-[11px]', isFirst ? 'text-white/60' : 'text-muted')}>
                목표 {summary.targetCalories ? formatCalories(summary.targetCalories) : '미설정'} kcal
              </p>
            </div>

            {/* 오른쪽: 칼로리 + 달성률 */}
            <div className="text-right flex-shrink-0">
              <div className="flex items-baseline gap-xxs justify-end">
                <span className={cn('font-myeong font-bold text-lg leading-none', isFirst ? 'text-white' : 'text-ink')}>
                  {formatCalories(summary.totalCalories)}
                </span>
                <span className={cn('font-myeong text-xs', isFirst ? 'text-white/60' : 'text-muted')}>kcal</span>
              </div>
              <span className={cn(
                'font-myeong font-bold text-xs',
                isFirst ? 'text-white/80' : text
              )}>
                {Math.round(rate)}% {label}
              </span>
            </div>
          </div>

          {/* 칼로리 달성 진행 바 — 색상이 건강 상태를 상징 */}
          <div className={cn(
            'h-1.5 rounded-pill overflow-hidden mb-xs',
            isFirst ? 'bg-white/20' : 'bg-surface-strong'
          )}>
            <div
              className={cn('h-full rounded-pill transition-all duration-700', isFirst ? 'bg-white' : bar)}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* 영양소 비율 바 — 탄(ochre)·단(sage)·지(coral) 비율을 시각화 */}
          {macroTotal > 0 && (
            <div>
              <div className="flex rounded-pill overflow-hidden h-1">
                <div
                  className={cn(isFirst ? 'bg-white/60' : 'bg-ochre')}
                  style={{ width: `${(summary.totalCarbs / macroTotal) * 100}%` }}
                  title={`탄수화물 ${Math.round(summary.totalCarbs)}g`}
                />
                <div
                  className={cn(isFirst ? 'bg-white/80' : 'bg-sage')}
                  style={{ width: `${(summary.totalProtein / macroTotal) * 100}%` }}
                  title={`단백질 ${Math.round(summary.totalProtein)}g`}
                />
                <div
                  className={cn(isFirst ? 'bg-white/40' : 'bg-coral')}
                  style={{ width: `${(summary.totalFat / macroTotal) * 100}%` }}
                  title={`지방 ${Math.round(summary.totalFat)}g`}
                />
              </div>
              <div className={cn('flex justify-between mt-[3px] font-myeong', isFirst ? 'text-white/50' : 'text-muted-soft')} style={{ fontSize: 10 }}>
                <span>탄 {Math.round(summary.totalCarbs)}g</span>
                <span>단 {Math.round(summary.totalProtein)}g</span>
                <span>지 {Math.round(summary.totalFat)}g</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalorieRanking({ groupId, date }: { groupId: string; date: Date }) {
  const dateStr = formatDate(date);
  const { user } = useAuthStore();

  useGroupRealtime(groupId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calorie-compare', groupId, dateStr],
    queryFn: async () => {
      const res = await groupApi.getCompare(groupId, dateStr);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-cobalt" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-muted">
        <span className="text-4xl block mb-3">😵</span>
        <p className="font-kedu text-sm">불러오는 데 실패했어요</p>
        <button onClick={() => refetch()} className="mt-3 text-cobalt font-kedu text-sm">
          다시 시도
        </button>
      </div>
    );
  }

  const rankings: DailyCalorieSummary[] = data?.rankings ?? [];
  const avgCalories: number = data?.groupAverageCalories ?? 0;

  return (
    <div className="space-y-sm">
      {/* 그룹 평균 카드 — cobalt = 신뢰·연결·그룹의 상징색 */}
      <div className="bg-cobalt rounded-xl p-md animate-fade-slide-up">
        <p className="font-kedu text-sm text-white/80">오늘 그룹 평균</p>
        <div className="flex items-baseline gap-xxs mt-xxs">
          <span className="font-myeong font-extrabold text-white" style={{ fontSize: 32 }}>
            {formatCalories(avgCalories)}
          </span>
          <span className="font-myeong text-xs text-white/60">kcal</span>
        </div>
        {/* 그룹 멤버 수 시각화 */}
        {rankings.length > 0 && (
          <div className="flex items-center gap-xxs mt-sm">
            <div className="flex -space-x-1">
              {rankings.slice(0, 4).map((r) => (
                <div
                  key={r.userId}
                  className="w-6 h-6 rounded-full border-2 border-cobalt bg-white/20 flex items-center justify-center font-kedu font-bold text-white"
                  style={{ fontSize: 10 }}
                >
                  {r.name[0]}
                </div>
              ))}
            </div>
            <p className="font-kedu text-xs text-white/70 ml-xs">
              {rankings.length}명이 오늘 기록했어요
            </p>
          </div>
        )}
      </div>

      {/* 순위 목록 */}
      {rankings.map((summary, idx) => (
        <div
          key={summary.userId}
          className={cn('animate-fade-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}
        >
          <RankingRow
            summary={summary}
            isMe={summary.userId === user?.id}
            isFirst={summary.rank === 1}
          />
        </div>
      ))}

      {rankings.length === 0 && (
        <div className="text-center py-16 text-muted">
          <span className="text-4xl block mb-3">🍽️</span>
          <p className="font-kedu text-sm">아직 오늘 기록한 식사가 없어요</p>
        </div>
      )}
    </div>
  );
}
