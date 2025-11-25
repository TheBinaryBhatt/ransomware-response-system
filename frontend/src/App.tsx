// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { IncidentProvider } from './contexts/IncidentContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ThreatIntel from './pages/ThreatIntel';
import WorkflowMonitor from './pages/WorkflowMonitor';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import IncidentDetail from './pages/IncidentDetail';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <IncidentProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="threat-intel" element={<ThreatIntel />} />
              <Route path="workflows/:incidentId" element={<WorkflowMonitor />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
              <Route path="incidents/:id" element={<IncidentDetail />} />
            </Route>
          </Routes>
        </IncidentProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;