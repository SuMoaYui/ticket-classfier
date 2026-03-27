import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { authenticate } from './auth.js';

// JWT_SECRET: derived from API_KEY hash so we don't need another env var
const JWT_SECRET = crypto.createHash('sha256').update(config.apiKey + '-jwt-secret').digest('hex');
const JWT_EXPIRY = '1h';

/**
 * Generate a JWT token in exchange for a valid API Key.
 * POST /api/v1/auth/token
 */
export function handleTokenExchange(req: Request, res: Response): void {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Provide your API key via X-API-Key header to get a JWT token.' },
    });
    return;
  }

  // The authenticate middleware already validated the key, so we can issue a token
  const token = jwt.sign(
    { sub: req.apiKeyName || 'api-client', iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({
    success: true,
    data: {
      token,
      type: 'Bearer',
      expiresIn: JWT_EXPIRY,
      usage: 'Pass this token via Authorization: Bearer <token> header instead of X-API-Key.',
    },
  });
}

/**
 * Hybrid auth middleware: accepts either X-API-Key or Bearer JWT.
 * Falls through to the original API Key auth if no Bearer token is present.
 */
export function hybridAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      req.apiKeyName = decoded.sub;
      next();
      return;
    } catch (err) {
      logger.warn('Invalid JWT token', { error: (err as Error).message });
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired JWT token.' },
      });
      return;
    }
  }

  // Fallback: use API Key authentication
  authenticate(req, res, next);
}
