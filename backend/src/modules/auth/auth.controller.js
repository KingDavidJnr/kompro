/**
 * HTTP layer for authentication endpoints.
 *
 * Wraps auth.service and formats responses as { message, data }. The session
 * JWT is delivered in an httpOnly cookie; it is not returned in the body.
 */

const authService = require('./auth.service');
const config = require('../../config');
const auditService = require('../audit/audit.service');

/**
 * Builds the cookie options for the session token.
 * @returns {object} Options for res.cookie (httpOnly, secure, sameSite, maxAge).
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: config.sessionTtlMs,
  };
}

/**
 * Handles POST /api/auth/register.
 * @param {object} req - Express request with { email, password, name }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'user',
      entityId: user.id,
      before: null,
      after: user,
    });
    res.status(201).json({ message: 'User registered successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/login.
 * @param {object} req - Express request with { email, password }.
 * @param {object} res - Express response; sets token cookie, returns { message, data: { user } }.
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    res.cookie('token', token, cookieOptions());
    res.json({ message: 'Login successful', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/logout.
 * @param {object} req - Authenticated request (req.user, req.session).
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id, req.session.id);
    res.clearCookie('token');
    res.json({ message: 'Logout successful', data: {} });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/auth/me.
 * @param {object} req - Authenticated request (req.user).
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function me(req, res, next) {
  try {
    res.json({ message: 'Current user retrieved', data: { user: authService.me(req.user) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/accept-invite.
 * @param {object} req - Public request with { token, password }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function acceptInvite(req, res, next) {
  try {
    const user = await authService.acceptInvite(req.body);
    res.json({ message: 'Invitation accepted. You can now log in.', data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me, acceptInvite };
