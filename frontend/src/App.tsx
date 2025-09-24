import React from 'react';
import { IncidentProvider } from './contexts/IncidentContext';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkflowMonitor from './pages/WorkflowMonitor'; // Import WorkflowMonitor
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  return auth.isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <IncidentProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/workflows/:incidentId"
                element={
                  <PrivateRoute>
                    <WorkflowMonitorWrapper />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </IncidentProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Wrapper to extract incidentId param and pass as prop to WorkflowMonitor
import { useParams } from 'react-router-dom';
const WorkflowMonitorWrapper: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  if (!incidentId) {
    return <div>Incident ID not provided</div>;
  }
  return <WorkflowMonitor incidentId={incidentId} />;
};

export default App;
