import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { IncidentProvider } from './contexts/IncidentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import NotificationCenter from './components/Common/NotificationCenter';
import { IncidentsPage, ThreatIntelPage, WorkflowsPage, AuditLogsPage } from './pages';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <IncidentProvider>
                    <NotificationProvider>
                        <NotificationCenter />
                        <AppContent />
                    </NotificationProvider>
                </IncidentProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

// Main app content (needs to be inside AuthProvider to use useAuth)
function AppContent() {
    const { isAuthenticated, logout } = useAuth();

    return (
        <Routes>
            {/* Public Route - Login */}
            <Route
                path="/login"
                element={
                    isAuthenticated ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <Login />
                    )
                }
            />

            {/* Protected Routes - Wrapped in AppLayout */}
            <Route
                path="/*"
                element={
                    isAuthenticated ? (
                        <AppLayout onLogout={logout}>
                            <Routes>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                {/* Placeholder routes */}
                                <Route path="/threat-intel" element={<ThreatIntelPage />} />
                                <Route path="/incidents" element={<IncidentsPage />} />
                                <Route path="/workflows" element={<WorkflowsPage />} />
                                <Route path="/audit-logs" element={<AuditLogsPage />} />
                                <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
                            </Routes>
                        </AppLayout>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />
        </Routes>
    );
}

// Placeholder page component for testing navigation
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-text-primary mb-4">{title}</h1>
            <p className="text-text-secondary">This page is under construction</p>
            <div className="mt-8 p-6 bg-dark-surface rounded-lg border border-accent-teal/20">
                <p className="text-sm text-text-secondary">
                    Navigate using the sidebar to test the navigation system
                </p>
            </div>
        </div>
    </div>
);

export default App;

