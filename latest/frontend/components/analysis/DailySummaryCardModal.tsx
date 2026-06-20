'use client';

import { useRef, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { cn, formatCalories } from '@/lib/utils';
import type { DailySummary } from '@/types';

interface DailySummaryCardModalProps {
  summary: DailySummary;
  dateLabel: string;
  onClose: () => void;
}

const MEAL_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  breakfast: { label: '아침', color: '#F9B77B', bg: '#FFF4EB', emoji: '🌅' },
  lunch:     { label: '점심', color: '#E6A820', bg: '#FFF8E0', emoji: '☀️' },
  dinner:    { label: '저녁', color: '#5058F0', bg: '#EEEFFE', emoji: '🌙' },
  snack:     { label: '간식', color: '#6BAF8B', bg: '#EAF5EE', emoji: '🍪' },
};

export function DailySummaryCardModal({ summary, dateLabel, onClose }: DailySummaryCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const rate = Math.round(summary.achievementRate);
  const totalMacros = summary.totalCarbs + summary.totalProtein + summary.totalFat;
  const carbPct  = totalMacros > 0 ? (summary.totalCarbs   / totalMacros) * 100 : 55;
  const protPct  = totalMacros > 0 ? (summary.totalProtein / totalMacros) * 100 : 25;
  const fatPct   = totalMacros > 0 ? (summary.totalFat     / totalMacros) * 100 : 20;

  const calPct = Math.min((summary.totalCalories / Math.max(summary.targetCalories, 1)) * 100, 100);

  const accentColor = rate >= 110 ? '#F06060' : rate >= 100 ? '#5058F0' : rate >= 80 ? '#E6A820' : '#6BAF8B';
  const accentBg    = rate >= 110 ? '#FEF0F0' : rate >= 100 ? '#EEEFFE' : rate >= 80 ? '#FFF8E0' : '#EAF5EE';

  const handleExport = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const options = {
        pixelRatio: 3,
        cacheBust: true,
        skipFonts: false,
        style: {
          fontFamily: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
        },
      };
      // html-to-image 첫 호출은 폰트 임베드가 누락되는 알려진 버그 → 두 번 호출해 두 번째 결과 사용
      await toPng(cardRef.current!, options);
      const dataUrl = await toPng(cardRef.current!, options);
      const link = document.createElement('a');
      link.download = `먹로그_${dateLabel}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('이미지 내보내기 실패:', err);
      alert('이미지 저장에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const breakdown = [
    { key: 'breakfast', cal: summary.breakdown.breakfast },
    { key: 'lunch',     cal: summary.breakdown.lunch },
    { key: 'dinner',    cal: summary.breakdown.dinner },
    { key: 'snack',     cal: summary.breakdown.snack },
  ].filter(({ cal }) => cal > 0);

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-surface-card rounded-t-2xl px-5 pt-5 pb-10 space-y-4 animate-slide-up">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="font-kedu font-bold text-lg text-ink">하루 식단 요약 카드</h2>
          <button onClick={onClose} className="p-1 text-muted"><X size={20} /></button>
        </div>

        {/* 카드 미리보기 */}
        <div
          ref={cardRef}
          style={{
            background: 'linear-gradient(135deg, #FAFAFA 0%, #F4F4FF 100%)',
            borderRadius: 20,
            padding: '20px 20px 20px 20px',
            fontFamily: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            boxSizing: 'border-box',
          }}
        >
          {/* 브랜드 + 날짜 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#5058F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>🍽️</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E', letterSpacing: '-0.02em' }}>먹로그</span>
            </div>
            <span style={{ fontSize: 12, color: '#9EA3B0', fontWeight: 500 }}>{dateLabel}</span>
          </div>

          {/* 칼로리 & 달성률 */}
          <div style={{
            background: accentBg,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 11, color: '#9EA3B0', fontWeight: 500, marginBottom: 4 }}>오늘 섭취 칼로리</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
                    {formatCalories(summary.totalCalories)}
                  </span>
                  <span style={{ fontSize: 13, color: '#9EA3B0', fontWeight: 500 }}>kcal</span>
                </div>
                <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 2 }}>
                  목표 {formatCalories(summary.targetCalories)} kcal
                </p>
              </div>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: accentColor,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'white', lineHeight: 1 }}>{rate}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>%</span>
              </div>
            </div>
            {/* 칼로리 프로그레스 바 */}
            <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${calPct}%`,
                background: accentColor, borderRadius: 99,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* 영양소 */}
          <div style={{
            background: 'white',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 11, color: '#9EA3B0', fontWeight: 500, marginBottom: 10 }}>영양소 분포</p>
            {/* 비율 바 */}
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, marginBottom: 10 }}>
              <div style={{ width: `${carbPct}%`, background: '#E6A820' }} />
              <div style={{ width: `${protPct}%`, background: '#6BAF8B' }} />
              <div style={{ width: `${fatPct}%`, background: '#F06060' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: '탄수화물', value: summary.totalCarbs, color: '#E6A820', unit: 'g' },
                { label: '단백질',   value: summary.totalProtein, color: '#6BAF8B', unit: 'g' },
                { label: '지방',     value: summary.totalFat, color: '#F06060', unit: 'g' },
              ].map(({ label, value, color, unit }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#9EA3B0', fontWeight: 500, marginBottom: 2 }}>{label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>
                      {Math.round(value * 10) / 10}
                    </span>
                    <span style={{ fontSize: 10, color: '#9EA3B0' }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 끼니별 */}
          {breakdown.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, color: '#9EA3B0', fontWeight: 500, marginBottom: 10 }}>끼니별 섭취</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {breakdown.map(({ key, cal }) => {
                  const m = MEAL_META[key] ?? { label: key, color: '#9EA3B0', bg: '#F5F5F5', emoji: '' };
                  const barPct = summary.targetCalories > 0 ? Math.min((cal / summary.targetCalories) * 100, 100) : 0;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, width: 18, flexShrink: 0, textAlign: 'center' }}>{m.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#5A5E72', width: 30, flexShrink: 0 }}>{m.label}</span>
                      <div style={{ flex: 1, height: 5, background: '#F0F0F5', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barPct}%`, background: m.color, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A2E', flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right', minWidth: 60 }}>
                        {formatCalories(cal)} kcal
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 하단 워터마크 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#C8CADB' }}>powered by</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9EA3B0' }}>먹로그</span>
          </div>
        </div>

        {/* 내보내기 버튼 */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            'w-full h-12 rounded-xl font-kedu font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95',
            isExporting ? 'bg-hairline text-muted' : 'bg-cobalt text-white'
          )}
        >
          {isExporting ? (
            <><Loader2 size={18} className="animate-spin" /> 저장 중...</>
          ) : (
            <><Download size={18} /> PNG로 저장</>
          )}
        </button>
      </div>
    </div>
  );
}
