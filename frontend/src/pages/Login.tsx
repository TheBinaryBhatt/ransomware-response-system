// src/pages/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-teal-500/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -20, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 bg-dark-surface rounded-2xl shadow-2xl p-8 w-full max-w-md border border-dark-secondary"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="flex justify-center mb-4"
          >
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          <h1 className="text-2xl font-bold text-cream mb-2">
            Ransomware Response System
          </h1>
          <p className="text-gray-400 text-sm">
            AI-Powered Cybersecurity Operations
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-dark-secondary border border-gray-600 rounded-lg 
                       text-cream placeholder-gray-500 focus:outline-none focus:ring-2 
                       focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-dark-secondary border border-gray-600 rounded-lg 
                         text-cream placeholder-gray-500 focus:outline-none focus:ring-2 
                         focus:ring-teal-500 focus:border-transparent transition-all pr-10"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cream transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 
                     rounded-lg font-semibold flex items-center justify-center gap-2
                     hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authenticating...
              </div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-teal-500/10 rounded-lg border border-teal-500/20">
          <p className="text-sm text-teal-400 text-center">
            <strong>Demo Credentials:</strong> admin / admin123
          </p>
        </div>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
            Forgot your password?
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            © 2024 Ransomware Response System. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;