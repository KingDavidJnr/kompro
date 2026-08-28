/**
 * User management routes.
 *
 * All routes require authentication. Each action is gated by a users:*
 * permission. Creating and updating enforce field validation.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./users.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { rateLimitByEmail } = require('../../middleware/rateLimit');

// Limit invite creation per target email to avoid abuse.
const inviteLimit = rateLimitByEmail({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many invitations created, please try again later',
});

// List and read require users:read.
router.get('/', requireAuth, requirePermission('users:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('users:read'), controller.get);

// Creation requires users:create.
router.post(
  '/',
  requireAuth,
  requirePermission('users:create'),
  inviteLimit,
  body('email').isEmail().withMessage('Valid email required'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString(),
  body('roleId').optional().isString(),
  body('active').optional().isBoolean(),
  validate,
  controller.create
);

// Resend an invitation (re-issues the email) and requires users:create.
router.post(
  '/:id/resend-invite',
  requireAuth,
  requirePermission('users:create'),
  inviteLimit,
  controller.resendInvite
);

// Disable / re-enable an account (users:update).
router.post('/:id/deactivate', requireAuth, requirePermission('users:update'), controller.deactivate);
router.post('/:id/reactivate', requireAuth, requirePermission('users:update'), controller.reactivate);

// Updates require users:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('users:update'),
  body('name').optional().isString(),
  body('roleId').optional({ nullable: true }).isString().withMessage('Role id must be a string'),
  body('active').optional().isBoolean(),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  controller.update
);

// Deletion requires users:delete.
router.delete('/:id', requireAuth, requirePermission('users:delete'), controller.remove);

module.exports = router;
