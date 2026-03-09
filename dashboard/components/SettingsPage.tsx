
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { 
  Palette, 
  Globe, 
  Monitor, 
  Bell, 
  Mail, 
  Smartphone, 
  Calendar, 
  Bot, 
  Zap, 
  MessageSquare, 
  Cpu, 
  Link, 
  Database,
  CheckCircle2,
  Save,
  Loader2
} from 'lucide-react';

interface SettingsPageProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ initialSettings, onSave }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'ai' | 'integrations'>('general');
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  // We intentionally do not use useEffect to sync initialSettings because we want
  // the user's edits to persist until they click Save or leave.
  
  const handleSave = async () => {
    setSaving(true);
    await onSave(settings);
    setTimeout(() => setSaving(false), 500);
  };

  const updateGeneral = (key: keyof AppSettings['general'], value: any) => {
    setSettings(prev => ({ ...prev, general: { ...prev.general, [key]: value } }));
  };

  const updateNotif = (key: keyof AppSettings['notifications'], value: boolean) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  };

  const updateAi = (key: keyof AppSettings['ai'], value: any) => {
    setSettings(prev => ({ ...prev, ai: { ...prev.ai, [key]: value } }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Monitor size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'ai', label: 'AI & Automation', icon: <Bot size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <Link size={18} /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Palette size={20} className="text-slate-400" /> Appearance
                </h3>
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Color Theme</label>
                    <div className="flex gap-4">
                      {['Light', 'Dark', 'System'].map((theme) => (
                        <button 
                            key={theme} 
                            onClick={() => updateGeneral('theme', theme)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium ${settings.general.theme === theme ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-t border-slate-100">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Compact Mode</div>
                      <div className="text-xs text-slate-500">Use smaller UI elements for more content density</div>
                    </div>
                    <button 
                      onClick={() => updateGeneral('compactMode', !settings.general.compactMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.general.compactMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.general.compactMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Globe size={20} className="text-slate-400" /> Region & Time
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                    <select 
                        value={settings.general.language}
                        onChange={(e) => updateGeneral('language', e.target.value)}
                        className="w-full rounded-lg border-slate-300 border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                    <select 
                        value={settings.general.timezone}
                        onChange={(e) => updateGeneral('timezone', e.target.value)}
                        className="w-full rounded-lg border-slate-300 border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option>(GMT-05:00) Eastern Time (US & Canada)</option>
                      <option>(GMT-06:00) Central Time (US & Canada)</option>
                      <option>(GMT-08:00) Pacific Time (US & Canada)</option>
                      <option>(GMT+00:00) UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Notification Preferences</h3>
              
              <div className="space-y-4">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive notifications via email', icon: <Mail size={18} /> },
                  { id: 'push', label: 'Push Notifications', desc: 'Receive push notifications in browser', icon: <Smartphone size={18} /> },
                  { id: 'leadAlerts', label: 'Lead Alerts', desc: 'Get notified when new leads are generated', icon: <Zap size={18} /> },
                  { id: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly summary of lead generation activity', icon: <Calendar size={18} /> },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-slate-400">{item.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateNotif(item.id as any, !settings.notifications[item.id as keyof AppSettings['notifications']])}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.notifications[item.id as keyof AppSettings['notifications']] ? 'bg-green-500' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications[item.id as keyof AppSettings['notifications']] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI & Automation */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                   <Cpu size={20} className="text-purple-500" /> Automation Rules
                </h3>
                
                <div className="space-y-4">
                  {[
                    { id: 'autoScoring', label: 'Auto Lead Scoring', desc: 'Automatically score leads based on AI analysis' },
                    { id: 'aiSuggestions', label: 'AI Suggestions', desc: 'Get AI-powered suggestions for lead engagement' },
                    { id: 'autoFollowUp', label: 'Auto Follow-Up', desc: 'Automatically send follow-up messages to leads (Requires approval)' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <button 
                        onClick={() => updateAi(item.id as any, !settings.ai[item.id as keyof AppSettings['ai']])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.ai[item.id as keyof AppSettings['ai']] ? 'bg-purple-600' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.ai[item.id as keyof AppSettings['ai']] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">AI Model Configuration</h3>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">AI Provider</label>
                   <select 
                       value={settings.ai.provider}
                       onChange={(e) => updateAi('provider', e.target.value)}
                       className="w-full rounded-lg border-slate-300 border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
                    >
                      <option>Google Gemini (Recommended)</option>
                      <option>OpenAI GPT-4</option>
                      <option>Anthropic Claude</option>
                   </select>
                   <p className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-500" /> Gemini 3 Flash & Pro models active for maximum performance.
                   </p>
                </div>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-slate-400" /> CRM Integrations
                 </h3>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">SF</div>
                          <div>
                             <div className="font-medium text-slate-900">Salesforce</div>
                             <div className="text-xs text-slate-500">Sync leads and contacts</div>
                          </div>
                       </div>
                       <button className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Connect</button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">HS</div>
                          <div>
                             <div className="font-medium text-slate-900">HubSpot</div>
                             <div className="text-xs text-slate-500">Marketing automation sync</div>
                          </div>
                       </div>
                       <button className="px-3 py-1.5 text-xs font-medium border-green-200 bg-green-50 text-green-700 border rounded flex items-center gap-1">
                          <CheckCircle2 size={12} /> Connected
                       </button>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-slate-400" /> Communication Channels
                 </h3>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">GM</div>
                          <div>
                             <div className="font-medium text-slate-900">Gmail</div>
                             <div className="text-xs text-slate-500">For outreach automation</div>
                          </div>
                       </div>
                       <button className="px-3 py-1.5 text-xs font-medium border-green-200 bg-green-50 text-green-700 border rounded flex items-center gap-1">
                          <CheckCircle2 size={12} /> Connected
                       </button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                          <div>
                             <div className="font-medium text-slate-900">Slack</div>
                             <div className="text-xs text-slate-500">Team notifications</div>
                          </div>
                       </div>
                       <button className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Connect</button>
                    </div>
                 </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
