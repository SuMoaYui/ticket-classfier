import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import crypto from 'crypto';

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      apiKeyName?: string;
      validatedBody?: unknown;
    }
  }
}

/**
 * Perform a timing-safe string comparison.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * API Key authentication middleware.
 * Validates the X-API-Key header against the api_keys table or the env fallback.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    logger.warn('Request without API key', { ip: req.ip, path: req.path });
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing API key. Provide it via the X-API-Key header.',
      },
    });
    return;
  }

  // Check against database using SHA-256 crypto hashes (Zero Domain Leakage)
  try {
    const db = getDatabase();
    // 1. Hash the incoming API Key (SHA-256)
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // 2. Query against secured hashed records
    let record = db
      .prepare('SELECT * FROM api_keys WHERE key = ? AND active = 1')
      .get(hashedKey) as { name: string } | undefined;

    // 3. Fallback check for legacy unhashed keys (with security warning)
    if (!record) {
      record = db
        .prepare('SELECT * FROM api_keys WHERE key = ? AND active = 1')
        .get(apiKey) as { name: string } | undefined;
      
      if (record) {
        logger.warn(`[SECURITY WARNING] Legacy plain-text API key used for '${record.name}'. Please migrate keys in SQLite to SHA-256!`);
      }
    }

    if (record) {
      req.apiKeyName = record.name;
      next();
      return;
    }
  } catch (error) {
    const err = error as Error;
    logger.error('Database connection failed during auth', { error: err.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service unavailable.',
      },
    });
    return;
  }

  // Fallback: check against env variable using timing-safe comparison
  if (config.apiKey && safeCompare(apiKey, config.apiKey)) {
    req.apiKeyName = 'env-key';
    next();
    return;
  }

  logger.warn('Invalid API key attempt', { ip: req.ip, path: req.path });
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Invalid API key.',
    },
  });
}
