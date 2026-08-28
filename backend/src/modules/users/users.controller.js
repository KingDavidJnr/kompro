/**
 * HTTP layer for user management endpoints.
 *
 * Wraps users.service and formats responses as { message, data }. Every
 * mutating action writes an audit entry recording the actor, the change and
 * the before/after state.
 */

const userService = require('./users.service');
const auditService = require('../audit/audit.service');
const config = require('../../config');

/**
 * Handles GET /api/users.
 * @param {object} req - Authenticated request; reads page/pageSize query.
 * @param {object} res - Express response ({ message, data: { users, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await userService.listUsers({
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json({ message: 'Users retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/users/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ message: 'User retrieved', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/users.
 * @param {object} req - Authenticated request with { email, password, name, roleId, active }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const invited = !req.body.password;
    const { user, inviteToken } = await userService.createUser(req.body);
    await auditService.recordFromRequest(req, {
      action: 'invite',
      entity: 'user',
      entityId: user.id,
      before: null,
      after: user,
    });
    const data = { user };
    // When SMTP is off the link is returned so the admin can send it manually.
    if (invited && inviteToken) {
      data.inviteUrl = `${config.appUrl}/accept-invite?token=${inviteToken}`;
    }
    res.status(201).json({ message: invited ? 'User invited' : 'User created', data });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/users/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    // Capture the prior state for the audit trail.
    const before = await userService.getUserById(req.params.id);
    const user = await userService.updateUser(req.params.id, req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'user',
      entityId: user.id,
      before,
      after: user,
    });
    res.json({ message: 'User updated', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/users/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    const before = await userService.getUserById(req.params.id);
    await userService.deleteUser(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'remove',
      entity: 'user',
      entityId: req.params.id,
      before,
      after: null,
    });
    res.json({ message: 'User deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/users/:id/resend-invite.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function resendInvite(req, res, next) {
  try {
    const { emailSent, inviteToken } = await userService.resendInvite(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'invite',
      entity: 'user',
      entityId: req.params.id,
      before: null,
      after: null,
    });
    const data = {};
    // When SMTP is off the link is returned so the admin can send it manually.
    if (!emailSent && inviteToken) {
      data.inviteUrl = `${config.appUrl}/accept-invite?token=${inviteToken}`;
    }
    res.json({ message: emailSent ? 'Invitation resent' : 'Invitation link generated', data });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/users/:id/deactivate.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function deactivate(req, res, next) {
  try {
    const before = await userService.getUserById(req.params.id);
    const user = await userService.deactivateUser(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'deactivate',
      entity: 'user',
      entityId: user.id,
      before,
      after: user,
    });
    res.json({ message: 'User deactivated', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/users/:id/reactivate.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function reactivate(req, res, next) {
  try {
    const before = await userService.getUserById(req.params.id);
    const user = await userService.reactivateUser(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'reactivate',
      entity: 'user',
      entityId: user.id,
      before,
      after: user,
    });
    res.json({ message: 'User reactivated', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/users/:id/reset-link.
 *
 * Generates a password-reset link for the target user without emailing it. For
 * deployments without SMTP an administrator uses this to deliver the link out of
 * band. The action is recorded in the audit log so abuse of this privilege is
 * visible.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { email, resetUrl } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function generateResetLink(req, res, next) {
  try {
    const result = await userService.generateResetLink(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'generate_reset_link',
      entity: 'user',
      entityId: result.email,
      before: null,
      after: { email: result.email },
    });
    res.json({
      message: 'Reset link generated',
      data: { email: result.email, resetUrl: result.resetUrl },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove, resendInvite, deactivate, reactivate, generateResetLink };
