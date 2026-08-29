/**
 * Organization settings routes.
 *
 * Both endpoints require authentication. Reading requires the "org:read"
 * permission and updating requires the "org:update" permission.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./org.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

// Reading organization settings requires the org:read permission.
router.get('/settings', requireAuth, requirePermission('org:read'), controller.getSettings);

// Updating settings is restricted to users with the org:update permission.
router.patch(
  '/settings',
  requireAuth,
  requirePermission('org:update'),
  body('name').optional().isString(),
  body('displayName').optional().isString(),
  body('settings').optional(),
  validate,
  controller.updateSettings
);

module.exports = router;
