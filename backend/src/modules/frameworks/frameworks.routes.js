/**
 * Framework routes.
 *
 * All routes require authentication and a frameworks:* permission. Frameworks
 * are the containers; requirements and mappings are managed on the
 * requirements router mounted at /api/requirements.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./frameworks.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

// Read access requires frameworks:read.
router.get('/', requireAuth, requirePermission('frameworks:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('frameworks:read'), controller.get);
router.get('/:id/status', requireAuth, requirePermission('frameworks:read'), controller.status);
router.get('/:id/readiness', requireAuth, requirePermission('frameworks:read'), controller.readiness);

// Creation requires frameworks:create.
router.post(
  '/',
  requireAuth,
  requirePermission('frameworks:create'),
  body('name').isString().withMessage('Framework name is required'),
  body('description').optional().isString(),
  body('enabled').optional().isBoolean(),
  validate,
  controller.create
);

// Updates require frameworks:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('frameworks:update'),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('enabled').optional().isBoolean(),
  validate,
  controller.update
);

// Deletion requires frameworks:delete.
router.delete('/:id', requireAuth, requirePermission('frameworks:delete'), controller.remove);

module.exports = router;
