// src/components/Dashboard/IncidentTrendsChart.tsx
import React from 'react';

interface IncidentTrendsChartProps {
  data: Array<{ date: string; count: number }>;
}

const IncidentTrendsChart: React.FC<IncidentTrendsChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64 bg-dark-secondary rounded-lg p-4 flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-lg mb-2">Incident Trends Chart</div>
        <div className="text-sm">Chart visualization would appear here</div>
        <div className="text-xs mt-2 text-gray-500">
          Data points: {data.length}
        </div>
      </div>
    </div>
  );
};

export default IncidentTrendsChart;