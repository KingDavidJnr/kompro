/**
 * Evidence management routes.
 *
 * All routes require authentication and an evidence:* permission. Creation and
 * updates enforce field validation and confirm any linked control or policy
 * exists.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./evidence.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { EVIDENCE_SOURCES } = require('./evidence.service');

// Read access requires evidence:read.
router.get('/', requireAuth, requirePermission('evidence:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('evidence:read'), controller.get);

// Creation requires evidence:create.
router.post(
  '/',
  requireAuth,
  requirePermission('evidence:create'),
  body('title').isString().withMessage('Evidence title is required'),
  body('description').optional().isString(),
  body('source').optional().isIn(EVIDENCE_SOURCES).withMessage(`Source must be one of: ${EVIDENCE_SOURCES.join(', ')}`),
  body('content').optional().isString(),
  body('filePath').optional().isString(),
  body('controlId').optional().isString(),
  body('policyId').optional().isString(),
  body('collectedAt').optional().isISO8601().withMessage('collectedAt must be a valid date'),
  validate,
  controller.create
);

// Updates require evidence:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('evidence:update'),
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('source').optional().isIn(EVIDENCE_SOURCES).withMessage(`Source must be one of: ${EVIDENCE_SOURCES.join(', ')}`),
  body('content').optional().isString(),
  body('filePath').optional().isString(),
  body('controlId').optional({ nullable: true }).isString().withMessage('controlId must be a string'),
  body('policyId').optional({ nullable: true }).isString().withMessage('policyId must be a string'),
  body('collectedAt').optional().isISO8601().withMessage('collectedAt must be a valid date'),
  validate,
  controller.update
);

// Deletion requires evidence:delete.
router.delete('/:id', requireAuth, requirePermission('evidence:delete'), controller.remove);

module.exports = router;
