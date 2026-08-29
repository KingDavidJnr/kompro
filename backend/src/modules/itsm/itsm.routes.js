/**
 * ITSM routes: assets, changes and capacity plans.
 */

const router = require('express').Router();
const controller = require('./itsm.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

// Assets
router.get('/assets', requireAuth, requirePermission('itsm:read'), controller.listAssets);
router.get('/assets/:id', requireAuth, requirePermission('itsm:read'), controller.getAsset);
router.post(
  '/assets',
  requireAuth,
  requirePermission('itsm:create'),
  body('name').isString().withMessage('name is required'),
  validate,
  controller.createAsset
);
router.patch('/assets/:id', requireAuth, requirePermission('itsm:update'), controller.updateAsset);
router.delete('/assets/:id', requireAuth, requirePermission('itsm:delete'), controller.deleteAsset);

// Changes
router.get('/changes', requireAuth, requirePermission('itsm:read'), controller.listChanges);
router.post(
  '/changes',
  requireAuth,
  requirePermission('itsm:create'),
  body('title').isString().withMessage('title is required'),
  validate,
  controller.createChange
);
router.patch('/changes/:id', requireAuth, requirePermission('itsm:update'), controller.updateChange);
router.delete('/changes/:id', requireAuth, requirePermission('itsm:delete'), controller.deleteChange);

// Capacity plans
router.get('/capacity', requireAuth, requirePermission('itsm:read'), controller.listCapacityPlans);
router.post(
  '/capacity',
  requireAuth,
  requirePermission('itsm:create'),
  body('resource').isString().withMessage('resource is required'),
  validate,
  controller.createCapacityPlan
);
router.patch('/capacity/:id', requireAuth, requirePermission('itsm:update'), controller.updateCapacityPlan);
router.delete('/capacity/:id', requireAuth, requirePermission('itsm:delete'), controller.deleteCapacityPlan);

module.exports = router;
