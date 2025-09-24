import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusDistributionProps {
  data: Array<{
    status: string;
    count: number;
  }>;
}

const StatusDistribution: React.FC<StatusDistributionProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Status Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            formatter={(value: number) => [`${value}`, 'Count']}
            contentStyle={{ backgroundColor: '#f9fafb', borderRadius: 4, borderColor: '#ddd' }}
            cursor={{ fill: 'rgba(25, 118, 210, 0.1)' }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="count" fill="#1890ff" isAnimationActive animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusDistribution;
