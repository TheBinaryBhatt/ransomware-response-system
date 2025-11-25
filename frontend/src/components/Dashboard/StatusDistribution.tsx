// src/components/Dashboard/StatusDistribution.tsx
import React from 'react';

interface StatusDistributionProps {
  data: Array<{ name: string; value: number }>;
}

const StatusDistribution: React.FC<StatusDistributionProps> = ({ data }) => {
  return (
    <div className="w-full h-48 bg-dark-secondary rounded-lg p-4 flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-lg mb-2">Status Distribution Chart</div>
        <div className="text-sm">Bar chart visualization would appear here</div>
        <div className="text-xs mt-2 text-gray-500">
          {data.length} status types
        </div>
      </div>
    </div>
  );
};

export default StatusDistribution;