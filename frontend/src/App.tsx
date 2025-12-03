// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if user has JWT token
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, []);

    if (!isAuthenticated) {
        return (
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <div className="flex h-screen bg-gray-900">
                {/* Sidebar - Fixed Width */}
                <Sidebar onLogout={() => setIsAuthenticated(false)} />

                {/* Main Content - Takes Remaining Space */}
                <main className="flex-1 overflow-auto bg-gray-900">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
