'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface NutritionChartProps {
  carbs: number;
  protein: number;
  fat: number;
}

const PIE_COLORS = ['#e8b94a', '#70b080', '#e85d4a'];

// 1일 영양성분 기준치 (식약처, 2,000 kcal 기준)
const DAILY_REF = { carbs: 324, protein: 55, fat: 54 };

const CHART_H = 88;

export function NutritionChart({ carbs, protein, fat }: NutritionChartProps) {
  const total = carbs + protein + fat;
  if (total === 0) return null;

  const pieData = [
    { name: '탄수화물', value: Math.round(carbs) },
    { name: '단백질',   value: Math.round(protein) },
    { name: '지방',     value: Math.round(fat) },
  ];

  const barData = [
    { label: '탄수화물', value: Math.round(carbs),   ref: DAILY_REF.carbs,   color: '#e8b94a' },
    { label: '단백질',   value: Math.round(protein), ref: DAILY_REF.protein, color: '#70b080' },
    { label: '지방',     value: Math.round(fat),     ref: DAILY_REF.fat,     color: '#e85d4a' },
  ];

  const maxScale = Math.max(...barData.map(d => d.value), ...barData.map(d => d.ref));

  return (
    <div className="flex items-center gap-2">
      {/* 도넛 차트 — 왼쪽 */}
      <div style={{ width: '54%', height: 180, transform: 'translateX(-10px)' }} className="flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="44%"
              innerRadius={44} outerRadius={60}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [`${v}g`, name]}
              contentStyle={{
                fontFamily: 'Nanum-Myeongjo, serif',
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e0d8cc',
              }}
            />
            <Legend
              iconSize={8}
              formatter={(v) => (
                <span style={{ fontFamily: 'Nanum-Myeongjo, serif', fontSize: 11 }}>{v}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 세로 막대 그래프 — 오른쪽, 같은 높이에 맞춰 중앙 정렬 */}
      <div className="flex-1 relative" style={{ height: 180, transform: 'translateX(-5px)' }}>
        {/* 막대 그룹 — 세로 중앙 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {/* 기준치 대비 레이블 — 바 그룹 우측 상단 */}
          <p className="font-myeong text-[10px] text-muted-soft self-end leading-none mb-1">
            기준치 대비
          </p>
          <div className="flex items-end justify-around gap-1 w-full">
            {barData.map((d) => {
              const barH  = Math.min((d.value / maxScale) * CHART_H, CHART_H);
              const refH  = (d.ref / maxScale) * CHART_H;
              const exceeded = d.value > d.ref;

              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-[3px]">
                  {/* 실제 섭취량 (초과 시 빨간색) */}
                  <span
                    className="font-myeong text-[10px] font-bold"
                    style={{ color: exceeded ? '#e85d4a' : '#2c2520' }}
                  >
                    {d.value}g
                  </span>

                  {/* 바 영역 */}
                  <div className="relative w-5" style={{ height: CHART_H }}>
                    {/* 기준치 배경 바 (회색, 각진 상단) */}
                    <div
                      className="absolute bottom-0 w-full bg-surface-strong"
                      style={{ height: refH }}
                    />
                    {/* 실제 섭취 바 (각진 상단) */}
                    <div
                      className="absolute bottom-0 w-full transition-all duration-500"
                      style={{ height: barH, backgroundColor: d.color, opacity: 0.88 }}
                    />
                    {/* 기준치 선 */}
                    <div
                      className="absolute h-[1.5px]"
                      style={{
                        bottom: refH,
                        left: -4,
                        right: -4,
                        backgroundColor: 'rgba(0,0,0,0.22)',
                      }}
                    />
                  </div>

                  {/* 영양소 이름 */}
                  <span className="font-myeong text-[10px] text-muted text-center leading-tight whitespace-nowrap">
                    {d.label}
                  </span>
                  {/* 기준치 */}
                  <span className="font-myeong text-[9px] text-muted-soft">
                    /{d.ref}g
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
