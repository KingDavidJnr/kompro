const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./assessments.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { ASSESSMENT_RESULTS, ASSESSMENT_STATUSES } = require('./assessments.service');

router.get('/', requireAuth, requirePermission('assessments:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('assessments:read'), controller.get);

// Returns the controls mapped to a requirement -- used to populate the control picker.
router.get('/requirement/:requirementId/controls', requireAuth, requirePermission('assessments:read'), controller.controlsForRequirement);

// Schedule a new assessment (Phase 1 -- no result yet).
router.post(
  '/',
  requireAuth,
  requirePermission('assessments:create'),
  body('controlId').isString().withMessage('controlId is required'),
  body('frameworkId').optional().isString(),
  body('requirementId').optional().isString(),
  body('assessorId').optional().isString(),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
  validate,
  controller.create
);

// Update: record result / complete / change assessor / add evidence (Phase 2 & 3).
router.patch(
  '/:id',
  requireAuth,
  requirePermission('assessments:update'),
  body('status').optional().isIn(ASSESSMENT_STATUSES),
  body('result').optional().isIn(ASSESSMENT_RESULTS).withMessage(`Result must be one of: ${ASSESSMENT_RESULTS.join(', ')}`),
  body('notes').optional().isString(),
  body('evidenceIds').optional().isArray(),
  body('assessmentDate').optional().isISO8601(),
  body('assessorId').optional().isString(),
  body('dueDate').optional().isISO8601(),
  validate,
  controller.update
);

router.delete('/:id', requireAuth, requirePermission('assessments:delete'), controller.remove);

module.exports = router;
