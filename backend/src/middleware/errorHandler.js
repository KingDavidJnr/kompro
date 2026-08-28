/**
 * Central Express error handler.
 *
 * Maps known ApiError instances and common library errors to JSON responses
 * using the consistent { message } shape for errors. 4xx responses are never
 * logged to the console. 5xx responses log the real error with console.error
 * (including stack) but only return a generic human readable message.
 */

const { ApiError } = require('../utils/errors');

/**
 * Express error-handling middleware (signature required by Express).
 * @param {Error} err - The thrown error.
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {function} next - Express next callback.
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  // Known API errors: return their status and message without logging.
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  // Malformed or expired JWTs are client errors (4xx), do not log them.
  if (err && err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err && err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Unique constraint violations are client conflicts (4xx), do not log them.
  if (err && err.code === 'P2002') {
    return res.status(409).json({ message: 'Resource already exists' });
  }

  // Unexpected server error: log the real error, return a safe message.
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = errorHandler;
