/**
 * Incident routes. Main incident CRUD plus nested response actions.
 */

const router = require('express').Router();
const controller = require('./incidents.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

router.get('/', requireAuth, requirePermission('incident:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('incident:read'), controller.get);
router.post(
  '/',
  requireAuth,
  requirePermission('incident:create'),
  body('title').isString().withMessage('title is required'),
  body('severity').optional().isString(),
  body('status').optional().isString(),
  validate,
  controller.create
);
router.patch(
  '/:id',
  requireAuth,
  requirePermission('incident:update'),
  body('title').optional().isString(),
  body('status').optional().isString(),
  validate,
  controller.update
);
router.delete('/:id', requireAuth, requirePermission('incident:delete'), controller.remove);

router.get('/:id/actions', requireAuth, requirePermission('incident:read'), controller.listActions);
router.post(
  '/:id/actions',
  requireAuth,
  requirePermission('incident:create'),
  body('action').isString().withMessage('action is required'),
  body('status').optional().isString(),
  validate,
  controller.addAction
);
router.patch(
  '/:id/actions/:aid',
  requireAuth,
  requirePermission('incident:update'),
  body('status').optional().isString(),
  validate,
  controller.updateAction
);
router.delete('/:id/actions/:aid', requireAuth, requirePermission('incident:delete'), controller.removeAction);

module.exports = router;
