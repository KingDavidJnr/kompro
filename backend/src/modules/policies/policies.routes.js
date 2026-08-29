/**
 * Policy management routes.
 *
 * All routes require authentication and a policies:* permission. Creation and
 * updates enforce field validation, including the allowed status values.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./policies.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const { POLICY_STATUSES } = require('./policies.service');

// Read access requires policies:read.
router.get('/', requireAuth, requirePermission('policies:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('policies:read'), controller.get);

// Creation requires policies:create.
router.post(
  '/',
  requireAuth,
  requirePermission('policies:create'),
  body('title').isString().withMessage('Policy title is required'),
  body('description').optional().isString(),
  body('content').optional().isString(),
  body('status').optional().isIn(POLICY_STATUSES).withMessage(`Status must be one of: ${POLICY_STATUSES.join(', ')}`),
  body('owner').optional().isString(),
  validate,
  controller.create
);

// Updates require policies:update.
router.patch(
  '/:id',
  requireAuth,
  requirePermission('policies:update'),
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('content').optional().isString(),
  body('status').optional().isIn(POLICY_STATUSES).withMessage(`Status must be one of: ${POLICY_STATUSES.join(', ')}`),
  body('owner').optional().isString(),
  validate,
  controller.update
);

// Deletion requires policies:delete.
router.delete('/:id', requireAuth, requirePermission('policies:delete'), controller.remove);

// Policy lifecycle sub-resources (versions, change requests, reviews, exceptions).
// All reuse the existing policies:* permissions for consistency.
router.get('/:id/versions', requireAuth, requirePermission('policies:read'), controller.listVersions);
router.post('/:id/versions', requireAuth, requirePermission('policies:create'), controller.createVersion);

router.get('/:id/change-requests', requireAuth, requirePermission('policies:read'), controller.listChangeRequests);
router.post('/:id/change-requests', requireAuth, requirePermission('policies:create'), controller.createChangeRequest);
router.patch('/:id/change-requests/:crid', requireAuth, requirePermission('policies:update'), controller.updateChangeRequest);

router.get('/:id/reviews', requireAuth, requirePermission('policies:read'), controller.listReviews);
router.post('/:id/reviews', requireAuth, requirePermission('policies:create'), controller.createReview);
router.patch('/:id/reviews/:rid', requireAuth, requirePermission('policies:update'), controller.updateReview);

router.get('/:id/exceptions', requireAuth, requirePermission('policies:read'), controller.listExceptions);
router.post('/:id/exceptions', requireAuth, requirePermission('policies:create'), controller.createException);
router.patch('/:id/exceptions/:eid', requireAuth, requirePermission('policies:update'), controller.updateException);

module.exports = router;
