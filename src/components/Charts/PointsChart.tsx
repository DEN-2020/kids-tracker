import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Описываем структуру данных для графика
interface ChartDataItem {
  name: string;   // Дата (например, "12 окт")
  points: number; // Количество очков
}

interface PointsChartProps {
  data: ChartDataItem[];
}

export const PointsChart: React.FC<PointsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250} debounce={50}>
      <LineChart 
        data={data} 
        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="var(--border-color)" 
          vertical={false} 
        />
        <XAxis 
          dataKey="name" 
          stroke="var(--text-secondary)" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="var(--text-secondary)" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border-color)', 
            borderRadius: '12px', 
            color: 'var(--text-main)',
            fontSize: '12px'
          }}
          itemStyle={{ color: 'var(--accent-blue)' }}
          // Чтобы тултип не вылезал за границы контейнера
          cursor={{ stroke: 'var(--accent-blue)', strokeWidth: 1 }}
        />
        <Line 
          type="monotone" 
          dataKey="points" 
          stroke="var(--accent-blue)" 
          strokeWidth={4} 
          dot={{ 
            r: 4, 
            fill: 'var(--accent-blue)', 
            stroke: 'var(--card-bg)', 
            strokeWidth: 2 
          }}
          activeDot={{ 
            r: 6, 
            strokeWidth: 0 
          }}
          // Анимация включена для красоты
          isAnimationActive={true}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};