// ============================================
// INCIDENT CONTEXT - Global Incident State
// ============================================

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import type { Incident } from '../types';
import type { IncidentQuery } from '../types/api';

interface IncidentContextType {
    incidents: Incident[];
    selectedIncident: Incident | null;
    isLoading: boolean;
    error: string | null;
    fetchIncidents: (query?: IncidentQuery) => Promise<void>;
    setSelectedIncident: (incident: Incident | null) => void;
    refetchIncidents: () => Promise<void>;
    updateIncident: (incident: Incident) => void;
    addIncident: (incident: Incident) => void;
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

interface IncidentProviderProps {
    children: ReactNode;
}

export const IncidentProvider: React.FC<IncidentProviderProps> = ({ children }) => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastQuery, setLastQuery] = useState<IncidentQuery | undefined>(undefined);

    const fetchIncidents = useCallback(async (query?: IncidentQuery) => {
        try {
            setIsLoading(true);
            setError(null);
            setLastQuery(query);

            const data = await api.incidents.getAll(query);
            setIncidents(data);
        } catch (err: any) {
            console.error('Failed to fetch incidents:', err);
            setError(err.message || 'Failed to fetch incidents');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refetchIncidents = useCallback(async () => {
        await fetchIncidents(lastQuery);
    }, [fetchIncidents, lastQuery]);

    const updateIncident = useCallback((updatedIncident: Incident) => {
        setIncidents((prev) =>
            prev.map((inc) =>
                inc.incident_id === updatedIncident.incident_id ? updatedIncident : inc
            )
        );

        // Update selected incident if it's the same
        if (selectedIncident?.incident_id === updatedIncident.incident_id) {
            setSelectedIncident(updatedIncident);
        }
    }, [selectedIncident]);

    const addIncident = useCallback((newIncident: Incident) => {
        setIncidents((prev) => [newIncident, ...prev]);
    }, []);

    const value: IncidentContextType = {
        incidents,
        selectedIncident,
        isLoading,
        error,
        fetchIncidents,
        setSelectedIncident,
        refetchIncidents,
        updateIncident,
        addIncident,
    };

    return (
        <IncidentContext.Provider value={value}>
            {children}
        </IncidentContext.Provider>
    );
};

export const useIncidents = (): IncidentContextType => {
    const context = useContext(IncidentContext);
    if (context === undefined) {
        throw new Error('useIncidents must be used within an IncidentProvider');
    }
    return context;
};

export default IncidentContext;
