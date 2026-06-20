'use client';

import { useState } from 'react';
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
  const [isExporting, setIsExporting] = useState(false);

  const rate = Math.round(summary.achievementRate);
  const totalMacros = summary.totalCarbs + summary.totalProtein + summary.totalFat;
  const carbPct  = totalMacros > 0 ? (summary.totalCarbs   / totalMacros) * 100 : 55;
  const protPct  = totalMacros > 0 ? (summary.totalProtein / totalMacros) * 100 : 25;
  const fatPct   = totalMacros > 0 ? (summary.totalFat     / totalMacros) * 100 : 20;

  const calPct = Math.min((summary.totalCalories / Math.max(summary.targetCalories, 1)) * 100, 100);

  const accentColor = rate >= 110 ? '#F06060' : rate >= 100 ? '#5058F0' : rate >= 80 ? '#E6A820' : '#6BAF8B';
  const accentBg    = rate >= 110 ? '#FEF0F0' : rate >= 100 ? '#EEEFFE' : rate >= 80 ? '#FFF8E0' : '#EAF5EE';

  const breakdown = [
    { key: 'breakfast', cal: summary.breakdown.breakfast },
    { key: 'lunch',     cal: summary.breakdown.lunch },
    { key: 'dinner',    cal: summary.breakdown.dinner },
    { key: 'snack',     cal: summary.breakdown.snack },
  ].filter(({ cal }) => cal > 0);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;

      const DPR = 8;        // 8x → 4320px 출력 (4K급 최고 화질)
      const LW  = 540;      // logical width

      const PAD    = 28;    // 카드 외부 여백
      const IV     = 14;    // 섹션 내부 상하 여백
      const IH     = 16;    // 섹션 내부 좌우 여백
      const SEC_R  = 14;    // 섹션 모서리 반지름
      const GAP    = 14;    // 섹션 간격
      const CIRCLE_R = 26;  // 달성률 원 반지름

      // 섹션 높이 (픽셀)
      const calH = IV + 15 + 4 + 34 + 2 + 15 + 10 + 6 + IV;    // 114
      const nutH = IV + 15 + 10 + 8  + 10 + 14 + 2 + 20 + IV;  // 107
      const ROW_H = 20, ROW_GAP = 7;
      const brkH = breakdown.length > 0
        ? IV + 15 + 10 + breakdown.length * ROW_H + Math.max(0, breakdown.length - 1) * ROW_GAP + IV
        : 0;
      const WM_H = 24;

      const totalH = PAD + 28 + 20 + calH + GAP + nutH
        + (breakdown.length > 0 ? GAP + brkH : 0)
        + GAP + WM_H + PAD;

      const canvas = document.createElement('canvas');
      canvas.width  = LW * DPR;
      canvas.height = totalH * DPR;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(DPR, DPR);

      // 헬퍼: 둥근 사각형 경로
      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        const rc = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rc, y);
        ctx.lineTo(x + w - rc, y);
        ctx.arcTo(x + w, y, x + w, y + rc, rc);
        ctx.lineTo(x + w, y + h - rc);
        ctx.arcTo(x + w, y + h, x + w - rc, y + h, rc);
        ctx.lineTo(x + rc, y + h);
        ctx.arcTo(x, y + h, x, y + h - rc, rc);
        ctx.lineTo(x, y + rc);
        ctx.arcTo(x, y, x + rc, y, rc);
        ctx.closePath();
      };

      const font = (size: number, weight = 400) =>
        `${weight} ${size}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;

      // 배경 그라디언트
      const bgGrad = ctx.createLinearGradient(0, 0, LW, totalH);
      bgGrad.addColorStop(0, '#FAFAFA');
      bgGrad.addColorStop(1, '#F4F4FF');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, LW, totalH);

      let y = PAD;

      // ── 로고 행 ──
      ctx.fillStyle = '#5058F0';
      rr(PAD, y, 28, 28, 8);
      ctx.fill();
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍽️', PAD + 14, y + 14);

      ctx.fillStyle = '#1A1A2E';
      ctx.font = font(14, 700);
      ctx.textAlign = 'left';
      ctx.fillText('먹로그', PAD + 36, y + 14);

      ctx.fillStyle = '#9EA3B0';
      ctx.font = font(12, 500);
      ctx.textAlign = 'right';
      ctx.fillText(dateLabel, LW - PAD, y + 14);

      y += 48; // 28 + 20

      // ── 칼로리 섹션 ──
      const calCardY = y;
      ctx.fillStyle = accentBg;
      rr(PAD, calCardY, LW - PAD * 2, calH, SEC_R);
      ctx.fill();

      // 달성률 원
      const circCX = LW - PAD - IH - CIRCLE_R;
      const circCY = calCardY + IV + CIRCLE_R;
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(circCX, circCY, CIRCLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = font(17, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(rate), circCX, circCY - 4);
      ctx.font = font(9, 500);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('%', circCX, circCY + 11);

      // 좌측 텍스트
      const cx0 = PAD + IH;
      let cy = calCardY + IV;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.fillStyle = '#9EA3B0';
      ctx.font = font(11, 500);
      ctx.fillText('오늘 섭취 칼로리', cx0, cy);
      cy += 15 + 4;

      ctx.fillStyle = '#1A1A2E';
      ctx.font = font(34, 800);
      const calStr = formatCalories(summary.totalCalories);
      ctx.fillText(calStr, cx0, cy);
      const calStrW = ctx.measureText(calStr).width;

      ctx.fillStyle = '#9EA3B0';
      ctx.font = font(13, 500);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(' kcal', cx0 + calStrW, cy + 34);
      cy += 34 + 2;

      ctx.textBaseline = 'top';
      ctx.fillStyle = '#9EA3B0';
      ctx.font = font(11, 400);
      ctx.fillText(`목표 ${formatCalories(summary.targetCalories)} kcal`, cx0, cy);

      // 프로그레스 바
      const barY = calCardY + calH - IV - 6;
      const barW = LW - PAD * 2 - IH * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      rr(cx0, barY, barW, 6, 3);
      ctx.fill();
      if (calPct > 0) {
        ctx.fillStyle = accentColor;
        rr(cx0, barY, barW * calPct / 100, 6, 3);
        ctx.fill();
      }

      y += calH + GAP;

      // ── 영양소 섹션 ──
      const nutCardY = y;
      ctx.fillStyle = 'white';
      rr(PAD, nutCardY, LW - PAD * 2, nutH, SEC_R);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#9EA3B0';
      ctx.font = font(11, 500);
      ctx.fillText('영양소 분포', PAD + IH, nutCardY + IV);

      const macBarX   = PAD + IH;
      const macBarY   = nutCardY + IV + 15 + 10;
      const macBarW   = LW - PAD * 2 - IH * 2;
      const carbPx    = macBarW * carbPct / 100;
      const protPx    = macBarW * protPct / 100;
      const fatPx     = macBarW * fatPct / 100;
      const fatStartX = macBarX + carbPx + protPx;

      ctx.fillStyle = '#F0F0F5';
      rr(macBarX, macBarY, macBarW, 8, 4);
      ctx.fill();

      if (carbPx > 0) {
        ctx.fillStyle = '#E6A820';
        ctx.beginPath();
        ctx.moveTo(macBarX + 4, macBarY);
        ctx.lineTo(macBarX + carbPx, macBarY);
        ctx.lineTo(macBarX + carbPx, macBarY + 8);
        ctx.lineTo(macBarX + 4, macBarY + 8);
        ctx.arcTo(macBarX, macBarY + 8, macBarX, macBarY + 4, 4);
        ctx.lineTo(macBarX, macBarY + 4);
        ctx.arcTo(macBarX, macBarY, macBarX + 4, macBarY, 4);
        ctx.closePath();
        ctx.fill();
      }
      if (protPx > 0) {
        ctx.fillStyle = '#6BAF8B';
        ctx.fillRect(macBarX + carbPx, macBarY, protPx, 8);
      }
      if (fatPx > 0) {
        ctx.fillStyle = '#F06060';
        ctx.beginPath();
        ctx.moveTo(fatStartX, macBarY);
        ctx.lineTo(fatStartX + fatPx - 4, macBarY);
        ctx.arcTo(fatStartX + fatPx, macBarY, fatStartX + fatPx, macBarY + 4, 4);
        ctx.lineTo(fatStartX + fatPx, macBarY + 8 - 4);
        ctx.arcTo(fatStartX + fatPx, macBarY + 8, fatStartX + fatPx - 4, macBarY + 8, 4);
        ctx.lineTo(fatStartX, macBarY + 8);
        ctx.closePath();
        ctx.fill();
      }

      const macColY = macBarY + 8 + 10;
      const colW3   = macBarW / 3;
      const macItems = [
        { label: '탄수화물', value: summary.totalCarbs,   color: '#E6A820' },
        { label: '단백질',   value: summary.totalProtein, color: '#6BAF8B' },
        { label: '지방',     value: summary.totalFat,     color: '#F06060' },
      ];

      macItems.forEach(({ label, value, color }, i) => {
        const colCX = macBarX + colW3 * i + colW3 / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#9EA3B0';
        ctx.font = font(10, 500);
        ctx.fillText(label, colCX, macColY);

        const valStr = String(Math.round(value * 10) / 10);
        ctx.fillStyle = color;
        ctx.font = font(20, 700);
        ctx.fillText(valStr, colCX, macColY + 14);

        const vW = ctx.measureText(valStr).width;
        ctx.fillStyle = '#9EA3B0';
        ctx.font = font(10, 400);
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('g', colCX + vW / 2 + 2, macColY + 14 + 20);
      });

      ctx.textAlign = 'left';
      y += nutH + GAP;

      // ── 끼니별 섹션 ──
      if (breakdown.length > 0) {
        const brkCardY = y;
        ctx.fillStyle = 'white';
        rr(PAD, brkCardY, LW - PAD * 2, brkH, SEC_R);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#9EA3B0';
        ctx.font = font(11, 500);
        ctx.fillText('끼니별 섭취', PAD + IH, brkCardY + IV);

        let rowY = brkCardY + IV + 15 + 10;

        breakdown.forEach(({ key, cal }, idx) => {
          if (idx > 0) rowY += ROW_GAP;
          const m = MEAL_META[key] ?? { label: key, color: '#9EA3B0', emoji: '' };

          ctx.font = '13px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(m.emoji, PAD + IH + 9, rowY + ROW_H / 2);

          ctx.fillStyle = '#5A5E72';
          ctx.font = font(11, 600);
          ctx.textAlign = 'left';
          ctx.fillText(m.label, PAD + IH + 22, rowY + ROW_H / 2);

          const rowBarX = PAD + IH + 60;
          const calStr2 = `${formatCalories(cal)} kcal`;
          ctx.font = font(11, 700);
          const calLW2  = ctx.measureText(calStr2).width;
          const rowBarW2 = LW - PAD - IH - rowBarX - calLW2 - 8;
          const brkPct2 = summary.targetCalories > 0
            ? Math.min((cal / summary.targetCalories) * 100, 100) : 0;

          ctx.fillStyle = '#F0F0F5';
          rr(rowBarX, rowY + ROW_H / 2 - 2.5, rowBarW2, 5, 2.5);
          ctx.fill();
          if (brkPct2 > 0) {
            ctx.fillStyle = m.color;
            rr(rowBarX, rowY + ROW_H / 2 - 2.5, rowBarW2 * brkPct2 / 100, 5, 2.5);
            ctx.fill();
          }

          ctx.fillStyle = '#1A1A2E';
          ctx.font = font(11, 700);
          ctx.textAlign = 'right';
          ctx.fillText(calStr2, LW - PAD - IH, rowY + ROW_H / 2);

          rowY += ROW_H;
        });

        y += brkH + GAP;
      }

      // ── 워터마크 ──
      ctx.fillStyle = '#C8CADB';
      ctx.font = font(10, 400);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('powered by 먹로그', LW / 2, y + WM_H / 2);

      // PNG 다운로드 (lossless, 최대 품질)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `먹로그_${dateLabel}.png`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('이미지 내보내기 실패:', err);
      alert('이미지 저장에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

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
