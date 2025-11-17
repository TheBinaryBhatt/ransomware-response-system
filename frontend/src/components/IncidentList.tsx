import React from 'react';
import type { Incident } from '../types/Incident';

interface IncidentListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

const IncidentList: React.FC<IncidentListProps> = ({ incidents, onSelectIncident }) => {
  // Helper function to get confidence value
  const getConfidence = (incident: Incident) => {
    return incident.confidence !== undefined ? incident.confidence : 
           incident.ai_confidence !== undefined ? incident.ai_confidence : 0;
  };

  return (
    <div className="space-y-2">
      {incidents.map(incident => (
        <div
          key={incident.id}
          className="p-4 bg-white rounded-lg shadow cursor-pointer hover:bg-blue-50 transition-colors"
          onClick={() => onSelectIncident(incident)}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg">{incident.siem_alert_id}</h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                getConfidence(incident) > 0.7
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {Math.round(getConfidence(incident) * 100)}%
            </span>
          </div>
          <p className="text-sm text-gray-600">{incident.source}</p>
          <p className="text-xs text-gray-500">
            {new Date(incident.timestamp).toLocaleString()}
          </p>
        </div>
      ))}
      {incidents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No incidents found
        </div>
      )}
    </div>
  );
};

export default IncidentList;