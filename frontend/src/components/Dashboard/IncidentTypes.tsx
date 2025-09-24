import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, PieLabelRenderProps } from 'recharts';

interface IncidentTypesProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ['#ff4d4f', '#36cfc9', '#597ef7', '#9254de', '#ffc53d'];

const IncidentTypes: React.FC<IncidentTypesProps> = ({ data }) => {
  const renderLabel = (props: PieLabelRenderProps) => {
    const { name, percent } = props;

    // Ensure percent is a number
    const safePercent = typeof percent === 'number' ? percent : 0;

    if (!name) return null;
    return `${name}: ${(safePercent * 100).toFixed(0)}%`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Incident Types</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value} incidents`}
            itemStyle={{ fontWeight: 'bold' }}
            contentStyle={{ backgroundColor: '#fafafa', borderRadius: 4, borderColor: '#ccc' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncidentTypes;
