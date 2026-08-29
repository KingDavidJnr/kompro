/**
 * Evidence collector routes.
 *
 * All routes require authentication and the `evidence:collect` permission. The
 * SQL collector needs no secrets; future connectors store credentials encrypted
 * in the CollectorConfig row (see src/lib/crypto).
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./collectors.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

// List configured collectors and their last-run status.
router.get('/', requireAuth, requirePermission('evidence:collect'), controller.list);

// Configure a new collector (admin only).
router.post(
  '/',
  requireAuth,
  requirePermission('evidence:collect'),
  body('name').isString().withMessage('name is required'),
  body('type').isString().withMessage('type is required'),
  body('description').optional().isString(),
  body('enabled').optional().isBoolean(),
  body('cadenceMinutes').optional().isInt({ min: 1 }).withMessage('cadenceMinutes must be a positive integer'),
  body('params').optional().isObject(),
  body('secrets').optional().isObject(),
  validate,
  controller.create
);

// Trigger an immediate run of a collector.
router.post('/:id/run', requireAuth, requirePermission('evidence:collect'), controller.runNow);

// Retrieve a collector's run history (derived from the audit log).
router.get('/:id/runs', requireAuth, requirePermission('evidence:collect'), controller.getRuns);

module.exports = router;
