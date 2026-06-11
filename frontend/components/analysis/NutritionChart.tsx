'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface NutritionChartProps {
  carbs: number;
  protein: number;
  fat: number;
}

const COLORS = ['#e8b94a', '#70b080', '#e85d4a'];
const LABELS = ['탄수화물', '단백질', '지방'];

export function NutritionChart({ carbs, protein, fat }: NutritionChartProps) {
  const total = carbs + protein + fat;
  if (total === 0) return null;

  const data = [
    { name: '탄수화물', value: Math.round(carbs), g: Math.round(carbs) },
    { name: '단백질', value: Math.round(protein), g: Math.round(protein) },
    { name: '지방', value: Math.round(fat), g: Math.round(fat) },
  ];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value}g`, name]}
            contentStyle={{
              fontFamily: 'Nanum-Myeongjo, serif',
              fontSize: '12px',
              borderRadius: '8px',
              border: '1px solid #e0d8cc',
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontFamily: 'Nanum-Myeongjo, serif', fontSize: '12px' }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
