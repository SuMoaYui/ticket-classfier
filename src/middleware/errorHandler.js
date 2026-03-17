import logger from '../utils/logger.js';

/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    status,
  });

  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message:
        status === 500 ? 'An internal server error occurred.' : err.message,
    },
  });
}
