import { app, BrowserWindow, ipcMain, shell, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDatabase, closeDatabase } from './db/localDatabase';
import {
  registerUser,
  loginUser,
  validateSession,
  deleteSession,
  deleteExpiredSessions,
} from './auth/localAuth';
import { startGoogleOAuth } from './auth/googleOAuth';

let mainWindow: BrowserWindow | null = null;

// ─── Persistent Config File (theme, locale, API config) ────────────────────
let _configFilePath: string | null = null;
function getConfigFilePath(): string {
  if (!_configFilePath) {
    _configFilePath = path.join(app.getPath('userData'), 'app-config.json');
  }
  return _configFilePath;
}

interface AppConfig {
  theme: string;
  locale: string;
  apiBaseUrl: string;
  apiKey: string;
  sessionToken: string;
}

const defaultConfig: AppConfig = {
  theme: 'dark',
  locale: 'es',
  apiBaseUrl: 'http://localhost:3000/api/v1',
  apiKey: '',
  sessionToken: '',
};

// ─── AES OS Encryption Helpers ────────────────────────────────────────────────
function encrypt(val: string): string {
  if (!val) return val;
  try {
    return safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(val).toString('base64') : val;
  } catch { return val; } // Fallback quietly
}

function decrypt(val: string): string {
  if (!val) return val;
  try {
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(val, 'base64')) : val;
  } catch { return ''; } // Nuke corrupted/tampered token
}

function readConfig(): AppConfig {
  try {
    if (fs.existsSync(getConfigFilePath())) {
      const raw = fs.readFileSync(getConfigFilePath(), 'utf-8');
      const parsed = JSON.parse(raw);
      // Decrypt credentials
      parsed.apiKey = decrypt(parsed.apiKey);
      parsed.sessionToken = decrypt(parsed.sessionToken);
      return { ...defaultConfig, ...parsed };
    }
  } catch (error) {
    console.warn('[Security] Failed to read or decrypt config', error);
  }
  return { ...defaultConfig };
}

function writeConfig(config: Partial<AppConfig>): AppConfig {
  const current = readConfig();
  const merged = { ...current, ...config };
  
  // Create a payload clone and encrypt sensitive data before dumping to fs
  const securePayload = { ...merged };
  securePayload.apiKey = encrypt(securePayload.apiKey);
  securePayload.sessionToken = encrypt(securePayload.sessionToken);

  fs.writeFileSync(getConfigFilePath(), JSON.stringify(securePayload, null, 2), 'utf-8');
  return merged; // return unencrypted merged in memory
}

// ─── Window Creation ────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Ticket Classifier',
    backgroundColor: '#0f0f23',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3 native module
    },
  });

  // In development, load the Vite dev server
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // In production, load the built HTML
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Security: Prevent app from navigating to external URLs inside the app window
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // In dev mode, allow navigation only within the local dev server
    if (process.env.ELECTRON_RENDERER_URL) {
      const devUrl = new URL(process.env.ELECTRON_RENDERER_URL);
      if (parsedUrl.origin !== devUrl.origin) {
        event.preventDefault();
      }
    } else {
      // In production, block all http/https navigation (should stay on file:// index.html)
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        event.preventDefault();
      }
    }
  });

  // Security: Prevent app from creating new windows; open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Initialize the local database
  getDatabase();

  // Clean up expired sessions
  deleteExpiredSessions();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

// ─── IPC Handlers: Theme ────────────────────────────────────────────────────

ipcMain.handle('get-theme', () => {
  return readConfig().theme;
});

ipcMain.handle('set-theme', (_event, theme: string) => {
  writeConfig({ theme });
  return theme;
});

// ─── IPC Handlers: Locale ───────────────────────────────────────────────────

ipcMain.handle('get-locale', () => {
  return readConfig().locale;
});

ipcMain.handle('set-locale', (_event, locale: string) => {
  writeConfig({ locale });
  return locale;
});

// ─── IPC Handlers: API Config ───────────────────────────────────────────────

ipcMain.handle('get-api-config', () => {
  const cfg = readConfig();
  return { baseUrl: cfg.apiBaseUrl, apiKey: cfg.apiKey };
});

ipcMain.handle('set-api-config', (_event, baseUrl: string, apiKey: string) => {
  writeConfig({ apiBaseUrl: baseUrl, apiKey: apiKey });
  return { baseUrl, apiKey };
});

ipcMain.handle('clear-api-credentials', () => {
  writeConfig({ apiKey: '' });
  return true;
});

// ─── IPC Handlers: Authentication ───────────────────────────────────────────

ipcMain.handle('auth:register', async (_event, name: string, email: string, password: string) => {
  try {
    const session = await registerUser(name, email, password);
    writeConfig({ sessionToken: session.token });
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
  try {
    const session = await loginUser(email, password);
    writeConfig({ sessionToken: session.token });
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:validate-session', (_event, token: string) => {
  try {
    const session = validateSession(token);
    if (!session) {
      return { success: false, error: 'SESSION_EXPIRED' };
    }
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:logout', (_event, token: string) => {
  try {
    deleteSession(token);
    writeConfig({ sessionToken: '' });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:get-session-token', () => {
  return readConfig().sessionToken;
});

ipcMain.handle('auth:google-login', async () => {
  try {
    const session = await startGoogleOAuth();
    writeConfig({ sessionToken: session.token });
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
