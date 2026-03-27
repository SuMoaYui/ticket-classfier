import 'reflect-metadata';
import './utils/tracing.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import config from './config/index.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import ticketRoutes from './modules/tickets/ticket.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import logger from './utils/logger.js';
import { startClassificationWorker } from './workers/classification.worker.js';
import { setupSwagger } from './middleware/swagger.js';
import { handleTokenExchange, hybridAuth } from './middleware/jwt-auth.js';
import { authenticate } from './middleware/auth.js';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// ─── Security & Reliability Middleware ──────────────────────────────────────
app.set('trust proxy', 1); // Trust first proxy for correct IP logging/rate limiting
app.use(helmet()); // Secure HTTP headers

// CORS — reads allowed origins from env (comma-separated) or allows all in dev
const corsOrigin = config.isProd
  ? config.allowedOrigins.split(',').map(o => o.trim())
  : '*';
app.use(cors({ origin: corsOrigin }));

// Global rate limiting for generic endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' } }
});
if (!config.isTest) {
  app.use(globalLimiter);
}

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ─── Health check (no auth required) ────────────────────────────────────────
app.get('/api/v1/health', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // Verify database connection is alive
    db.prepare('SELECT 1').get();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        version: '1.0.0',
        llmMode: config.llmMode,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failed',
      },
    });
  }
});

// ─── API Documentation (Swagger UI) ─────────────────────────────────────────
setupSwagger(app);

// ─── JWT Token Exchange Endpoint ───────────────────────────────────────────
app.post('/api/v1/auth/token', authenticate, handleTokenExchange);

// ─── API routes ─────────────────────────────────────────────────────────────
// Stricter rate limiting for ticket creation/endpoints
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute for API
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'API rate limit exceeded.' } }
});
if (!config.isTest) {
  app.use('/api/v1/tickets', apiLimiter, ticketRoutes);
  app.use('/api/v1/chat', apiLimiter, chatRoutes);
} else {
  app.use('/api/v1/tickets', ticketRoutes);
  app.use('/api/v1/chat', chatRoutes);
}

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    },
  });
});

// ─── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler);

// Start the background job worker (needs to run in tests too)
startClassificationWorker();

// ─── Server start ───────────────────────────────────────────────────────────
if (!config.isTest) {
  // Initialize database
  getDatabase();
  logger.info('Database initialized successfully');

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Ticket Classifier API running on port ${config.port}`);
    logger.info(`📋 LLM Mode: ${config.llmMode}`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
    logger.info(`📖 Health: http://localhost:${config.port}/api/v1/health`);
    logger.info(`📚 Docs:   http://localhost:${config.port}/api/docs`);
  });

  // Graceful shutdown
  const shutdown = (signal: string): void => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      closeDatabase();
      logger.info('Server closed. Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
