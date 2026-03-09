
import { ChatMessage, AppSettings, Campaign, StatMetric, User } from '../types';
import { INITIAL_LEADS, DEFAULT_SETTINGS, INITIAL_USERS } from '../constants';
import { Lead } from '../models/ui/Lead';

// --- DATABASE SIMULATION LAYER ---

// We import auth purely for the session/context, avoiding circular dependency for data
const getCurrentUserId = () => {
    try {
        const session = localStorage.getItem('dakdan_session_v1');
        if (session) {
            const user = JSON.parse(session);
            return user.id;
        }
    } catch (e) { }
    return null;
};

// Helper to get a unique key for the current user's data
const getUserSpacedKey = (baseKey: string) => {
    const userId = getCurrentUserId();
    const suffix = userId ? `_${userId}` : '_guest';
    return `${baseKey}${suffix}`;
};

const DB_KEYS = {
    LEADS: 'dakdan_leads',
    SETTINGS: 'dakdan_settings',
    CAMPAIGNS: 'dakdan_campaigns',
    CHATS: 'dakdan_chat',
    USERS: 'dakdan_users_v1' // Shared across the app, not namespaced per user
};

// Internal Type for Stored User (includes password)
interface UserRecord extends User {
    password?: string;
}

export const db = {
  // --- USERS DATABASE (Shared) ---
  users: {
      getAll: (): UserRecord[] => {
          try {
              const stored = localStorage.getItem(DB_KEYS.USERS);
              if (!stored) {
                  // Seed the database if empty
                  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(INITIAL_USERS));
                  return INITIAL_USERS as UserRecord[];
              }
              return JSON.parse(stored);
          } catch (e) {
              return [];
          }
      },
      
      save: (users: UserRecord[]) => {
          localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
      },

      add: (user: UserRecord) => {
          const users = db.users.getAll();
          users.push(user);
          db.users.save(users);
      },

      findByEmail: (email: string): UserRecord | undefined => {
          const users = db.users.getAll();
          return users.find(u => u.email.toLowerCase() === email.toLowerCase());
      },

      findByUsername: (username: string): UserRecord | undefined => {
        const users = db.users.getAll();
        return users.find(u => u.username.toLowerCase() === username.toLowerCase());
      }
  },

  // --- LEADS TABLE (User Scoped) ---
  
  getLeads: async (): Promise<Lead[]> => {
    try {
      const key = getUserSpacedKey(DB_KEYS.LEADS);
      const stored = localStorage.getItem(key);
      if (!stored) {
        // Initialize new user workspace with dummy data
        localStorage.setItem(key, JSON.stringify(INITIAL_LEADS));
        return INITIAL_LEADS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error("DB Error loading leads", e);
      return INITIAL_LEADS;
    }
  },

  saveLeads: async (leads: Lead[]): Promise<void> => {
    try {
      localStorage.setItem(getUserSpacedKey(DB_KEYS.LEADS), JSON.stringify(leads));
    } catch (e) {
      console.error("DB Error saving leads", e);
    }
  },

  addLead: async (lead: Lead): Promise<Lead[]> => {
    try {
      const currentLeads = await db.getLeads();
      const updatedLeads = [lead, ...currentLeads];
      localStorage.setItem(getUserSpacedKey(DB_KEYS.LEADS), JSON.stringify(updatedLeads));
      return updatedLeads;
    } catch (e) {
      console.error("DB Error adding lead", e);
      return [];
    }
  },

  // --- SETTINGS TABLE (User Scoped) ---

  getSettings: async (): Promise<AppSettings> => {
    try {
      const key = getUserSpacedKey(DB_KEYS.SETTINGS);
      const stored = localStorage.getItem(key);
      if (!stored) {
        localStorage.setItem(key, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (settings: AppSettings): Promise<void> => {
    localStorage.setItem(getUserSpacedKey(DB_KEYS.SETTINGS), JSON.stringify(settings));
  },

  // --- CAMPAIGNS TABLE (User Scoped) ---

  getCampaigns: async (): Promise<Campaign[]> => {
    try {
      const stored = localStorage.getItem(getUserSpacedKey(DB_KEYS.CAMPAIGNS));
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveCampaign: async (campaign: Campaign): Promise<Campaign[]> => {
    const campaigns = await db.getCampaigns();
    const existingIndex = campaigns.findIndex(c => c.id === campaign.id);
    let updatedCampaigns;
    if (existingIndex >= 0) {
      updatedCampaigns = [...campaigns];
      updatedCampaigns[existingIndex] = campaign;
    } else {
      updatedCampaigns = [campaign, ...campaigns];
    }
    localStorage.setItem(getUserSpacedKey(DB_KEYS.CAMPAIGNS), JSON.stringify(updatedCampaigns));
    return updatedCampaigns;
  },

  // --- CHATS TABLE (User Scoped) ---

  getChatHistory: async (agentId: string): Promise<ChatMessage[]> => {
    try {
      // Key format: dakdan_chat_agent-hq_user_123
      const key = `${DB_KEYS.CHATS}_${agentId}${getUserSpacedKey('').replace(DB_KEYS.CHATS, '')}`; 
      // ^ Hacky way to reuse the suffix helper
      const scopedKey = `${DB_KEYS.CHATS}_${agentId}_${getCurrentUserId() || 'guest'}`;

      const stored = localStorage.getItem(scopedKey);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (e) {
      return [];
    }
  },

  saveChatMessage: async (agentId: string, message: ChatMessage): Promise<void> => {
    try {
      const currentHistory = await db.getChatHistory(agentId);
      const updatedHistory = [...currentHistory, message];
      const scopedKey = `${DB_KEYS.CHATS}_${agentId}_${getCurrentUserId() || 'guest'}`;
      localStorage.setItem(scopedKey, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("DB Error saving chat", e);
    }
  },

  clearChat: async (agentId: string): Promise<void> => {
      const scopedKey = `${DB_KEYS.CHATS}_${agentId}_${getCurrentUserId() || 'guest'}`;
      localStorage.removeItem(scopedKey);
  },

  // --- DASHBOARD ANALYTICS (Aggregated View) ---

  getDashboardMetrics: async (): Promise<StatMetric[]> => {
    const leads = await db.getLeads();
    
    // 1. Qualified Prospects
    const qualified = leads.filter(l => l.score > 70 || l.status === 'Qualified' || l.status === 'Converted');
    
    // 2. Lead Volume Trend
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const leadsThisWeek = leads.filter(l => new Date(l.createdAt) > oneWeekAgo).length;
    const leadsLastWeek = leads.filter(l => new Date(l.createdAt) > twoWeeksAgo && new Date(l.createdAt) <= oneWeekAgo).length;
    
    const trend = leadsLastWeek === 0 ? 100 : Math.round(((leadsThisWeek - leadsLastWeek) / leadsLastWeek) * 100);

    return [
        { 
            label: 'Total Leads', 
            value: leads.length.toString(), 
            trend: Math.abs(trend), 
            trendDirection: trend >= 0 ? 'up' : 'down', 
            color: 'blue' 
        },
        { 
            label: 'Qualified Prospects', 
            value: qualified.length.toString(), 
            trend: 12, 
            trendDirection: 'up', 
            color: 'green' 
        },
        { 
            label: 'High Value (Score > 90)', 
            value: leads.filter(l => l.score > 90).length.toString(), 
            trend: 5, 
            trendDirection: 'up', 
            color: 'gold' 
        },
        { 
            label: 'Conversion Rate', 
            value: (leads.length ? Math.round((leads.filter(l => l.status === 'Converted').length / leads.length) * 100) + '%' : '0%'), 
            trend: 2.4, 
            trendDirection: 'up', 
            color: 'red' 
        },
    ];
  }
};
