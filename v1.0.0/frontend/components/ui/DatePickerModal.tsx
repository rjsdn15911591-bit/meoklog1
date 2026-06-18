'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isAfter,
  addMonths, subMonths, format,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DatePickerModalProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function DatePickerModal({ value, onChange, onClose }: DatePickerModalProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date(value));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewMonth),     { weekStartsOn: 0 }),
  });

  const canGoNext = !isSameMonth(viewMonth, today) && !isAfter(viewMonth, today);

  const handleDay = (day: Date) => {
    if (isAfter(day, today)) return;
    onChange(day);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-[480px] bg-surface-card rounded-t-[24px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 손잡이 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-hairline" />
        </div>

        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between px-md py-sm">
          <button
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-10 h-10 flex items-center justify-center text-muted hover:text-ink rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <p className="font-jalnan text-[17px] text-ink">
            {format(viewMonth, 'yyyy년 M월', { locale: ko })}
          </p>
          <button
            onClick={() => setViewMonth(m => addMonths(m, 1))}
            disabled={!canGoNext}
            className="w-10 h-10 flex items-center justify-center text-muted hover:text-ink rounded-xl transition-colors disabled:opacity-20"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-md mb-1">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                'text-center font-kedu text-xs py-1',
                i === 0 ? 'text-coral' : i === 6 ? 'text-cobalt' : 'text-muted-soft'
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 px-md gap-y-1 pb-sm">
          {days.map(day => {
            const inMonth  = isSameMonth(day, viewMonth);
            const selected = isSameDay(day, value);
            const isToday  = isSameDay(day, today);
            const future   = isAfter(day, today);
            const sun = day.getDay() === 0;
            const sat = day.getDay() === 6;

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDay(day)}
                disabled={future}
                className={cn(
                  'h-10 w-full flex items-center justify-center rounded-xl font-jalnan text-sm transition-colors',
                  !inMonth && 'opacity-20',
                  future && 'cursor-not-allowed opacity-20',
                  selected && 'bg-peach text-ink',
                  isToday && !selected && 'border-2 border-peach text-ink',
                  !selected && !future && sun && inMonth && 'text-coral',
                  !selected && !future && sat && inMonth && 'text-cobalt',
                  !selected && !future && !sun && !sat && inMonth && 'text-ink',
                  !selected && !future && 'hover:bg-surface-soft',
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* 오늘 바로가기 */}
        <div className="px-md pt-xs pb-lg">
          <button
            onClick={() => { onChange(today); onClose(); }}
            className="w-full h-11 rounded-xl bg-surface-soft font-kedu font-bold text-sm text-ink hover:bg-surface-strong transition-colors active:scale-[0.98]"
          >
            오늘로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
