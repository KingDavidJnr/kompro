/**
 * Custom error types and response helpers for the API layer.
 *
 * All domain errors extend ApiError so the error handler can map them to
 * HTTP status codes. publicUser strips secret fields before sending a user
 * to the client.
 */

/**
 * Base error that carries an HTTP status code.
 * @param {number} status - HTTP status code to respond with.
 * @param {string} message - Human readable error message.
 */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * 401 Unauthorized. Thrown when authentication is missing or invalid.
 * @param {string} [message] - Optional custom message.
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 Forbidden. Thrown when an authenticated user lacks a permission.
 * @param {string} [message] - Optional custom message.
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found. Thrown when a requested resource does not exist.
 * @param {string} [message] - Optional custom message.
 */
class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

/**
 * 400 Validation Error. Thrown when input fails validation.
 * @param {string} [message] - Optional custom message.
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed') {
    super(400, message);
  }
}

/**
 * Removes the password hash from a user record before returning it.
 * @param {object|null} user - User record or null.
 * @returns {object|null} User without passwordHash, or null when input is null.
 */
function publicUser(user) {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  publicUser,
};
