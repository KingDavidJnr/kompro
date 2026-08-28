/**
 * Control management routes.
 *
 * All routes require authentication and a controls:* permission. Creation and
 * updates enforce field validation, including the allowed status values.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./controls.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { CONTROL_STATUSES } = require('./controls.service');

// Read access requires controls:read.
router.get('/', requireAuth, requirePermission('controls:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('controls:read'), controller.get);

// Creation requires controls:create.
router.post(
  '/',
  requireAuth,
  requirePermission('controls:create'),
  body('title').isString().withMessage('Control title is required'),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('status').optional().isIn(CONTROL_STATUSES).withMessage(`Status must be one of: ${CONTROL_STATUSES.join(', ')}`),
  body('owner').optional().isString(),
  validate,
  controller.create
);

// Updates require controls:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('controls:update'),
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('status').optional().isIn(CONTROL_STATUSES).withMessage(`Status must be one of: ${CONTROL_STATUSES.join(', ')}`),
  body('owner').optional().isString(),
  validate,
  controller.update
);

// Deletion requires controls:delete.
router.delete('/:id', requireAuth, requirePermission('controls:delete'), controller.remove);

module.exports = router;
