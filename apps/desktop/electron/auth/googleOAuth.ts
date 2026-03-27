import { BrowserWindow, shell } from 'electron';
import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';
import { upsertOAuthUser } from './localAuth';
import type { SessionData } from './localAuth';

// ─── Configuration ──────────────────────────────────────────────────────────

// @ts-ignore
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
// @ts-ignore
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const REDIRECT_PORT = 48721;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

// ─── PKCE Helpers ───────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ─── Main OAuth Flow ────────────────────────────────────────────────────────

/**
 * Starts the Google OAuth 2.0 PKCE flow:
 * 1. Opens Google sign-in in the system's default browser
 * 2. Listens on a local HTTP server for the callback
 * 3. Exchanges the authorization code for tokens
 * 4. Fetches user profile
 * 5. Creates/updates user in local SQLite
 * 6. Returns session data
 */
export function startGoogleOAuth(): Promise<SessionData> {
  return new Promise((resolve, reject) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    // Build authorization URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    let server: http.Server | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Cleanup function
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (server) {
        server.close();
        server = null;
      }
    };

    // Timeout after 5 minutes
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('OAUTH_TIMEOUT'));
    }, 5 * 60 * 1000);

    // Start local server to receive the callback
    server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', `http://localhost:${REDIRECT_PORT}`);

        if (reqUrl.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = reqUrl.searchParams.get('code');
        const returnedState = reqUrl.searchParams.get('state');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getErrorHtml(error));
          cleanup();
          reject(new Error(`OAUTH_ERROR: ${error}`));
          return;
        }

        if (!code || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(getErrorHtml('Invalid callback'));
          cleanup();
          reject(new Error('OAUTH_INVALID_CALLBACK'));
          return;
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, codeVerifier);

        // Fetch user profile
        const profile = await fetchUserProfile(tokens.access_token);

        // Create/update user in local database
        const session = upsertOAuthUser(
          profile.email,
          profile.name,
          'google',
          profile.picture,
        );

        // Send success HTML to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getSuccessHtml());

        cleanup();

        // Focus the Electron window
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const win = windows[0];
          if (win.isMinimized()) win.restore();
          win.focus();
        }

        resolve(session);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(getErrorHtml('Authentication failed'));
        cleanup();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      // Open in system default browser
      shell.openExternal(authUrl.toString());
    });

    server.on('error', (err) => {
      cleanup();
      reject(new Error(`OAUTH_SERVER_ERROR: ${err.message}`));
    });
  });
}

// ─── Token Exchange ─────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json() as Promise<TokenResponse>;
}

// ─── User Profile ───────────────────────────────────────────────────────────

interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

async function fetchUserProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json() as Promise<GoogleProfile>;
}

// ─── HTML Templates ─────────────────────────────────────────────────────────

function getSuccessHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Login Successful</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;
min-height:100vh;margin:0;background:#0f0f23;color:#e0e0e0;}
.card{text-align:center;padding:3rem;border-radius:1rem;background:#1a1a3e;box-shadow:0 8px 32px rgba(0,0,0,.4);}
h1{color:#6c63ff;margin-bottom:.5rem;}p{opacity:.7;}
</style></head><body><div class="card">
<h1>✅ Login Successful</h1>
<p>You can close this tab and return to Ticket Classifier.</p>
</div></body></html>`;
}

function getErrorHtml(error: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Login Failed</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;
min-height:100vh;margin:0;background:#0f0f23;color:#e0e0e0;}
.card{text-align:center;padding:3rem;border-radius:1rem;background:#1a1a3e;box-shadow:0 8px 32px rgba(0,0,0,.4);}
h1{color:#ff6b6b;margin-bottom:.5rem;}p{opacity:.7;}
</style></head><body><div class="card">
<h1>❌ Login Failed</h1>
<p>${error}</p>
<p>Please close this tab and try again.</p>
</div></body></html>`;
}
