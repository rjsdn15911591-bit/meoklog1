'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

interface WeightRecord {
  id: string;
  weight: number;
  recordedAt: string;
  note?: string;
}

const LINE_H = 120;

export function WeightTracker() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [inputWeight, setInputWeight] = useState('');
  const [inputDate, setInputDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  const { data: records = [], isLoading } = useQuery<WeightRecord[]>({
    queryKey: ['weight-records'],
    queryFn: async () => {
      const res = await userApi.getWeightRecords(90);
      return res.data.data ?? [];
    },
    staleTime: 1000 * 60,
  });

  const addMutation = useMutation({
    mutationFn: ({ weight, date }: { weight: number; date: string }) =>
      userApi.addWeightRecord(weight, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-records'] });
      setInputWeight('');
      setInputDate(format(new Date(), 'yyyy-MM-dd'));
      setShowForm(false);
      toast.show('체중이 기록됐어요!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.deleteWeightRecord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-records'] });
      toast.show('기록이 삭제됐어요');
    },
  });

  const handleAdd = () => {
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w <= 0) return;
    addMutation.mutate({ weight: w, date: inputDate });
  };

  const latestWeight = records.length > 0 ? records[records.length - 1].weight : null;
  const firstWeight = records.length > 1 ? records[0].weight : null;
  const diff = latestWeight && firstWeight ? latestWeight - firstWeight : null;
  const targetWeight = user?.weight ? Number(user.weight) : null;

  // 간단한 SVG 라인 차트
  const chartData = records.slice(-30);
  const weights = chartData.map((r) => r.weight);
  const minW = weights.length ? Math.min(...weights) - 2 : 40;
  const maxW = weights.length ? Math.max(...weights) + 2 : 100;
  const chartW = 300;

  const toX = (i: number) =>
    chartData.length <= 1 ? chartW / 2 : (i / (chartData.length - 1)) * chartW;
  const toY = (w: number) =>
    LINE_H - ((w - minW) / (maxW - minW)) * LINE_H;

  const pathD = chartData
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(r.weight).toFixed(1)}`)
    .join(' ');

  const targetY = targetWeight ? toY(targetWeight) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-cobalt" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {/* 요약 카드 */}
      <div className="bg-surface-card rounded-xl border border-hairline p-4 flex gap-3">
        <div className="flex-1 text-center">
          <p className="font-kedu text-xs text-muted mb-1">현재 체중</p>
          <p className="font-myeong font-bold text-2xl text-ink">
            {latestWeight ?? '—'}
            <span className="text-xs text-muted font-normal ml-0.5">kg</span>
          </p>
        </div>
        <div className="w-px bg-hairline" />
        <div className="flex-1 text-center">
          <p className="font-kedu text-xs text-muted mb-1">목표 체중</p>
          <p className="font-myeong font-bold text-2xl text-sage">
            {targetWeight ?? '—'}
            <span className="text-xs text-muted font-normal ml-0.5">kg</span>
          </p>
        </div>
        <div className="w-px bg-hairline" />
        <div className="flex-1 text-center">
          <p className="font-kedu text-xs text-muted mb-1">90일 변화</p>
          {diff != null ? (
            <div className="flex items-center justify-center gap-1">
              {diff < 0
                ? <TrendingDown size={14} className="text-sage" />
                : diff > 0
                  ? <TrendingUp size={14} className="text-coral" />
                  : <Minus size={14} className="text-muted" />}
              <p className={`font-myeong font-bold text-2xl ${diff < 0 ? 'text-sage' : diff > 0 ? 'text-coral' : 'text-muted'}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                <span className="text-xs text-muted font-normal ml-0.5">kg</span>
              </p>
            </div>
          ) : (
            <p className="font-myeong font-bold text-2xl text-muted">—</p>
          )}
        </div>
      </div>

      {/* SVG 라인 차트 */}
      {chartData.length >= 2 ? (
        <div className="bg-surface-card rounded-xl border border-hairline p-4">
          <p className="font-kedu text-xs text-muted mb-3">최근 30일 추이</p>
          <svg
            viewBox={`0 0 ${chartW} ${LINE_H}`}
            className="w-full overflow-visible"
            style={{ height: LINE_H }}
          >
            {/* 목표 체중 기준선 */}
            {targetY != null && targetY >= 0 && targetY <= LINE_H && (
              <line
                x1={0} y1={targetY} x2={chartW} y2={targetY}
                stroke="#6BAF8B" strokeWidth={1} strokeDasharray="4 3" opacity={0.6}
              />
            )}
            {/* 데이터 라인 */}
            <path d={pathD} fill="none" stroke="#5058F0" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* 데이터 점 */}
            {chartData.map((r, i) => (
              <circle
                key={r.id}
                cx={toX(i)}
                cy={toY(r.weight)}
                r={3}
                fill="white"
                stroke="#5058F0"
                strokeWidth={2}
              />
            ))}
          </svg>
          <div className="flex justify-between mt-1">
            <span className="font-kedu text-[10px] text-muted">
              {format(parseISO(chartData[0].recordedAt), 'M/d', { locale: ko })}
            </span>
            <span className="font-kedu text-[10px] text-muted">
              {format(parseISO(chartData[chartData.length - 1].recordedAt), 'M/d', { locale: ko })}
            </span>
          </div>
        </div>
      ) : chartData.length === 1 ? (
        <div className="bg-surface-soft rounded-xl p-4 text-center">
          <p className="font-kedu text-xs text-muted">기록이 2개 이상 있으면 그래프가 표시돼요</p>
        </div>
      ) : null}

      {/* 기록 입력 폼 */}
      {showForm ? (
        <div className="bg-surface-card rounded-xl border border-hairline p-4 space-y-3">
          <p className="font-kedu text-sm font-bold text-ink">체중 기록</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="font-kedu text-xs text-muted mb-1">체중 (kg)</p>
              <input
                type="number"
                step="0.1"
                min="1"
                max="500"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                placeholder="65.0"
                className="w-full h-10 bg-surface-soft rounded-lg px-3 font-myeong text-sm text-ink outline-none focus:ring-1 focus:ring-cobalt/40"
              />
            </div>
            <div className="flex-1">
              <p className="font-kedu text-xs text-muted mb-1">날짜</p>
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full h-10 bg-surface-soft rounded-lg px-3 font-myeong text-sm text-ink outline-none focus:ring-1 focus:ring-cobalt/40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 h-10 rounded-xl bg-surface-soft font-kedu text-sm text-muted"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={addMutation.isPending || !inputWeight}
              className="flex-1 h-10 rounded-xl bg-cobalt text-white font-kedu text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {addMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              저장
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-11 rounded-xl border border-dashed border-cobalt/40 text-cobalt font-kedu text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          오늘 체중 기록하기
        </button>
      )}

      {/* 기록 목록 */}
      {records.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-hairline divide-y divide-hairline overflow-hidden">
          {[...records].reverse().slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="font-myeong text-sm font-bold text-ink">{r.weight} kg</p>
                <p className="font-kedu text-xs text-muted">
                  {format(parseISO(r.recordedAt), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                disabled={deleteMutation.isPending}
                className="text-muted hover:text-coral p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    <Toast visible={toast.visible} message={toast.message} />
    </>
  );
}
