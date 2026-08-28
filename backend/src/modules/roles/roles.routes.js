/**
 * Role and permission routes.
 *
 * All routes require authentication and a roles:* permission. The permissions
 * listing route is declared before the :id route so "permissions" is not
 * captured as a role id.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./roles.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

// Read access requires roles:read.
router.get('/', requireAuth, requirePermission('roles:read'), controller.list);
router.get('/permissions', requireAuth, requirePermission('roles:read'), controller.listPermissions);
router.get('/:id', requireAuth, requirePermission('roles:read'), controller.get);

// Creating a role requires roles:create.
router.post(
  '/',
  requireAuth,
  requirePermission('roles:create'),
  body('name').isString().withMessage('Role name is required'),
  body('description').optional().isString(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array of names'),
  validate,
  controller.create
);

// Updating a role requires roles:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('roles:update'),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array of names'),
  validate,
  controller.update
);

// Deleting a role requires roles:delete.
router.delete('/:id', requireAuth, requirePermission('roles:delete'), controller.remove);

module.exports = router;
