
import { User } from '../types';
import { db } from './dbService';

const SESSION_KEY = 'dakdan_session_v1';
const TEMP_2FA_KEY = 'dakdan_temp_2fa';

export const auth = {
  // Register a new user
  register: async (name: string, username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (db.users.findByEmail(email)) {
      return { success: false, message: 'Email already exists.' };
    }
    if (db.users.findByUsername(username)) {
      return { success: false, message: 'Username is already taken.' };
    }

    const newUser = {
      id: 'user_' + Date.now(),
      name,
      username,
      email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
      role: 'User' as const,
      password // In production, hash this!
    };

    db.users.add(newUser);
    
    // Auto login
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return { success: true };
  },

  // Step 1: Check Credentials
  loginStep1: async (identifier: string, password: string): Promise<{ success: boolean; requires2FA?: boolean; tempToken?: string; demoCode?: string; message?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    const userByEmail = db.users.findByEmail(identifier);
    const userByUsername = db.users.findByUsername(identifier);
    const user = userByEmail || userByUsername;

    if (user && user.password === password) {
      // Generate a mock 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const tempToken = `pending_${user.id}`;
      
      // Store temp verification data
      sessionStorage.setItem(TEMP_2FA_KEY, JSON.stringify({
          userId: user.id,
          code: code,
          timestamp: Date.now()
      }));

      // In a real app, this would call: await emailProvider.send(user.email, code);
      // For this demo, we return the code to the UI to simulate an external notification.
      
      return { success: true, requires2FA: true, tempToken, demoCode: code };
    }

    return { success: false, message: 'Invalid credentials.' };
  },

  // Step 2: Verify Code
  verify2FA: async (code: string): Promise<{ success: boolean; user?: User; message?: string }> => {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate net lag

      const temp = sessionStorage.getItem(TEMP_2FA_KEY);
      if (!temp) return { success: false, message: "Session expired. Please login again." };

      const data = JSON.parse(temp);
      
      // Check code
      if (code === data.code) {
          const allUsers = db.users.getAll();
          const user = allUsers.find(u => u.id === data.userId);
          
          if (user) {
              const { password, ...safeUser } = user;
              localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
              sessionStorage.removeItem(TEMP_2FA_KEY);
              return { success: true, user: safeUser };
          }
      }

      return { success: false, message: "Invalid verification code." };
  },

  // Resend Code
  resendCode: async (): Promise<string | null> => {
      const temp = sessionStorage.getItem(TEMP_2FA_KEY);
      if (temp) {
          const data = JSON.parse(temp);
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
          data.code = newCode;
          sessionStorage.setItem(TEMP_2FA_KEY, JSON.stringify(data));
          return newCode;
      }
      return null;
  },

  // Simulate Google Login
  loginWithGoogle: async (): Promise<{ success: boolean; user?: User }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const email = `user.${Date.now()}@gmail.com`;
    const username = email.split('@')[0];
    
    let user = db.users.findByEmail(email);

    if (!user) {
        user = {
            id: 'google_user_' + Date.now(),
            name: 'Google User',
            username: username,
            email: email,
            avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
            role: 'User',
            password: ''
        };
        db.users.add(user);
    }
    
    const { password, ...safeUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TEMP_2FA_KEY);
  },

  getCurrentUser: (): User | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(SESSION_KEY);
  }
};
