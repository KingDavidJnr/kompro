/**
 * Audit program routes: plans, nested nonconformities and their corrective
 * actions.
 */

const router = require('express').Router();
const controller = require('./audit-program.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

router.get('/', requireAuth, requirePermission('auditplan:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('auditplan:read'), controller.get);
router.post(
  '/',
  requireAuth,
  requirePermission('auditplan:create'),
  body('title').isString().withMessage('title is required'),
  validate,
  controller.create
);
router.patch('/:id', requireAuth, requirePermission('auditplan:update'), controller.update);
router.delete('/:id', requireAuth, requirePermission('auditplan:delete'), controller.remove);

router.post(
  '/:id/nonconformities',
  requireAuth,
  requirePermission('auditplan:create'),
  body('description').isString().withMessage('description is required'),
  validate,
  controller.addNonconformity
);
router.patch('/:id/nonconformities/:nid', requireAuth, requirePermission('auditplan:update'), controller.updateNonconformity);
router.delete('/:id/nonconformities/:nid', requireAuth, requirePermission('auditplan:delete'), controller.removeNonconformity);

router.post(
  '/:id/nonconformities/:nid/corrective-actions',
  requireAuth,
  requirePermission('auditplan:create'),
  body('description').isString().withMessage('description is required'),
  validate,
  controller.addCorrectiveAction
);
router.patch('/:id/nonconformities/:nid/corrective-actions/:cid', requireAuth, requirePermission('auditplan:update'), controller.updateCorrectiveAction);
router.delete('/:id/nonconformities/:nid/corrective-actions/:cid', requireAuth, requirePermission('auditplan:delete'), controller.removeCorrectiveAction);

module.exports = router;
