import React from 'react';
import { IncidentProvider } from './contexts/IncidentContext';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ThreatIntel from './pages/ThreatIntel';
import WorkflowMonitor from './pages/WorkflowMonitor';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './index.css';
// Wrapper to extract incidentId param and pass as prop to WorkflowMonitor
import { useParams } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';

const PrivateShell: React.FC = () => {
  const auth = React.useContext(AuthContext);
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <IncidentProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateShell />}>
                <Route index element={<Dashboard />} />
                <Route path="/threat-intel" element={<ThreatIntel />} />
                <Route path="/workflows/:incidentId" element={<WorkflowMonitorWrapper />} />
              </Route>
            </Routes>
          </Router>
        </IncidentProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}


const WorkflowMonitorWrapper: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  if (!incidentId) {
    return <div>Incident ID not provided</div>;
  }
  return <WorkflowMonitor incidentId={incidentId} />;
};

export default App;
