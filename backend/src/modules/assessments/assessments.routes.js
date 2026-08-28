/**
 * Assessment routes.
 *
 * All routes require authentication and an assessments:* permission. Creation
 * and updates enforce the allowed result values and confirm linked control
 * and evidence records exist.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./assessments.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { ASSESSMENT_RESULTS } = require('./assessments.service');

// Read access requires assessments:read.
router.get('/', requireAuth, requirePermission('assessments:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('assessments:read'), controller.get);

// Creation requires assessments:create.
router.post(
  '/',
  requireAuth,
  requirePermission('assessments:create'),
  body('controlId').isString().withMessage('controlId is required'),
  body('result').isIn(ASSESSMENT_RESULTS).withMessage(`Result must be one of: ${ASSESSMENT_RESULTS.join(', ')}`),
  body('notes').optional().isString(),
  body('evidenceIds').optional().isArray().withMessage('evidenceIds must be an array'),
  body('assessmentDate').optional().isISO8601().withMessage('assessmentDate must be a valid date'),
  validate,
  controller.create
);

// Updates require assessments:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('assessments:update'),
  body('result').optional().isIn(ASSESSMENT_RESULTS).withMessage(`Result must be one of: ${ASSESSMENT_RESULTS.join(', ')}`),
  body('notes').optional().isString(),
  body('evidenceIds').optional().isArray().withMessage('evidenceIds must be an array'),
  body('assessmentDate').optional().isISO8601().withMessage('assessmentDate must be a valid date'),
  validate,
  controller.update
);

// Deletion requires assessments:delete.
router.delete('/:id', requireAuth, requirePermission('assessments:delete'), controller.remove);

module.exports = router;
