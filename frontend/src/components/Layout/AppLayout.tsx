// ============================================
// APP LAYOUT - Main Layout Structure
// CRITICAL: Proper spacing, no overlapping
// ============================================

import { useState, useEffect, ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AnimatedBackground from '../Common/AnimatedBackground';

interface AppLayoutProps {
    children: ReactNode;
    onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';

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

    // Theme-aware background
    const bgStyle = isLight
        ? { background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #cbd5e1 100%)' }
        : { background: 'radial-gradient(ellipse at center, #0a1628 0%, #020817 100%)' };

    return (
        <div className="flex min-h-screen w-screen overflow-hidden relative" style={bgStyle}>
            {/* Animated Network Background - Less visible in light mode */}
            <AnimatedBackground
                opacity={isLight ? 0.08 : 0.3}
                lineCount={6}
                nodeCount={10}
                starCount={isLight ? 0 : 50}
            />

            {/* Sidebar - Desktop Only */}
            <Sidebar isCollapsed={isCollapsed} />

            {/* Main Container (Header + Content) */}
            <div className="flex flex-col flex-1 w-full h-screen overflow-hidden relative z-10">
                {/* Header - Sticky at top of this container */}
                <div className="flex-shrink-0">
                    <Header
                        onToggleSidebar={handleToggleSidebar}
                        currentUser={user}
                        onLogout={onLogout}
                    />
                </div>

                {/* Main Content - Scrollable, below the header */}
                <main className="flex-1 overflow-auto">
                    <div className="max-w-7xl mx-auto px-6 py-6 pb-24 md:pb-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;

