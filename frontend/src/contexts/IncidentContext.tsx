import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { Incident } from '../types/Incident';

interface IncidentState {
  incidents: Incident[];
  selectedIncident: Incident | null;
  isLoading: boolean;
  filters: {
    severity: string;
    status: string;
    confidence: string;
  };
}

type IncidentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_INCIDENT'; payload: Incident }
  | { type: 'UPDATE_INCIDENT'; payload: Incident }
  | { type: 'SELECT_INCIDENT'; payload: Incident | null }
  | { type: 'SET_INCIDENTS'; payload: Incident[] }
  | { type: 'SET_FILTERS'; payload: Partial<IncidentState['filters']> };

const initialState: IncidentState = {
  incidents: [],
  selectedIncident: null,
  isLoading: false,
  filters: {
    severity: '',
    status: '',
    confidence: ''
  }
};

const incidentReducer = (state: IncidentState, action: IncidentAction): IncidentState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'ADD_INCIDENT':
      return { ...state, incidents: [action.payload, ...state.incidents] };
    case 'UPDATE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.map(incident =>
          incident.id === action.payload.id ? action.payload : incident
        ),
      };
    case 'SELECT_INCIDENT':
      return { ...state, selectedIncident: action.payload };
    case 'SET_INCIDENTS':
      return { ...state, incidents: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    default:
      return state;
  }
};

interface IncidentContextType {
  state: IncidentState;
  dispatch: React.Dispatch<IncidentAction>;
  refreshIncidents: () => Promise<void>;
}

export const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export const useIncidents = (): IncidentContextType => {
  const context = useContext(IncidentContext);
  if (!context) throw new Error('useIncidents must be used within IncidentProvider');
  return context;
};

export const IncidentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(incidentReducer, initialState);
  const { onEvent } = useWebSocket('http://localhost:8000');

  const refreshIncidents = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const incidents = await api.getIncidents();
      dispatch({ type: 'SET_INCIDENTS', payload: incidents });
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    refreshIncidents();
  }, []);

  useEffect(() => {
    const cleanup = onEvent('incident_update', (incident: Incident) => {
      dispatch({ type: 'ADD_INCIDENT', payload: incident });
    });
    return cleanup;
  }, [onEvent]);

  return (
    <IncidentContext.Provider value={{ state, dispatch, refreshIncidents }}>
      {children}
    </IncidentContext.Provider>
  );
};
