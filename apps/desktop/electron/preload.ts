import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure IPC Bridge — exposes only specific APIs to the renderer process.
 * This follows Electron security best practices (contextIsolation: true).
 */

interface AuthResult {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      provider: string;
      avatar_url: string | null;
    };
    expiresAt: string;
  };
  error?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Theme
  getTheme: (): Promise<string> => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: string): Promise<string> => ipcRenderer.invoke('set-theme', theme),

  // Locale
  getLocale: (): Promise<string> => ipcRenderer.invoke('get-locale'),
  setLocale: (locale: string): Promise<string> => ipcRenderer.invoke('set-locale', locale),

  // API Configuration (Option C — hybrid persistence)
  getApiConfig: (): Promise<{ baseUrl: string; apiKey: string }> =>
    ipcRenderer.invoke('get-api-config'),
  setApiConfig: (baseUrl: string, apiKey: string): Promise<{ baseUrl: string; apiKey: string }> =>
    ipcRenderer.invoke('set-api-config', baseUrl, apiKey),
  clearApiCredentials: (): Promise<boolean> =>
    ipcRenderer.invoke('clear-api-credentials'),

  // Authentication
  auth: {
    register: (name: string, email: string, password: string): Promise<AuthResult> =>
      ipcRenderer.invoke('auth:register', name, email, password),
    login: (email: string, password: string): Promise<AuthResult> =>
      ipcRenderer.invoke('auth:login', email, password),
    validateSession: (token: string): Promise<AuthResult> =>
      ipcRenderer.invoke('auth:validate-session', token),
    logout: (token: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('auth:logout', token),
    getSessionToken: (): Promise<string> =>
      ipcRenderer.invoke('auth:get-session-token'),
    googleLogin: (): Promise<AuthResult> =>
      ipcRenderer.invoke('auth:google-login'),
  },

  // App info
  getVersion: (): string => '1.0.0',
  getPlatform: (): string => process.platform,
});
