// src/components/Dashboard/IncidentTypes.tsx
import React from 'react';

interface IncidentTypesProps {
  data: Array<{ name: string; value: number }>;
}

const IncidentTypes: React.FC<IncidentTypesProps> = ({ data }) => {
  return (
    <div className="w-full h-48 bg-dark-secondary rounded-lg p-4 flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-lg mb-2">Threat Breakdown Chart</div>
        <div className="text-sm">Pie chart visualization would appear here</div>
        <div className="text-xs mt-2 text-gray-500">
          {data.length} threat types
        </div>
      </div>
    </div>
  );
};

export default IncidentTypes;