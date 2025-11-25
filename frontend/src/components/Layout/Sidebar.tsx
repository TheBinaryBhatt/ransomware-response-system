// src/components/Layout/Sidebar.tsx
import React, { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  AlertTriangle,
  Radar,
  Workflow,
  ScrollText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, description: 'Threat Overview' },
    { label: 'Incidents', to: '/incidents', icon: AlertTriangle, description: 'Case Management' },
    { label: 'Threat Intel', to: '/threat-intel', icon: Radar, description: 'Intelligence Hub' },
    { label: 'Workflows', to: '/workflows', icon: Workflow, description: 'Automation Status' },
    { label: 'Audit Logs', to: '/audit-logs', icon: ScrollText, description: 'Compliance Records' },
    { label: 'Settings', to: '/settings', icon: Settings, description: 'Platform Config' },
  ];

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 80 : 280,
      }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 18,
      }}
      className="
        relative h-full bg-dark-surface/60 backdrop-blur-md 
        border-r border-dark-secondary 
        shadow-[4px_0_24px_rgba(0,0,0,0.35)] 
        flex flex-col
      "
    >

      {/* Logo */}
      <div className="p-6 border-b border-dark-secondary/60 flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg"
        >
          <Shield className="w-6 h-6 text-white" />
        </motion.div>

        <AnimatePresence mode="popLayout">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="overflow-hidden"
            >
              <div className="text-xl font-bold text-cream tracking-wide">RRS</div>
              <div className="text-xs text-gray-400">Security Platform</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="block"
            >
              <motion.div
                whileHover={{
                  scale: 1.03,
                  x: 4,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`
                  relative flex items-center gap-3 p-3 rounded-lg group cursor-pointer
                  transition-all duration-200
                  ${isActive
                    ? 'bg-teal-500/20 text-teal-400 shadow-md border border-teal-500/30'
                    : 'text-gray-400 hover:text-cream hover:bg-dark-secondary/50'
                  }
                `}
              >
                {/* Neon vertical indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-teal-400 rounded-r-md"
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  />
                )}

                <item.icon className="w-5 h-5 flex-shrink-0" />

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="flex-1 overflow-hidden"
                    >
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-dark-secondary/60">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-dark-secondary/40"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() ?? 'A'}
            </span>
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="flex-1 overflow-hidden"
              >
                <div className="text-sm font-medium text-cream truncate">
                  {user?.username ?? 'SOC Analyst'}
                </div>
                <div className="text-xs text-gray-400">Security Analyst</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Collapse/Expand Button */}
      <button
        onClick={handleToggle}
        className="
          absolute -right-3 top-6 p-1.5 rounded-full border border-dark-secondary 
          bg-dark-surface/80 hover:bg-teal-500/50 
          transition-all shadow-lg z-10
        "
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4 text-cream" /> : <ChevronLeft className="w-4 h-4 text-cream" />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
