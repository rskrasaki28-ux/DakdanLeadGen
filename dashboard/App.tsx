
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AgentWorkspace from './components/AgentWorkspace';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import { AGENTS, DEFAULT_SETTINGS } from './constants';
import { Agent, AgentRole, User, AppSettings } from './types';
import { db } from './services/dbService';
import { Lead } from './models/ui/Lead';
import { leadService } from './services/leadService';
import { auth } from './services/authService';

const App: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0]); // Default to HQ Agent
  const [view, setView] = useState<'dashboard' | 'workspace' | 'settings'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initial Load (Auth + Data)
  useEffect(() => {
    const initApp = async () => {
      const user = auth.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // Only load data if user is authenticated
        const [storedLeads, storedSettings] = await Promise.all([
          leadService.fetchLeads(),
          db.getSettings()
        ]);
        setLeads(storedLeads);
        setSettings(storedSettings);
      }
      setLoading(false);
    };
    initApp();
  }, []);

  // Reload data when user changes (e.g. login)
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        setLoading(true);
        const [storedLeads, storedSettings] = await Promise.all([
          leadService.fetchLeads(),
          db.getSettings()
        ]);
        setLeads(storedLeads);
        setSettings(storedSettings);
        setLoading(false);
      }
    };
    loadUserData();
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentUser(null);
    setLeads([]); // Clear memory
    setSettings(DEFAULT_SETTINGS);
  };

  const handleAgentSelect = (agent: Agent) => {
    setActiveAgent(agent);
    setView('workspace');
  };

  const handleUpdateLeads = async (newLeads: Lead[]) => {
    setLeads(newLeads);
    // Persist to service (handles API + cache)
    await leadService.saveLeads(newLeads);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await db.saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <div className="animate-pulse">Loading Dakdan AI Engine...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, show Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      activeAgent={activeAgent}
      onSelectAgent={handleAgentSelect}
      onSettingsClick={() => setView('settings')}
      onDashboardClick={() => setView('dashboard')}
      currentView={view}
      currentUser={currentUser}
      onLogout={handleLogout}
      compactMode={settings.general.compactMode}
    >
      {view === 'settings' ? (
        <SettingsPage
          initialSettings={settings}
          onSave={handleSaveSettings}
        />
      ) : view === 'dashboard' ? (
        <Dashboard />
      ) : (
        <AgentWorkspace
          agent={activeAgent}
          globalLeads={leads}
          setGlobalLeads={handleUpdateLeads} // Use the wrapper that saves to DB
          compactMode={settings.general.compactMode}
        />
      )}
    </Layout>
  );
};

export default App;
