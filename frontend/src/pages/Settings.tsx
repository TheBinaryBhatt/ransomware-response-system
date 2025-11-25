// src/pages/Settings.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  RefreshCw, 
  TestTube, 
  ToggleLeft, 
  ToggleRight,
  Brain,
  Shield,
  Users,
  Bell,
  Settings as SettingsIcon,
  Key,
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface IntegrationConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  status: 'connected' | 'disconnected' | 'error';
  lastTested?: string;
}

interface AIConfig {
  modelPath: string;
  confidenceThreshold: number;
  enableFallback: boolean;
  updateFrequency: number;
  autonomousResponse: boolean;
}

interface SettingsState {
  integrations: Record<string, IntegrationConfig>;
  aiConfig: AIConfig;
  responseAutomation: {
    enableAutoResponse: boolean;
    quarantineEnabled: boolean;
    blockIPEnabled: boolean;
    notifyAnalyst: boolean;
    escalationThreshold: number;
  };
  notifications: {
    emailAlerts: boolean;
    slackAlerts: boolean;
    criticalOnly: boolean;
    dailyDigest: boolean;
  };
}

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState<SettingsState>({
    integrations: {
      wazuh: {
        name: 'Wazuh EDR',
        enabled: true,
        apiKey: '••••••••••••••••',
        baseUrl: 'https://wazuh.local:55000',
        status: 'connected',
        lastTested: new Date().toISOString()
      },
      pfsense: {
        name: 'pfSense Firewall',
        enabled: true,
        apiKey: '••••••••••••••••',
        baseUrl: 'https://pfsense.local',
        status: 'connected',
        lastTested: new Date().toISOString()
      },
      abuseipdb: {
        name: 'AbuseIPDB',
        enabled: true,
        apiKey: '••••••••••••••••',
        baseUrl: 'https://api.abuseipdb.com',
        status: 'connected',
        lastTested: new Date().toISOString()
      },
      virustotal: {
        name: 'VirusTotal',
        enabled: false,
        apiKey: '',
        baseUrl: 'https://www.virustotal.com',
        status: 'disconnected'
      },
      malwarebazaar: {
        name: 'MalwareBazaar',
        enabled: true,
        apiKey: '••••••••••••••••',
        baseUrl: 'https://mb-api.abuse.ch',
        status: 'connected',
        lastTested: new Date().toISOString()
      }
    },
    aiConfig: {
      modelPath: '/models/hermes-2-pro-mistral-7b.Q8_0.gguf',
      confidenceThreshold: 85,
      enableFallback: true,
      updateFrequency: 10,
      autonomousResponse: false
    },
    responseAutomation: {
      enableAutoResponse: true,
      quarantineEnabled: true,
      blockIPEnabled: true,
      notifyAnalyst: true,
      escalationThreshold: 90
    },
    notifications: {
      emailAlerts: true,
      slackAlerts: false,
      criticalOnly: true,
      dailyDigest: true
    }
  });

  const [hasChanges, setHasChanges] = useState(false);

  const settingsSections = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'integrations', label: 'Integrations', icon: Network },
    { id: 'ai-config', label: 'AI Configuration', icon: Brain },
    { id: 'response', label: 'Response Automation', icon: Shield },
    { id: 'users', label: 'Users & Permissions', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Key }
  ];

  const testIntegration = async (integrationKey: string) => {
    const integration = settings.integrations[integrationKey];
    
    // Simulate API test
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [integrationKey]: {
          ...integration,
          status: 'connected',
          lastTested: new Date().toISOString()
        }
      }
    }));

    // In real implementation, this would call your backend
    console.log(`Testing ${integration.name}...`);
  };

  const toggleIntegration = (integrationKey: string) => {
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [integrationKey]: {
          ...prev.integrations[integrationKey],
          enabled: !prev.integrations[integrationKey].enabled
        }
      }
    }));
    setHasChanges(true);
  };

  const updateAIConfig = (updates: Partial<AIConfig>) => {
    setSettings(prev => ({
      ...prev,
      aiConfig: { ...prev.aiConfig, ...updates }
    }));
    setHasChanges(true);
  };

  const updateResponseAutomation = (updates: Partial<SettingsState['responseAutomation']>) => {
    setSettings(prev => ({
      ...prev,
      responseAutomation: { ...prev.responseAutomation, ...updates }
    }));
    setHasChanges(true);
  };

  const updateNotifications = (updates: Partial<SettingsState['notifications']>) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates }
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    // Simulate API call to save settings
    console.log('Saving settings:', settings);
    setHasChanges(false);
    
    // In real implementation, this would call your backend
    // await api.saveSettings(settings);
  };

  const resetSettings = () => {
    // Reload initial settings
    window.location.reload(); // In real app, you might want to reload from API
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-cream">Platform Settings</h1>
          <p className="text-gray-400">Configure your ransomware response platform</p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm"
            >
              Unsaved Changes
            </motion.span>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetSettings}
            className="flex items-center gap-2 px-4 py-2 bg-dark-secondary hover:bg-gray-700 
                     text-cream rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveSettings}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                      ${hasChanges 
                        ? 'bg-teal-500 hover:bg-teal-600 text-white' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </motion.button>
        </div>
      </motion.div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex-shrink-0 bg-dark-surface rounded-xl border border-dark-secondary p-4"
        >
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left
                          ${activeSection === section.id
                            ? 'bg-teal-500/20 text-teal-400 border-r-2 border-teal-500'
                            : 'text-gray-400 hover:text-cream hover:bg-dark-secondary'}`}
              >
                <section.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Main Content */}
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 bg-dark-surface rounded-xl border border-dark-secondary p-6 overflow-auto"
        >
          <AnimatePresence mode="wait">
            {/* General Settings */}
            {activeSection === 'general' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-cream mb-6">General Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Ransomware Response System"
                        className="w-full px-4 py-2 bg-dark-secondary border border-gray-600 
                                 rounded-lg text-cream focus:outline-none focus:ring-2 
                                 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-4 py-2 bg-dark-secondary border border-gray-600 
                                      rounded-lg text-cream focus:outline-none focus:ring-2 
                                      focus:ring-teal-500 focus:border-transparent">
                        <option>UTC</option>
                        <option>EST</option>
                        <option>PST</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Data Retention (Days)
                      </label>
                      <input
                        type="number"
                        defaultValue="90"
                        className="w-full px-4 py-2 bg-dark-secondary border border-gray-600 
                                 rounded-lg text-cream focus:outline-none focus:ring-2 
                                 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Language
                      </label>
                      <select className="w-full px-4 py-2 bg-dark-secondary border border-gray-600 
                                      rounded-lg text-cream focus:outline-none focus:ring-2 
                                      focus:ring-teal-500 focus:border-transparent">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Integrations Settings */}
            {activeSection === 'integrations' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-cream mb-6">Integration Settings</h2>
                
                <div className="space-y-4">
                  {Object.entries(settings.integrations).map(([key, integration]) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-dark-secondary rounded-xl p-4 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleIntegration(key)}
                            className="relative focus:outline-none"
                          >
                            {integration.enabled ? (
                              <ToggleRight className="w-10 h-6 text-teal-500" />
                            ) : (
                              <ToggleLeft className="w-10 h-6 text-gray-500" />
                            )}
                          </button>
                          
                          <div>
                            <h3 className="font-semibold text-cream">{integration.name}</h3>
                            <div className="flex items-center gap-2 text-sm">
                              {getStatusIcon(integration.status)}
                              <span className={`text-xs capitalize ${
                                integration.status === 'connected' ? 'text-green-400' :
                                integration.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                {integration.status}
                              </span>
                              {integration.lastTested && (
                                <span className="text-gray-500 text-xs">
                                  Last tested: {new Date(integration.lastTested).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => testIntegration(key)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 
                                     text-white rounded-lg text-sm transition-colors"
                          >
                            <TestTube className="w-4 h-4" />
                            Test
                          </motion.button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={integration.apiKey}
                            onChange={(e) => {
                              setSettings(prev => ({
                                ...prev,
                                integrations: {
                                  ...prev.integrations,
                                  [key]: { ...integration, apiKey: e.target.value }
                                }
                              }));
                              setHasChanges(true);
                            }}
                            className="w-full px-3 py-2 bg-dark-primary border border-gray-600 
                                     rounded text-cream focus:outline-none focus:ring-1 
                                     focus:ring-teal-500 focus:border-transparent text-sm"
                            placeholder="Enter API key"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Base URL
                          </label>
                          <input
                            type="text"
                            value={integration.baseUrl}
                            onChange={(e) => {
                              setSettings(prev => ({
                                ...prev,
                                integrations: {
                                  ...prev.integrations,
                                  [key]: { ...integration, baseUrl: e.target.value }
                                }
                              }));
                              setHasChanges(true);
                            }}
                            className="w-full px-3 py-2 bg-dark-primary border border-gray-600 
                                     rounded text-cream focus:outline-none focus:ring-1 
                                     focus:ring-teal-500 focus:border-transparent text-sm"
                            placeholder="Enter base URL"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AI Configuration */}
            {activeSection === 'ai-config' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-cream mb-6">AI Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model Path
                      </label>
                      <input
                        type="text"
                        value={settings.aiConfig.modelPath}
                        onChange={(e) => updateAIConfig({ modelPath: e.target.value })}
                        className="w-full px-4 py-2 bg-dark-secondary border border-gray-600 
                                 rounded-lg text-cream focus:outline-none focus:ring-2 
                                 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confidence Threshold: {settings.aiConfig.confidenceThreshold}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={settings.aiConfig.confidenceThreshold}
                        onChange={(e) => updateAIConfig({ confidenceThreshold: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>50%</span>
                        <span>75%</span>
                        <span>99%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-cream">Enable Fallback Logic</div>
                        <div className="text-sm text-gray-400">Use rule-based fallback when AI is unavailable</div>
                      </div>
                      <button
                        onClick={() => updateAIConfig({ enableFallback: !settings.aiConfig.enableFallback })}
                        className="relative focus:outline-none"
                      >
                        {settings.aiConfig.enableFallback ? (
                          <ToggleRight className="w-10 h-6 text-teal-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-cream">Autonomous Response</div>
                        <div className="text-sm text-gray-400">Allow AI to trigger responses without human approval</div>
                      </div>
                      <button
                        onClick={() => updateAIConfig({ autonomousResponse: !settings.aiConfig.autonomousResponse })}
                        className="relative focus:outline-none"
                      >
                        {settings.aiConfig.autonomousResponse ? (
                          <ToggleRight className="w-10 h-6 text-teal-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model Update Frequency (days)
                      </label>
                      <input
                        type="number"
                        value={settings.aiConfig.updateFrequency}
                        onChange={(e) => updateAIConfig({ updateFrequency: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-dark-secondary border border-gray-600 
                                 rounded-lg text-cream focus:outline-none focus:ring-2 
                                 focus:ring-teal-500 focus:border-transparent"
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Response Automation */}
            {activeSection === 'response' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-cream mb-6">Response Automation</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                    <div>
                      <div className="font-medium text-cream">Enable Auto-Response</div>
                      <div className="text-sm text-gray-400">Allow system to automatically respond to threats</div>
                    </div>
                    <button
                      onClick={() => updateResponseAutomation({ 
                        enableAutoResponse: !settings.responseAutomation.enableAutoResponse 
                      })}
                      className="relative focus:outline-none"
                    >
                      {settings.responseAutomation.enableAutoResponse ? (
                        <ToggleRight className="w-10 h-6 text-teal-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-6 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-cream">Host Quarantine</div>
                        <div className="text-sm text-gray-400">Automatically isolate compromised hosts</div>
                      </div>
                      <button
                        onClick={() => updateResponseAutomation({ 
                          quarantineEnabled: !settings.responseAutomation.quarantineEnabled 
                        })}
                        className="relative focus:outline-none"
                      >
                        {settings.responseAutomation.quarantineEnabled ? (
                          <ToggleRight className="w-10 h-6 text-teal-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-cream">IP Blocking</div>
                        <div className="text-sm text-gray-400">Automatically block malicious IPs</div>
                      </div>
                      <button
                        onClick={() => updateResponseAutomation({ 
                          blockIPEnabled: !settings.responseAutomation.blockIPEnabled 
                        })}
                        className="relative focus:outline-none"
                      >
                        {settings.responseAutomation.blockIPEnabled ? (
                          <ToggleRight className="w-10 h-6 text-teal-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-cream">Analyst Notification</div>
                        <div className="text-sm text-gray-400">Notify analysts of automated actions</div>
                      </div>
                      <button
                        onClick={() => updateResponseAutomation({ 
                          notifyAnalyst: !settings.responseAutomation.notifyAnalyst 
                        })}
                        className="relative focus:outline-none"
                      >
                        {settings.responseAutomation.notifyAnalyst ? (
                          <ToggleRight className="w-10 h-6 text-teal-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>

                    <div className="p-4 bg-dark-secondary rounded-lg">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Escalation Threshold: {settings.responseAutomation.escalationThreshold}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={settings.responseAutomation.escalationThreshold}
                        onChange={(e) => updateResponseAutomation({ 
                          escalationThreshold: parseInt(e.target.value) 
                        })}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Confidence level required for human escalation
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notifications */}
            {activeSection === 'notifications' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-cream mb-6">Notification Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                    <div>
                      <div className="font-medium text-cream">Email Alerts</div>
                      <div className="text-sm text-gray-400">Send incident notifications via email</div>
                    </div>
                    <button
                      onClick={() => updateNotifications({ 
                        emailAlerts: !settings.notifications.emailAlerts 
                      })}
                      className="relative focus:outline-none"
                    >
                      {settings.notifications.emailAlerts ? (
                        <ToggleRight className="w-10 h-6 text-teal-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-6 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                    <div>
                      <div className="font-medium text-cream">Slack Alerts</div>
                      <div className="text-sm text-gray-400">Send incident notifications to Slack</div>
                    </div>
                    <button
                      onClick={() => updateNotifications({ 
                        slackAlerts: !settings.notifications.slackAlerts 
                      })}
                      className="relative focus:outline-none"
                    >
                      {settings.notifications.slackAlerts ? (
                        <ToggleRight className="w-10 h-6 text-teal-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-6 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                    <div>
                      <div className="font-medium text-cream">Critical Incidents Only</div>
                      <div className="text-sm text-gray-400">Only notify for high/critical severity incidents</div>
                    </div>
                    <button
                      onClick={() => updateNotifications({ 
                        criticalOnly: !settings.notifications.criticalOnly 
                      })}
                      className="relative focus:outline-none"
                    >
                      {settings.notifications.criticalOnly ? (
                        <ToggleRight className="w-10 h-6 text-teal-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-6 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
                    <div>
                      <div className="font-medium text-cream">Daily Digest</div>
                      <div className="text-sm text-gray-400">Send daily summary of all incidents</div>
                    </div>
                    <button
                      onClick={() => updateNotifications({ 
                        dailyDigest: !settings.notifications.dailyDigest 
                      })}
                      className="relative focus:outline-none"
                    >
                      {settings.notifications.dailyDigest ? (
                        <ToggleRight className="w-10 h-6 text-teal-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-6 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Placeholder for other sections */}
            {['users', 'security'].includes(activeSection) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="text-gray-400 text-lg">
                  {activeSection === 'users' ? 'User Management' : 'Security Settings'} 
                  <br />
                  <span className="text-sm">Configuration coming soon</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;