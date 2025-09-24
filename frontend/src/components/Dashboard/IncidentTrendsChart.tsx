import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface TrendData {
  date: string;
  ransomware: number;
  falsePositive: number;
  total: number;
}

interface IncidentTrendsChartProps {
  data: TrendData[];
}

const IncidentTrendsChart: React.FC<IncidentTrendsChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Incident Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            formatter={(value: number) => [value, 'Count']}
            separator=": "
            contentStyle={{ backgroundColor: '#f9fafb', borderRadius: 4, borderColor: '#ddd' }}
            cursor={{ stroke: '#597ef7', strokeWidth: 2 }}
          />
          <Legend verticalAlign="top" height={36} />
          <Line 
            type="monotone" 
            dataKey="ransomware" 
            stroke="#ff4d4f" 
            strokeWidth={2} 
            activeDot={{ r: 8 }} 
            isAnimationActive 
          />
          <Line 
            type="monotone" 
            dataKey="falsePositive" 
            stroke="#36cfc9" 
            strokeWidth={2} 
            isAnimationActive 
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#597ef7" 
            strokeWidth={2} 
            strokeDasharray="5 5" 
            isAnimationActive 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncidentTrendsChart;
