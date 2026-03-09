
import React, { useState } from 'react';
import { Agent, AgentRole, User } from '../types';
import { AGENTS } from '../constants';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  Settings, 
  Menu, 
  Bell, 
  Search,
  MessageSquare,
  BarChart3,
  Mail,
  Phone,
  LogOut,
  Building2
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeAgent: Agent;
  onSelectAgent: (agent: Agent) => void;
  onSettingsClick: () => void;
  onDashboardClick: () => void;
  currentView: 'dashboard' | 'workspace' | 'settings';
  currentUser: User;
  onLogout: () => void;
  compactMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeAgent, 
  onSelectAgent, 
  onSettingsClick, 
  onDashboardClick,
  currentView,
  currentUser, 
  onLogout,
  compactMode 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Helper to get icon for agent
  const getAgentIcon = (role: AgentRole) => {
    const size = compactMode ? 16 : 20;
    switch (role) {
      case AgentRole.HQ: return <Building2 size={size} />;
      case AgentRole.LEAD_GEN: return <Search size={size} />;
      case AgentRole.DATA_ANALYST: return <BarChart3 size={size} />;
      case AgentRole.OUTREACH: return <Mail size={size} />;
      case AgentRole.RECEPTIONIST: return <Phone size={size} />;
      default: return <Users size={size} />;
    }
  };

  const sidebarWidth = isSidebarOpen ? (compactMode ? 'w-56' : 'w-64') : (compactMode ? 'w-16' : 'w-20');
  const headerHeight = compactMode ? 'h-12' : 'h-16';
  const navItemClass = compactMode ? 'py-2 text-xs' : 'py-3 text-sm';
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={`${sidebarWidth} bg-dakdan-navy text-white transition-all duration-300 flex flex-col shadow-xl z-20`}
      >
        <div className={`${headerHeight} flex items-center justify-between px-4 border-b border-slate-700`}>
          {isSidebarOpen && (
             <div className="flex items-center gap-2">
                 <div className={`rounded bg-gradient-to-br from-dakdan-red to-dakdan-blue flex items-center justify-center font-bold text-white ${compactMode ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}`}>
                     DW
                 </div>
                 <span className={`font-bold tracking-tight ${compactMode ? 'text-base' : 'text-lg'}`}>DAKDAN AI</span>
             </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
            <Menu size={compactMode ? 16 : 20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          
          {/* Main Navigation */}
           <div className={`px-4 mb-2 font-semibold text-slate-400 uppercase tracking-wider ${compactMode ? 'text-[10px]' : 'text-xs'}`}>
            {isSidebarOpen ? 'Overview' : 'Main'}
          </div>
          <nav className="space-y-1 px-2 mb-6">
              <button
                onClick={onDashboardClick}
                className={`w-full flex items-center gap-3 px-3 rounded-lg transition-colors ${navItemClass} ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`${currentView === 'dashboard' ? 'text-white' : 'text-slate-400'}`}>
                   <LayoutDashboard size={compactMode ? 16 : 20} />
                </div>
                {isSidebarOpen && <span className="font-medium">Dashboard</span>}
              </button>
          </nav>

          <div className={`px-4 mb-2 font-semibold text-slate-400 uppercase tracking-wider ${compactMode ? 'text-[10px]' : 'text-xs'}`}>
            {isSidebarOpen ? 'Digital Employees' : 'Team'}
          </div>
          
          <nav className="space-y-1 px-2">
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className={`w-full flex items-center gap-3 px-3 rounded-lg transition-colors ${navItemClass} ${
                  currentView === 'workspace' && activeAgent.id === agent.id
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`${currentView === 'workspace' && activeAgent.id === agent.id ? 'text-white' : 'text-slate-400'}`}>
                   {getAgentIcon(agent.role)}
                </div>
                {isSidebarOpen && (
                  <div className="text-left overflow-hidden w-full">
                    <div className="font-medium truncate">{agent.name}</div>
                    <div className="opacity-70 truncate text-xs mb-1">{agent.title}</div>
                    {/* Capabilities Tags */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 truncate max-w-full block">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {isSidebarOpen && currentView === 'workspace' && activeAgent.id === agent.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                )}
              </button>
            ))}
          </nav>

          <div className={`mt-8 px-4 mb-2 font-semibold text-slate-400 uppercase tracking-wider ${compactMode ? 'text-[10px]' : 'text-xs'}`}>
            {isSidebarOpen ? 'Resources' : 'Misc'}
          </div>
           <nav className="space-y-1 px-2">
             <button className={`w-full flex items-center gap-3 px-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${navItemClass}`}>
                <Database size={compactMode ? 16 : 20} />
                {isSidebarOpen && <span>Prospect DB</span>}
             </button>
             <button 
                onClick={onSettingsClick}
                className={`w-full flex items-center gap-3 px-3 rounded-lg transition-colors ${navItemClass} ${
                   currentView === 'settings'
                   ? 'bg-blue-600 text-white shadow-md' 
                   : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
             >
                <div className={`${currentView === 'settings' ? 'text-white' : 'text-slate-400'}`}>
                    <Settings size={compactMode ? 16 : 20} />
                </div>
                {isSidebarOpen && <span>Settings</span>}
             </button>
           </nav>
        </div>

        {/* User Profile */}
        <div className={`p-4 border-t border-slate-700 bg-slate-900 ${compactMode ? 'p-2' : 'p-4'}`}>
           <div className={`flex items-center gap-3 ${compactMode ? 'mb-1' : 'mb-3'}`}>
               <img 
                 src={currentUser.avatar || "https://picsum.photos/id/64/100/100"} 
                 className={`${compactMode ? 'w-7 h-7' : 'w-9 h-9'} rounded-full border border-slate-500`}
                 alt="User" 
               />
               {isSidebarOpen && (
                   <div className="overflow-hidden">
                       <p className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium text-white truncate`}>{currentUser.name}</p>
                       <p className={`text-[10px] text-dakdan-gold truncate`}>{currentUser.role || 'Member'}</p>
                   </div>
               )}
           </div>
           {isSidebarOpen && (
               <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
               >
                   <LogOut size={14} /> Sign Out
               </button>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className={`${headerHeight} bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 transition-all`}>
            <h1 className={`${compactMode ? 'text-base' : 'text-xl'} font-bold text-dakdan-navy flex items-center gap-2`}>
                {currentView === 'dashboard' ? (
                    <>
                        <span className={`w-2 ${compactMode ? 'h-6' : 'h-8'} rounded-sm bg-dakdan-navy`}></span>
                        Executive Dashboard
                    </>
                ) : currentView === 'settings' ? (
                    <>
                        <span className={`w-2 ${compactMode ? 'h-6' : 'h-8'} rounded-sm bg-slate-400`}></span>
                        Configuration
                    </>
                ) : (
                    <>
                        <span className={`w-2 ${compactMode ? 'h-6' : 'h-8'} rounded-sm ${activeAgent.color}`}></span>
                        {activeAgent.role === AgentRole.HQ ? "HQ Manager's Office (Chat)" : `${activeAgent.name}'s Workspace`}
                    </>
                )}
            </h1>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <span className="absolute top-0 right-0 w-2 h-2 bg-dakdan-red rounded-full"></span>
                    <Bell className="text-slate-500 cursor-pointer hover:text-dakdan-navy" size={compactMode ? 18 : 20} />
                </div>
                <div className={`px-3 py-1 bg-green-50 text-green-700 font-medium rounded-full border border-green-200 ${compactMode ? 'text-xs' : 'text-sm'}`}>
                    System Operational
                </div>
            </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
