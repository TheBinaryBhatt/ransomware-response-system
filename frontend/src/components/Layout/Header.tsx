// src/components/Layout/Header.tsx
import React from 'react';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="
        sticky top-0 z-20 
        bg-dark-surface/40 backdrop-blur-lg 
        border-b border-dark-secondary/40 
        shadow-[0_4px_20px_rgba(0,0,0,0.35)]
        px-6 py-4
      "
    >
      <div className="flex items-center justify-between">

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0.8 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex-1 max-w-lg"
        >
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-teal-400 transition-colors" />
            <motion.input
              whileFocus={{ scale: 1.015 }}
              transition={{ type: 'spring', stiffness: 250, damping: 18 }}
              type="text"
              placeholder="Search incidents, threats, or analytics..."
              className="
                w-full pl-10 pr-4 py-2 rounded-lg 
                bg-dark-secondary/60 border border-gray-600/40 
                text-cream placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent 
                transition-all
                shadow-inner
              "
            />
          </div>
        </motion.div>

        {/* Right Section */}
        <div className="flex items-center gap-6 ml-6">

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 rounded-lg hover:bg-dark-secondary/60 transition-all text-gray-400 hover:text-cream"
          >
            <Bell className="w-5 h-5" />
            {/* live alert indicator */}
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 animate-ping rounded-full opacity-80"></span>
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full shadow-md"></span>
          </motion.button>

          {/* User Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            {/* Name */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-cream">{user?.username || 'Analyst'}</div>
              <div className="text-xs text-gray-400">Security Analyst</div>
            </div>

            {/* Avatar with glowing ring */}
            <motion.div
              whileHover={{ scale: 1.15, rotate: 2 }}
              className="
                w-10 h-10 rounded-full flex items-center justify-center 
                bg-gradient-to-br from-teal-500 to-teal-600 
                relative shadow-lg
              "
            >
              <div
                className="
                  absolute inset-0 rounded-full 
                  border-2 border-teal-400/70 
                  animate-pulse pointer-events-none
                "
              ></div>

              <User className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>

          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 6 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-cream hover:bg-dark-secondary/60 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
