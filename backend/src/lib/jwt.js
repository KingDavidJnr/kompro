/**
 * JWT signing and verification helpers for session tokens.
 *
 * Tokens are signed with the HS256 algorithm using the configured secret.
 * The payload carries the user id (sub) and the database session id (sid)
 * so that sessions can be revoked independently of the token itself.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Signs a session JWT.
 * @param {object} payload - Object containing sub (user id) and sid (session id).
 * @returns {string} Signed JWT string valid for the configured TTL.
 */
function signSession(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtTtl });
}

/**
 * Verifies and decodes a session JWT.
 * @param {string} token - The JWT string to verify.
 * @returns {object} Decoded payload ({ sub, sid, iat, exp }).
 * @throws {Error} JsonWebTokenError or TokenExpiredError on invalid or expired tokens.
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signSession, verifyToken };
