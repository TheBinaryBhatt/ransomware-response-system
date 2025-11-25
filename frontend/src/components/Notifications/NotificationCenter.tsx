import React from 'react';

const NotificationCenter: React.FC = () => {
  // This would connect to your WebSocket for real-time alerts
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Example notification */}
      <div className="glass-morphism rounded-lg p-4 border-l-4 border-cyber-danger animate-slide-in-right-cyber">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-cyber-danger rounded-full animate-glow-pulse-critical"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Critical Threat Detected</p>
            <p className="text-xs text-gray-400">Ransomware behavior identified</p>
          </div>
          <button className="text-gray-400 hover:text-white">×</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;