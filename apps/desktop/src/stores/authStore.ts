import { create } from 'zustand';
import { setApiConfig } from '@/services/config';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google' | 'microsoft';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringSession: boolean;
  sessionToken: string;
  apiKey: string;
  apiBaseUrl: string;
  error: string | null;

  // Auth actions
  registerLocal: (name: string, email: string, password: string) => Promise<boolean>;
  loginLocal: (email: string, password: string) => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;

  // API config
  setApiCredentials: (baseUrl: string, apiKey: string) => void;
  clearApiCredentials: () => void;
  loadPersistedConfig: () => Promise<void>;

  // UI helpers
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoringSession: true, // starts true — App.tsx checks on mount
  sessionToken: '',
  apiKey: '',
  apiBaseUrl: 'http://localhost:3000/api/v1',
  error: null,

  // ─── Register ───────────────────────────────────────────────────────────

  registerLocal: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI?.auth.register(name, email, password);

      if (!result || !result.success) {
        const errorCode = result?.error || 'UNKNOWN';
        set({ isLoading: false, error: errorCode });
        return false;
      }

      const { token, user } = result.data!;
      set({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar_url || undefined,
          provider: user.provider as User['provider'],
        },
        isAuthenticated: true,
        isLoading: false,
        sessionToken: token,
        error: null,
      });
      return true;
    } catch {
      set({ isLoading: false, error: 'REGISTRATION_FAILED' });
      return false;
    }
  },

  // ─── Login Local ────────────────────────────────────────────────────────

  loginLocal: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI?.auth.login(email, password);

      if (!result || !result.success) {
        const errorCode = result?.error || 'UNKNOWN';
        set({ isLoading: false, error: errorCode });
        return false;
      }

      const { token, user } = result.data!;
      set({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar_url || undefined,
          provider: user.provider as User['provider'],
        },
        isAuthenticated: true,
        isLoading: false,
        sessionToken: token,
        error: null,
      });
      return true;
    } catch {
      set({ isLoading: false, error: 'LOGIN_FAILED' });
      return false;
    }
  },

  // ─── Login Google ───────────────────────────────────────────────────────

  loginGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI?.auth.googleLogin();

      if (!result || !result.success) {
        const errorCode = result?.error || 'UNKNOWN';
        set({ isLoading: false, error: errorCode });
        return false;
      }

      const { token, user } = result.data!;
      set({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar_url || undefined,
          provider: user.provider as User['provider'],
        },
        isAuthenticated: true,
        isLoading: false,
        sessionToken: token,
        error: null,
      });
      return true;
    } catch {
      set({ isLoading: false, error: 'GOOGLE_LOGIN_FAILED' });
      return false;
    }
  },

  // ─── Restore Session (auto-login) ───────────────────────────────────────

  restoreSession: async () => {
    set({ isRestoringSession: true });
    try {
      const token = await window.electronAPI?.auth.getSessionToken();
      if (!token) {
        set({ isRestoringSession: false });
        return false;
      }

      const result = await window.electronAPI?.auth.validateSession(token);
      if (!result || !result.success) {
        set({ isRestoringSession: false, sessionToken: '' });
        return false;
      }

      const { user } = result.data!;
      set({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar_url || undefined,
          provider: user.provider as User['provider'],
        },
        isAuthenticated: true,
        isRestoringSession: false,
        sessionToken: token,
      });
      return true;
    } catch {
      set({ isRestoringSession: false });
      return false;
    }
  },

  // ─── Logout ─────────────────────────────────────────────────────────────

  logout: async () => {
    const { sessionToken } = get();
    try {
      if (sessionToken) {
        await window.electronAPI?.auth.logout(sessionToken);
      }
    } catch {
      // Continue with local logout even if IPC fails
    }
    set({
      user: null,
      isAuthenticated: false,
      sessionToken: '',
      error: null,
    });
  },

  // ─── API Credentials ───────────────────────────────────────────────────

  setApiCredentials: (baseUrl, apiKey) => {
    setApiConfig(baseUrl, apiKey);
    set({ apiBaseUrl: baseUrl, apiKey });
    window.electronAPI?.setApiConfig(baseUrl, apiKey);
  },

  clearApiCredentials: () => {
    setApiConfig(get().apiBaseUrl, '');
    set({ apiKey: '' });
    window.electronAPI?.clearApiCredentials();
  },

  loadPersistedConfig: async () => {
    try {
      const config = await window.electronAPI?.getApiConfig();
      if (config) {
        setApiConfig(config.baseUrl, config.apiKey);
        set({ apiBaseUrl: config.baseUrl, apiKey: config.apiKey });
      }
    } catch {
      // Silently use defaults
    }
  },

  // ─── UI Helpers ─────────────────────────────────────────────────────────

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearError: () => set({ error: null }),
}));
