/**
 * Type declarations for the Electron IPC bridge.
 * These types match what's exposed in preload.ts via contextBridge.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: string;
  avatar_url: string | null;
}

export interface AuthResult {
  success: boolean;
  data?: {
    token: string;
    user: AuthUser;
    expiresAt: string;
  };
  error?: string;
}

export interface ElectronAuthAPI {
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  validateSession: (token: string) => Promise<AuthResult>;
  logout: (token: string) => Promise<{ success: boolean; error?: string }>;
  getSessionToken: () => Promise<string>;
  googleLogin: () => Promise<AuthResult>;
}

export interface ElectronAPI {
  // Theme
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;

  // Locale
  getLocale: () => Promise<string>;
  setLocale: (locale: string) => Promise<string>;

  // API Configuration
  getApiConfig: () => Promise<{ baseUrl: string; apiKey: string }>;
  setApiConfig: (baseUrl: string, apiKey: string) => Promise<{ baseUrl: string; apiKey: string }>;
  clearApiCredentials: () => Promise<boolean>;

  // Authentication
  auth: ElectronAuthAPI;

  // App info
  getVersion: () => string;
  getPlatform: () => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
