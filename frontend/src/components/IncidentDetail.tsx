import React from 'react';
import { Incident } from '../types/Incident';

interface IncidentDetailProps {
  incident: Incident;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({ incident }) => {
  // Helper functions to handle both property naming conventions
  const getConfidence = () => {
    return incident.confidence !== undefined ? incident.confidence : 
           incident.ai_confidence !== undefined ? incident.ai_confidence : 0;
  };

  const getReasoning = () => {
    return incident.reasoning !== undefined ? incident.reasoning : 
           incident.ai_reasoning !== undefined ? incident.ai_reasoning : '';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Incident Details</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500">SIEM Alert ID</h3>
          <p className="text-lg">{incident.siem_alert_id}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Source</h3>
          <p className="text-lg">{incident.source}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
          <p className="text-lg">{new Date(incident.timestamp).toLocaleString()}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Confidence</h3>
          <p className="text-lg">{Math.round(getConfidence() * 100)}%</p>
        </div>
      </div>
      
      {incident.decision && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500">Decision</h3>
          <p className="text-lg font-semibold">{incident.decision}</p>
        </div>
      )}
      
      {getReasoning() && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500">Reasoning</h3>
          <p className="text-lg">{getReasoning()}</p>
        </div>
      )}
      
      {incident.response_status && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500">Response Status</h3>
          <p className="text-lg font-semibold">{incident.response_status}</p>
        </div>
      )}
      
      {incident.actions_taken && incident.actions_taken.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500">Actions Taken</h3>
          <ul className="list-disc list-inside">
            {incident.actions_taken.map((action, index) => (
              <li key={index} className="text-lg">{action}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Raw Data</h3>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
          {JSON.stringify(incident.raw_data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default IncidentDetail;