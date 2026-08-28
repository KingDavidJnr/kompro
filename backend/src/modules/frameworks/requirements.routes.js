/**
 * Requirement and mapping routes (mounted at /api/requirements).
 *
 * All routes require authentication and a frameworks:* permission. Mappings
 * connect a requirement to a control; creating or deleting a mapping uses
 * frameworks:update because it changes a framework's configuration.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./requirements.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

// List and read requirements require frameworks:read.
router.get('/', requireAuth, requirePermission('frameworks:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('frameworks:read'), controller.get);

// Creating a requirement requires frameworks:create.
router.post(
  '/',
  requireAuth,
  requirePermission('frameworks:create'),
  body('frameworkId').isString().withMessage('frameworkId is required'),
  body('title').isString().withMessage('Requirement title is required'),
  body('code').optional().isString(),
  body('description').optional().isString(),
  validate,
  controller.create
);

// Updating a requirement requires frameworks:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('frameworks:update'),
  body('code').optional().isString(),
  body('title').optional().isString(),
  body('description').optional().isString(),
  validate,
  controller.update
);

// Deleting a requirement requires frameworks:delete.
router.delete('/:id', requireAuth, requirePermission('frameworks:delete'), controller.remove);

// Mapping management uses frameworks:update.
router.post(
  '/:requirementId/mappings',
  requireAuth,
  requirePermission('frameworks:update'),
  body('controlId').isString().withMessage('controlId is required'),
  body('notes').optional().isString(),
  validate,
  controller.createMapping
);

router.delete(
  '/:requirementId/mappings/:controlId',
  requireAuth,
  requirePermission('frameworks:update'),
  controller.deleteMapping
);

module.exports = router;
