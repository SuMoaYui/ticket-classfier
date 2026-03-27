import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/localDatabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  provider: 'local' | 'google' | 'microsoft';
  avatar_url: string | null;
  created_at: string;
}

export interface SessionData {
  token: string;
  user: LocalUser;
  expiresAt: string;
}

interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  provider: string;
  avatar_url: string | null;
  created_at: string;
}

interface DbSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const SESSION_DAYS = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

function toLocalUser(row: DbUser): LocalUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    provider: row.provider as LocalUser['provider'],
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a new local user. Hashes the password with bcrypt.
 * Throws if email already exists.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<SessionData> {
  const db = getDatabase();

  // Check if email exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as DbUser | undefined;
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, provider) VALUES (?, ?, ?, ?, ?)',
  ).run(id, name, email, passwordHash, 'local');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser;
  const session = createSession(id);

  return { token: session.token, user: toLocalUser(user), expiresAt: session.expires_at };
}

/**
 * Authenticate a local user with email + password.
 * Throws on invalid credentials.
 */
export async function loginUser(email: string, password: string): Promise<SessionData> {
  const db = getDatabase();

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND provider = ?').get(email, 'local') as DbUser | undefined;
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.password_hash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const session = createSession(user.id);
  return { token: session.token, user: toLocalUser(user), expiresAt: session.expires_at };
}

/**
 * Create or update a user from an OAuth provider (Google, Microsoft).
 * If the email already exists with the same provider, update the name/avatar.
 * If new, insert. Then create a session.
 */
export function upsertOAuthUser(
  email: string,
  name: string,
  provider: 'google' | 'microsoft',
  avatarUrl?: string,
): SessionData {
  const db = getDatabase();

  let user = db.prepare('SELECT * FROM users WHERE email = ? AND provider = ?').get(email, provider) as DbUser | undefined;

  if (user) {
    // Update name/avatar on re-login
    db.prepare('UPDATE users SET name = ?, avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(name, avatarUrl || null, user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as DbUser;
  } else {
    const id = randomUUID();
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, provider, avatar_url) VALUES (?, ?, ?, NULL, ?, ?)',
    ).run(id, name, email, provider, avatarUrl || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser;
  }

  const session = createSession(user!.id);
  return { token: session.token, user: toLocalUser(user!), expiresAt: session.expires_at };
}

/**
 * Validate an existing session token. Returns user if valid, null if expired/invalid.
 */
export function validateSession(token: string): SessionData | null {
  const db = getDatabase();

  const session = db.prepare(
    'SELECT * FROM sessions WHERE token = ?',
  ).get(token) as DbSession | undefined;

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return null;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as DbUser | undefined;
  if (!user) return null;

  return { token: session.token, user: toLocalUser(user), expiresAt: session.expires_at };
}

/**
 * Delete a session (logout).
 */
export function deleteSession(token: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Remove all expired sessions (housekeeping).
 */
export function deleteExpiredSessions(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE expires_at < datetime(\'now\')').run();
}

// ─── Internal ───────────────────────────────────────────────────────────────

function createSession(userId: string): DbSession {
  const db = getDatabase();
  const id = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
  ).run(id, userId, token, expiresAt);

  return { id, user_id: userId, token, expires_at: expiresAt };
}
