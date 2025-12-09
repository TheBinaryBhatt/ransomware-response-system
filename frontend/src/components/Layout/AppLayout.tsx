// ============================================
// APP LAYOUT - Main Layout Structure
// CRITICAL: Proper spacing, no overlapping
// ============================================

import { useState, useEffect, ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

interface AppLayoutProps {
    children: ReactNode;
    onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user } = useAuth();

    // Load sidebar collapse state from localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar_collapsed');
        if (savedState !== null) {
            setIsCollapsed(JSON.parse(savedState));
        }
    }, []);

    // Save sidebar collapse state to localStorage
    const handleToggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
    };

    return (
        <div className="flex min-h-screen w-screen bg-dark-bg overflow-hidden">
            {/* Sidebar - Desktop Only */}
            <Sidebar isCollapsed={isCollapsed} />

            {/* Main Container (Header + Content) */}
            <div className="flex flex-col flex-1 w-full">
                {/* Header - Fixed at top */}
                <Header
                    onToggleSidebar={handleToggleSidebar}
                    currentUser={user}
                    onLogout={onLogout}
                />

                {/* Main Content - Scrollable, with spacing for fixed header */}
                <main className="flex-1 overflow-auto mt-20">
                    <div className="max-w-7xl mx-auto px-6 py-6 pb-24 md:pb-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
