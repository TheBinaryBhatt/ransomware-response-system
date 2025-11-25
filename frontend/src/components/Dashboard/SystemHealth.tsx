import React from 'react';

const SystemHealth: React.FC = () => {
  const systems = [
    { name: 'AI Inference', status: 'operational', latency: '45ms', icon: '🤖' },
    { name: 'Threat Intel', status: 'operational', latency: '120ms', icon: '🛰️' },
    { name: 'Containment', status: 'degraded', latency: '280ms', icon: '🚫' },
    { name: 'Audit Trail', status: 'operational', latency: '80ms', icon: '📝' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-cyber-success';
      case 'degraded': return 'text-cyber-warning';
      case 'offline': return 'text-cyber-danger';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return '●';
      case 'degraded': return '⚠';
      case 'offline': return '⏻';
      default: return '?';
    }
  };

  return (
    <div className="glass-morphism rounded-xl p-6 animate-fade-in-cyber">
      <h2 className="text-xl font-bold text-gradient mb-6">System Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systems.map((system, index) => (
          <div
            key={system.name}
            className="flex items-center space-x-4 p-4 rounded-lg bg-cyber-darker/50 border border-cyber-primary/10 hover:border-cyber-primary/30 transition-all duration-300 animate-slide-in-left-cyber"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="text-2xl">{system.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-white">{system.name}</div>
              <div className="text-sm text-gray-400">Latency: {system.latency}</div>
            </div>
            <div className={`text-lg ${getStatusColor(system.status)}`}>
              {getStatusIcon(system.status)}
            </div>
          </div>
        ))}
      </div>
      
      {/* Health Status Bar */}
      <div className="mt-6 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-success rounded-full animate-glow"></div>
            <span>Operational</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-warning rounded-full"></div>
            <span>Degraded</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyber-danger rounded-full"></div>
            <span>Offline</span>
          </div>
        </div>
        <div className="text-cyber-primary">
          Last checked: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;