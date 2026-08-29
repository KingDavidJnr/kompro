/**
 * Risk management routes. Main risk CRUD plus nested scenarios, KRIs and
 * treatments. Each route requires the matching risk:* permission.
 */

const router = require('express').Router();
const controller = require('./risk.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

router.get('/', requireAuth, requirePermission('risk:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('risk:read'), controller.get);
router.post(
  '/',
  requireAuth,
  requirePermission('risk:create'),
  body('title').isString().withMessage('title is required'),
  body('likelihood').optional().isInt({ min: 1, max: 5 }),
  body('impact').optional().isInt({ min: 1, max: 5 }),
  body('category').optional().isString(),
  body('status').optional().isString(),
  validate,
  controller.create
);
router.patch(
  '/:id',
  requireAuth,
  requirePermission('risk:update'),
  body('title').optional().isString(),
  body('likelihood').optional().isInt({ min: 1, max: 5 }),
  body('impact').optional().isInt({ min: 1, max: 5 }),
  validate,
  controller.update
);
router.delete('/:id', requireAuth, requirePermission('risk:delete'), controller.remove);

// Risk scenarios
router.get('/:id/scenarios', requireAuth, requirePermission('risk:read'), controller.listScenarios);
router.post(
  '/:id/scenarios',
  requireAuth,
  requirePermission('risk:create'),
  body('title').isString().withMessage('title is required'),
  validate,
  controller.addScenario
);
router.delete('/:id/scenarios/:sid', requireAuth, requirePermission('risk:delete'), controller.removeScenario);

// KRIs
router.get('/:id/kris', requireAuth, requirePermission('risk:read'), controller.listKris);
router.post(
  '/:id/kris',
  requireAuth,
  requirePermission('risk:create'),
  body('title').isString().withMessage('title is required'),
  body('threshold').optional().isNumeric(),
  body('currentValue').optional().isNumeric(),
  validate,
  controller.addKri
);
router.patch(
  '/:id/kris/:kid',
  requireAuth,
  requirePermission('risk:update'),
  body('threshold').optional().isNumeric(),
  body('currentValue').optional().isNumeric(),
  validate,
  controller.updateKri
);
router.delete('/:id/kris/:kid', requireAuth, requirePermission('risk:delete'), controller.removeKri);

// Treatments
router.get('/:id/treatments', requireAuth, requirePermission('risk:read'), controller.listTreatments);
router.post(
  '/:id/treatments',
  requireAuth,
  requirePermission('risk:create'),
  body('title').isString().withMessage('title is required'),
  body('status').optional().isString(),
  validate,
  controller.addTreatment
);
router.patch(
  '/:id/treatments/:tid',
  requireAuth,
  requirePermission('risk:update'),
  body('status').optional().isString(),
  validate,
  controller.updateTreatment
);
router.delete('/:id/treatments/:tid', requireAuth, requirePermission('risk:delete'), controller.removeTreatment);

module.exports = router;
