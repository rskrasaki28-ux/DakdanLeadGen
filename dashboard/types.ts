
export enum AgentRole {
  HQ = 'HQ',
  LEAD_GEN = 'Stan',
  DATA_ANALYST = 'Eva',
  RECEPTIONIST = 'Racheal',
  OUTREACH = 'Sonny',
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: 'Admin' | 'User';
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  description: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  capabilities: string[];
}

// export interface Lead {
//   id: string;
//   companyName: string;
//   industry: 'Zoo/Aquarium' | 'Sports' | 'Logistics' | 'Other';
//   contactPerson: string;
//   email: string;
//   status: 'New' | 'Contacted' | 'Qualified' | 'Converted';
//   score: number;
//   source: string;
//   createdAt: string; // ISO Date string for metrics
//   lastContactedAt?: string;
// }

export interface TaskLog {
    id: string;
    tool: string;
    summary: string;
    details: string;
    timestamp: Date;
    status: 'success' | 'failure';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  attachment?: {
      type: 'image' | 'video';
      url: string; // Data URL for display
  };
  groundingMetadata?: {
      chunks: Array<{
          web?: { uri: string; title: string };
      }>;
  };
  executedTasks?: TaskLog[];
}

export interface StatMetric {
  label: string;
  value: string | number;
  trend: number; // percentage
  trendDirection: 'up' | 'down';
  color: 'blue' | 'green' | 'red' | 'gold';
}

// --- Database Schemas ---

export interface AppSettings {
  general: {
    theme: 'Light' | 'Dark' | 'System';
    compactMode: boolean;
    language: string;
    timezone: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    leadAlerts: boolean;
    weeklyReports: boolean;
  };
  ai: {
    autoScoring: boolean;
    aiSuggestions: boolean;
    autoFollowUp: boolean;
    provider: string;
  };
  integrations: {
    crm: Record<string, boolean>; // e.g. { salesforce: true }
    communication: Record<string, boolean>;
  };
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Draft' | 'Active' | 'Completed';
  targetAudience: string;
  content: string;
  createdAt: string;
}
