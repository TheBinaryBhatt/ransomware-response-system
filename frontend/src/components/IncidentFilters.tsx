import React from 'react';
import { useForm } from 'react-hook-form';
import { Severity, IncidentStatus } from '../types/Incident';

interface IncidentFilterValues {
  severity: string;
  status: string;
  confidence: string;
}

interface IncidentFiltersProps {
  onFilter: (filters: IncidentFilterValues) => void;
}

const IncidentFilters: React.FC<IncidentFiltersProps> = ({ onFilter }) => {
  const { register, handleSubmit } = useForm<IncidentFilterValues>();

  const onSubmit = (data: IncidentFilterValues) => {
    onFilter(data);
  };

  // Convert enum values to arrays for mapping
  const severityValues = Object.values(Severity) as string[];
  const statusValues = Object.values(IncidentStatus) as string[];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-4 p-4 bg-white rounded shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Severity</label>
          <select {...register('severity')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="">All</option>
            {severityValues.map(severity => (
              <option key={severity} value={severity}>{severity}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select {...register('status')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="">All</option>
            {statusValues.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Confidence</label>
          <select {...register('confidence')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="">All</option>
            <option value="0.9">High (90%+)</option>
            <option value="0.7">Medium (70%+)</option>
            <option value="0.5">Low (50%+)</option>
          </select>
        </div>
      </div>
      
      <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Apply Filters
      </button>
    </form>
  );
};

export default IncidentFilters;