import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { IncidentProvider } from './contexts/IncidentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import NotificationCenter from './components/Common/NotificationCenter';
import { IncidentsPage, WorkflowsPage, AuditLogsPage, SettingsPage } from './pages';
import QuarantinePage from './pages/QuarantinePage';

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <IncidentProvider>
                        <NotificationProvider>
                            <NotificationCenter />
                            <AppContent />
                        </NotificationProvider>
                    </IncidentProvider>
                </AuthProvider>
            </ThemeProvider>
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
                                <Route path="/incidents" element={<IncidentsPage />} />
                                <Route path="/workflows" element={<WorkflowsPage />} />
                                <Route path="/audit-logs" element={<AuditLogsPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/quarantine" element={<QuarantinePage />} />
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



export default App;

