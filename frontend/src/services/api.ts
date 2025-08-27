import axios from 'axios';
import { Incident, ApiResponse } from '../types/Incident';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const incidentAPI = {
  getIncidents: async (): Promise<ApiResponse<Incident[]>> => {
    try {
      const response = await api.get('/incidents');
      return { data: response.data };
    } catch (error) {
      return { error: 'Failed to fetch incidents' };
    }
  },

  triggerResponse: async (incidentId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post(`/incidents/${incidentId}/respond`);
      return { data: response.data };
    } catch (error) {
      return { error: 'Failed to trigger response' };
    }
  },
};