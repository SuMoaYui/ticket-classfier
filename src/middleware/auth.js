import { getDatabase } from '../db/database.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import crypto from 'crypto';

/**
 * Perform a timing-safe string comparison.
 */
function safeCompare(a, b) {
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
export function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Request without API key', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing API key. Provide it via the X-API-Key header.',
      },
    });
  }

  // Check against database
  try {
    const db = getDatabase();
    const record = db
      .prepare('SELECT * FROM api_keys WHERE key = ? AND active = 1')
      .get(apiKey);

    if (record) {
      req.apiKeyName = record.name;
      return next();
    }
  } catch (error) {
    logger.error('Database connection failed during auth', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service unavailable.',
      },
    });
  }

  // Fallback: check against env variable using timing-safe comparison
  if (config.apiKey && safeCompare(apiKey, config.apiKey)) {
    req.apiKeyName = 'env-key';
    return next();
  }

  logger.warn('Invalid API key attempt', { ip: req.ip, path: req.path });
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Invalid API key.',
    },
  });
}
